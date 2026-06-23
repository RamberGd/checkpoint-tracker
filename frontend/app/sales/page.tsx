"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import Navbar from "../components/Navbar";
import RequireAuth from "../components/RequireAuth";
import { api, type Deal } from "../lib/api";
import styles from "./sales.module.css";

export default function SalesPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [scanKey, setScanKey] = useState(0);
  const [spinning, setSpinning] = useState(false);

  // Each call to /api/sales returns a fresh random selection of discounted
  // popular games (the backend reshuffles server-side), so "Scan Again" simply
  // re-fetches rather than reshuffling a hardcoded pool.
  const load = useCallback(async () => {
    try {
      const data = await api.sales();
      setDeals(data);
      setScanKey((k) => k + 1);
    } catch (err) {
      console.error("Failed to load deals", err);
      setDeals([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(async () => {
    if (spinning) return;
    setSpinning(true);
    await load();
    setSpinning(false);
  }, [spinning, load]);

  return (
    <RequireAuth>
    <div className={styles.page}>
      <Navbar />

      <div className={styles.backdrop} aria-hidden="true">
        <Image
          src="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1920&q=80"
          alt=""
          fill
          className={styles.backdropImg}
          priority
        />
        <div className={styles.backdropOverlay} />
      </div>

      <div className={styles.board}>
        {/* Header */}
        <div className={styles.boardTop}>
          <span className={styles.boardTitle}>What&apos;s on Sale</span>
          <button
            className={`${styles.scanBtn}${spinning ? ` ${styles.scanBtnActive}` : ""}`}
            onClick={refresh}
            aria-label="Refresh deals"
          >
            — Scan Again
          </button>
        </div>

        {/* Column headers */}
        <div className={styles.colRow} role="row" aria-label="Column headers">
          <span className={styles.colCell}>#</span>
          <span className={styles.colCell}>Title</span>
          <span className={styles.colCell}>Store</span>
          <span className={`${styles.colCell} ${styles.colRight}`}>Disc.</span>
          <span className={`${styles.colCell} ${styles.colRight}`}>Price</span>
        </div>

        {/* Deal rows */}
        <div
          key={scanKey}
          className={styles.dealList}
          role="list"
          aria-label="Games on sale"
        >
          {deals.map((deal, i) => (
            <a
              key={deal.id}
              className={styles.dealRow}
              href={deal.url || undefined}
              target="_blank"
              rel="noopener noreferrer"
              role="listitem"
              aria-label={`${deal.title} — ${deal.discount}% off on ${deal.store}`}
              style={{ "--i": i } as React.CSSProperties}
            >
              <span className={styles.cellIndex}>
                {String(i + 1).padStart(3, "0")}
              </span>
              <span className={styles.cellTitle}>{deal.title}</span>
              <span className={styles.cellStore}>{deal.store}</span>
              <span className={styles.cellDiscount}>−{deal.discount}%</span>
              <span className={styles.cellPrice}>
                ${deal.salePrice.toFixed(2)}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
    </RequireAuth>
  );
}
