"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const mdComponents: Components = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
};
import Navbar from "../components/Navbar";
import DustParticles from "../components/DustParticles";
import styles from "./ai-chat.module.css";
import RequireAuth from "../components/RequireAuth";

type Phase = "idle" | "thinking" | "responding" | "done" | "error";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Exchange {
  query: string;
  response: string;
}

export default function AiChatPage() {
  // Full conversation history sent to the backend each turn so the model has
  // context. The backend prepends its own system prompt and strips any
  // client-supplied system messages (prompt-injection guard).
  const [messages, setMessages] = useState<Message[]>([]);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [navDir, setNavDir] = useState<"back" | "forward" | null>(null);
  const [currentResponse, setCurrentResponse] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorText, setErrorText] = useState("");
  const [inputValue, setInputValue] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const touchStartXRef = useRef(0);
  const oracleRef = useRef<HTMLElement>(null);

  // frameIndex === exchanges.length means we're on the live (current) frame
  const isLive = frameIndex === exchanges.length;

  const navigate = useCallback(
    (dir: "back" | "forward") => {
      if (dir === "back" && frameIndex === 0) return;
      if (dir === "forward" && frameIndex === exchanges.length) return;
      if (dir === "forward" && phase === "done" && frameIndex === exchanges.length - 1) return;
      setNavDir(dir);
      setFrameIndex((prev) => (dir === "back" ? prev - 1 : prev + 1));
    },
    [frameIndex, exchanges.length, phase]
  );

  // keyboard navigation — skip when textarea is focused
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (document.activeElement === textareaRef.current) return;
      if (e.key === "ArrowUp") { e.preventDefault(); navigate("back"); }
      if (e.key === "ArrowDown") { e.preventDefault(); navigate("forward"); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate]);

  // auto-resize textarea to content
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [inputValue]);

  // focus the input on mount
  useEffect(() => { textareaRef.current?.focus(); }, []);

  // abort any in-flight stream on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  /**
   * POST the conversation to /api/chat and consume the Server-Sent Events the
   * Flask route streams back. Each event is `data: {"content": "..."}`, with a
   * terminal `data: [DONE]` and optional `data: {"error": "..."}`.
   */
  const streamReply = useCallback(
    async (history: Message[], query: string) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setCurrentResponse("");
      let full = "";
      let started = false;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          setPhase("error");
          setErrorText(
            res.status === 401
              ? "Please log in to use the assistant."
              : "The assistant is unavailable right now."
          );
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        // Read the SSE stream chunk by chunk, splitting on event boundaries.
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const events = buffer.split("\n\n");
          buffer = events.pop() ?? ""; // keep the trailing partial event
          for (const evt of events) {
            const line = evt.trim();
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const obj = JSON.parse(payload);
              if (obj.error) {
                setPhase("error");
                setErrorText(obj.error);
                return;
              }
              if (obj.content) {
                // First token: leave the "thinking" beat and start rendering.
                if (!started) {
                  started = true;
                  setPhase("responding");
                  oracleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }
                full += obj.content;
                setCurrentResponse((prev) => prev + obj.content);
              }
            } catch {
              // ignore unparseable keep-alive / partial packets
            }
          }
        }

        setPhase("done");
        setMessages((prev) => [...prev, { role: "assistant", content: full }]);
        setExchanges((prev) => [...prev, { query, response: full }]);
      } catch (err) {
        if (controller.signal.aborted) return; // navigated away / new query
        console.error("chat stream failed", err);
        setPhase("error");
        setErrorText("Network error. Please try again.");
      } finally {
        abortRef.current = null;
      }
    },
    []
  );

  const handleSubmit = useCallback(() => {
    const query = inputValue.trim();
    if (!query || phase === "thinking" || phase === "responding") return;

    // snap to live frame (no animation), then enter thinking phase
    setNavDir(null);
    setFrameIndex(exchanges.length);
    setPhase("thinking");
    setErrorText("");
    setUserQuery(query);
    setInputValue("");

    const history: Message[] = [...messages, { role: "user", content: query }];
    setMessages(history);
    streamReply(history, query);
  }, [inputValue, phase, exchanges.length, messages, streamReply]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!isLive) {
      setNavDir(null);
      setFrameIndex(exchanges.length);
    }
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = touchStartXRef.current - e.changedTouches[0].clientX;
    if (delta > 40) navigate("forward");
    else if (delta < -40) navigate("back");
  };

  const isInputDisabled = phase === "thinking" || phase === "responding";

  const labelClass = [
    styles.oracleLabel,
    isInputDisabled ? styles.oracleLabelPulse : "",
  ]
    .filter(Boolean)
    .join(" ");

  const contentClass = [
    styles.oracleContent,
    navDir === "back" ? styles.oracleEnterBack : "",
    navDir === "forward" ? styles.oracleEnterForward : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <RequireAuth>
    <div className={styles.page}>
      <DustParticles />
      <Navbar />

      {/* ── Oracle zone ── */}
      <main
        ref={oracleRef}
        className={styles.oracle}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Visually-hidden live region — announced by screen readers as the response streams in */}
        <div
          aria-live="polite"
          aria-atomic="false"
          style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 }}
        >
          {phase === "thinking" && userQuery}
          {(phase === "responding" || phase === "done") && currentResponse}
          {phase === "error" && (errorText || "Something went wrong.")}
        </div>
        <div className={styles.oracleInner}>
          <div className={styles.oracleLabelRow}>
            <div className={labelClass}>CHECKPOINT/AI</div>
            {exchanges.length > 0 && (
              <span className={styles.frameCounter}>
                {isLive
                  ? "—"
                  : `${String(frameIndex + 1).padStart(2, "0")} / ${String(exchanges.length).padStart(2, "0")}`}
              </span>
            )}
          </div>
          <div className={styles.oracleRule} aria-hidden="true" />

          <div key={frameIndex} className={contentClass}>
            {isLive ? (
              <>
                {phase === "idle" && (
                  <p className={styles.idlePrompt}>What do you want to know?</p>
                )}
                {phase === "thinking" && (
                  <p className={styles.thinkingQuery}>{userQuery}</p>
                )}
                {phase === "responding" && (
                  <p className={styles.responseText}>
                    {currentResponse}
                    <span className={styles.streamCursor} aria-hidden="true" />
                  </p>
                )}
                {phase === "done" && (
                  <div className={`${styles.responseText} ${styles.responseEnter}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                      {currentResponse}
                    </ReactMarkdown>
                  </div>
                )}
                {phase === "error" && (
                  <p className={styles.errorText}>
                    {errorText || "Something went wrong. Try again."}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className={styles.thinkingQuery}>
                  {exchanges[frameIndex]?.query}
                </p>
                <div className={styles.responseText}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                    {exchanges[frameIndex]?.response ?? ""}
                  </ReactMarkdown>
                </div>
              </>
            )}
          </div>

        </div>
      </main>

      {/* ── Film slate input ── */}
      <div className={styles.slate} role="region" aria-label="Query input">
        <div className={styles.slateHeader}>
          <span>OPEN QUERY</span>
          <span className={styles.slateReturn} aria-hidden="true">↵</span>
        </div>
        <div className={styles.slateRule} aria-hidden="true" />
        <div className={styles.slateInputRow}>
          <textarea
            ref={textareaRef}
            className={styles.slateInput}
            placeholder={isLive ? "Ask anything about games..." : "← back to present"}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={isInputDisabled}
            rows={1}
            aria-label="Your question"
          />
          {/* Mobile-only tappable send (desktop submits via Enter; button is
              display:none above 640px). preventDefault on pointerdown keeps the
              keyboard open instead of blurring the textarea. */}
          <button
            type="button"
            className={styles.sendBtn}
            onPointerDown={(e) => e.preventDefault()}
            onClick={handleSubmit}
            disabled={isInputDisabled || !inputValue.trim()}
            aria-label="Send message"
          >
            ↵
          </button>
        </div>
      </div>
    </div>
    </RequireAuth>
  );
}
