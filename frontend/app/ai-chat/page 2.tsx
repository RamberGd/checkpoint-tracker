"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Navbar from "../components/Navbar";
import styles from "./ai-chat.module.css";

type Phase = "idle" | "thinking" | "responding" | "done" | "error";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Exchange {
  query: string;
  response: string;
}

const MOCK_RESPONSES: Record<string, string> = {
  "disco elysium":
    "Disco Elysium is one of the few games that treats failure as narrative. The detective's collapse is the story — not a setback to overcome, but the subject itself. Every failed skill check is a sentence in the autobiography of a man undone. Nothing else plays like it because nothing else has been this honest about what a role-playing game can say.",
  "hollow knight":
    "Hollow Knight earns its silence. The kingdom of Hallownest speaks through its architecture — a civilisation that held something sacred and lost it anyway. What makes it extraordinary isn't the difficulty but the scale of a world that exists entirely on its own terms, indifferent to whether you ever understand it.",
  recommend:
    "The most useful question CheckPoint can answer isn't 'what's good' — it's 'what fits where you are right now'. A game that's right after a long run of shooters is different from one that's right at 11pm on a Tuesday. Tell me what you've just finished, and I'll think with you.",
  "elden ring":
    "Elden Ring is a Miyazaki game that learned to share. The open world isn't decoration — it's argument: that discovery should be self-directed, that a boss you encounter early and return to later hits differently. The design philosophy is unchanged from Demon's Souls; only the generosity has expanded.",
  __fallback__:
    "CheckPoint is a journal, not a ranking system. The questions worth asking here aren't 'what scores highest' — they're about what a game meant, what it demanded, and whether it's worth your particular kind of attention. Ask me anything specific.",
};

function getMockResponse(query: string): string {
  const q = query.toLowerCase();
  if (q.includes("disco elysium")) return MOCK_RESPONSES["disco elysium"];
  if (q.includes("hollow knight")) return MOCK_RESPONSES["hollow knight"];
  if (q.includes("elden ring")) return MOCK_RESPONSES["elden ring"];
  if (
    q.includes("recommend") ||
    q.includes("what should i play") ||
    q.includes("suggest")
  )
    return MOCK_RESPONSES["recommend"];
  return MOCK_RESPONSES["__fallback__"];
}

function simulateStream(
  text: string,
  onChunk: (chunk: string) => void,
  onDone: () => void
): () => void {
  const CHUNK_SIZE = 4;
  const INTERVAL_MS = 25;
  let i = 0;
  const id = setInterval(() => {
    if (i >= text.length) {
      clearInterval(id);
      onDone();
      return;
    }
    onChunk(text.slice(i, i + CHUNK_SIZE));
    i += CHUNK_SIZE;
  }, INTERVAL_MS);
  return () => clearInterval(id);
}

export default function AiChatPage() {
  const [, setMessages] = useState<Message[]>([]);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [navDir, setNavDir] = useState<"back" | "forward" | null>(null);
  const [currentResponse, setCurrentResponse] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [inputValue, setInputValue] = useState("");
  const cancelStreamRef = useRef<(() => void) | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const touchStartYRef = useRef(0);

  // frameIndex === exchanges.length means we're on the live (current) frame
  const isLive = frameIndex === exchanges.length;

  const navigate = useCallback(
    (dir: "back" | "forward") => {
      if (dir === "back" && frameIndex === 0) return;
      if (dir === "forward" && frameIndex === exchanges.length) return;
      setNavDir(dir);
      setFrameIndex((prev) => (dir === "back" ? prev - 1 : prev + 1));
    },
    [frameIndex, exchanges.length]
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

  // cleanup stream on unmount
  useEffect(() => {
    return () => { cancelStreamRef.current?.(); };
  }, []);

  const handleSubmit = useCallback(() => {
    const query = inputValue.trim();
    if (!query || phase === "thinking" || phase === "responding") return;

    const mockResponse = getMockResponse(query);

    // snap to live frame (no animation), then enter thinking phase
    setNavDir(null);
    setFrameIndex(exchanges.length);
    setPhase("thinking");
    setUserQuery(query);
    setInputValue("");
    setMessages((prev) => [...prev, { role: "user", content: query }]);

    setTimeout(() => {
      setCurrentResponse("");
      setPhase("responding");
      cancelStreamRef.current = simulateStream(
        mockResponse,
        (chunk) => setCurrentResponse((prev) => prev + chunk),
        () => {
          setPhase("done");
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: mockResponse },
          ]);
          // archive completed exchange and advance frameIndex to new live frame
          setExchanges((prev) => [...prev, { query, response: mockResponse }]);
          setFrameIndex((prev) => prev + 1);
          cancelStreamRef.current = null;
        }
      );
    }, 160);
  }, [inputValue, phase, exchanges.length]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // typing while on a past frame snaps silently to present
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
    touchStartYRef.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = touchStartYRef.current - e.changedTouches[0].clientY;
    if (delta > 40) navigate("back");
    else if (delta < -40) navigate("forward");
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
    <div className={styles.page}>
      <Navbar />

      {/* ── Oracle zone ── */}
      <main
        className={styles.oracle}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className={styles.oracleInner}>
          <div className={styles.oracleLabelRow}>
            <div className={labelClass}>CHECKPOINT/AI</div>
            {!isLive && exchanges.length > 0 && (
              <span className={styles.frameCounter}>
                {String(frameIndex + 1).padStart(2, "0")} /{" "}
                {String(exchanges.length).padStart(2, "0")}
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
                {(phase === "responding" || phase === "done") && (
                  <p
                    className={`${styles.responseText} ${
                      phase === "responding" ? styles.responseEnter : ""
                    }`}
                  >
                    {currentResponse}
                    {phase === "responding" && (
                      <span className={styles.streamCursor} aria-hidden="true" />
                    )}
                  </p>
                )}
                {phase === "error" && (
                  <p className={styles.errorText}>
                    Something went wrong. Try again.
                  </p>
                )}
              </>
            ) : (
              <>
                <p className={styles.thinkingQuery}>
                  {exchanges[frameIndex]?.query}
                </p>
                <p className={styles.responseText}>
                  {exchanges[frameIndex]?.response}
                </p>
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
      </div>
    </div>
  );
}
