"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearch } from "../contexts/search";
import { api, type SearchResult } from "../lib/api";
import styles from "./SearchOverlay.module.css";

const PAGE_SIZE = 10;
const IGDB_BATCH = 30;

export default function SearchOverlay() {
  const { isOpen, closeSearch } = useSearch();
  const [query, setQuery] = useState("");
  const [allResults, setAllResults] = useState<SearchResult[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [igdbOffset, setIgdbOffset] = useState(IGDB_BATCH);
  const [igdbExhausted, setIgdbExhausted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Mirror mutable state into a ref so the IntersectionObserver callback can
  // read current values without capturing stale closures.
  const snap = useRef({ allResults, visibleCount, igdbOffset, igdbExhausted, isFetchingMore, query });
  snap.current = { allResults, visibleCount, igdbOffset, igdbExhausted, isFetchingMore, query };

  const router = useRouter();
  const visibleResults = allResults.slice(0, visibleCount);
  const hasMore = visibleCount < allResults.length || !igdbExhausted;

  function resetPagination() {
    setAllResults([]);
    setVisibleCount(PAGE_SIZE);
    setIgdbOffset(IGDB_BATCH);
    setIgdbExhausted(false);
    setIsFetchingMore(false);
  }

  // Debounced initial search.
  useEffect(() => {
    const q = query.trim();
    if (q.length === 0) {
      resetPagination();
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    const handle = setTimeout(() => {
      api.search(q, 0).then((r) => {
        if (cancelled) return;
        setAllResults(r);
        setVisibleCount(PAGE_SIZE);
        setIgdbOffset(IGDB_BATCH);
        setIgdbExhausted(r.length < IGDB_BATCH);
        setActiveIndex(-1);
        setIsLoading(false);
      }).catch(() => {
        if (cancelled) return;
        setAllResults([]);
        setIsLoading(false);
      });
    }, 250);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  // IntersectionObserver — reads state from ref to avoid stale closures.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      const s = snap.current;
      const q = s.query.trim();
      if (!q) return;

      if (s.visibleCount < s.allResults.length) {
        // More already loaded locally — just reveal the next slice.
        setVisibleCount((v) => Math.min(v + PAGE_SIZE, s.allResults.length));
        return;
      }

      if (s.igdbExhausted || s.isFetchingMore) return;

      // Caught up to loaded batch — fetch next IGDB page.
      setIsFetchingMore(true);
      api.search(q, s.igdbOffset).then((page) => {
        setAllResults((prev) => {
          const seen = new Set(prev.map((r) => r.id));
          return [...prev, ...page.filter((r) => !seen.has(r.id))];
        });
        setVisibleCount((v) => v + PAGE_SIZE);
        setIgdbOffset(s.igdbOffset + IGDB_BATCH);
        setIgdbExhausted(page.length < IGDB_BATCH);
        setIsFetchingMore(false);
      }).catch(() => {
        setIgdbExhausted(true);
        setIsFetchingMore(false);
      });
    }, { threshold: 0.1 });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, allResults.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Focus input on open; reset on close.
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    } else {
      setQuery("");
      resetPagination();
      setActiveIndex(-1);
      setIsLoading(false);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // inert + body scroll lock
  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    if (isOpen) {
      el.removeAttribute("inert");
      document.body.style.overflow = "hidden";
    } else {
      el.setAttribute("inert", "");
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      closeSearch();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, visibleResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIndex >= 0 && visibleResults[activeIndex]) {
      router.push(`/game/${visibleResults[activeIndex].id}`);
      closeSearch();
    }
  }

  return (
    <div
      ref={overlayRef}
      className={styles.overlay}
      data-open={isOpen.toString()}
      role="dialog"
      aria-modal="true"
      aria-label="Search games"
    >
      <div className={styles.backdrop} onClick={closeSearch} aria-hidden="true" />

      <div className={styles.panel} role="search">
        <div className={styles.header}>
          <span className={styles.headerLabel}>SEARCH</span>
          <span className={styles.headerRule} aria-hidden="true" />
        </div>

        <div className={styles.inputWrap}>
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(-1); }}
            onKeyDown={handleKeyDown}
            placeholder="A title, a genre, a feeling…"
            aria-label="Search games"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {visibleResults.length > 0 && (
          <div>
            <div className={styles.resultsMeta}>
              <span className={styles.resultsLabel}>
                {visibleResults.length}&nbsp;RESULT{visibleResults.length !== 1 ? "S" : ""}
                {!igdbExhausted ? "+" : ""}
              </span>
              <span className={styles.resultsRule} aria-hidden="true" />
            </div>
            <ul className={styles.resultList}>
              {visibleResults.map((game, i) => (
                <li
                  key={game.id}
                  className={styles.resultItem}
                  style={{ "--i": i % PAGE_SIZE } as CSSProperties}
                  data-active={(i === activeIndex).toString()}
                >
                  <Link href={`/game/${game.id}`} onClick={closeSearch} className={styles.resultLink}>
                    {game.cover ? (
                      <Image
                        src={game.cover}
                        alt=""
                        width={44}
                        height={62}
                        className={styles.cover}
                        aria-hidden="true"
                        unoptimized
                      />
                    ) : (
                      <span className={styles.cover} aria-hidden="true" />
                    )}
                    <span className={styles.resultTitle}>{game.title}</span>
                    <span className={styles.resultMeta}>
                      {game.year ?? "—"}
                      {game.genre ? <>&nbsp;·&nbsp;{game.genre.toUpperCase()}</> : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {hasMore && (
              <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true">
                {isFetchingMore && <span className={styles.loadingMore}>Loading…</span>}
              </div>
            )}
          </div>
        )}

        {isLoading && query.trim().length > 0 && (
          <div className={styles.empty}>
            <span className={styles.emptyText}>Searching…</span>
          </div>
        )}

        {!isLoading && query.trim().length > 0 && allResults.length === 0 && (
          <div className={styles.empty}>
            <span className={styles.emptyText}>
              No records found for &ldquo;{query}&rdquo;
            </span>
          </div>
        )}
      </div>

      <div className={styles.escHint} aria-hidden="true">[ ESC ]</div>
    </div>
  );
}
