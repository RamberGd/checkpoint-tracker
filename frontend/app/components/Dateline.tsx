"use client";

import { useState, useEffect } from "react";
import styles from "./Dateline.module.css";

const WORDS = ["games", "culture", "memory"];
const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

function toRoman(num: number): string {
  const map: [number, string][] = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let out = "";
  for (const [value, sym] of map) {
    while (num >= value) { out += sym; num -= value; }
  }
  return out;
}

/**
 * A live masthead "dateline": real current date + issue number, with a coverage
 * word that gently cycles. The live data and motion read unmistakably as a
 * DISPLAY (a ticking colophon), not a row of clickable nav links — which is the
 * whole point. Decorative, so aria-hidden.
 */
export default function Dateline() {
  // Computed on the client to avoid SSR/timezone hydration mismatch; until then
  // we render the static year so the masthead never flashes empty.
  const [date, setDate] = useState<string | null>(null);
  const [wordIdx, setWordIdx] = useState(0);
  const [cycling, setCycling] = useState(false);

  useEffect(() => {
    const d = new Date();
    setDate(`${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${toRoman(d.getFullYear())}`);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setCycling(true);
    const id = setInterval(() => setWordIdx((i) => (i + 1) % WORDS.length), 3200);
    return () => clearInterval(id);
  }, []);

  return (
    <span className={styles.dateline} aria-hidden="true">
      <span className={styles.meta}>Nº 001</span>
      <span className={styles.sep}>·</span>
      <span className={styles.meta}>{date ?? `MMXXVI`}</span>
      <span className={styles.sep}>·</span>
      <span className={styles.tagline}>
        a journal of{" "}
        {cycling ? (
          <span key={wordIdx} className={styles.word}>{WORDS[wordIdx]}</span>
        ) : (
          <span className={styles.word}>games, culture &amp; memory</span>
        )}
        <span className={styles.caret} aria-hidden="true" />
      </span>
    </span>
  );
}
