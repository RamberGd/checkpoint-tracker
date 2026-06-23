"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./LibraryToast.module.css";

export type ToastAction = "played" | "wishlist" | "favourites" | null;

interface LibraryToastProps {
  action: ToastAction;
  onDismiss: () => void;
}

const LABELS: Record<NonNullable<ToastAction>, string> = {
  played:     "MARKED AS PLAYED",
  wishlist:   "ADDED TO WISHLIST",
  favourites: "ADDED TO FAVOURITES",
};

const HREFS: Record<NonNullable<ToastAction>, string> = {
  played:     "/played",
  wishlist:   "/wishlist",
  favourites: "/favourites",
};

const DURATION = 4000;

export default function LibraryToast({ action, onDismiss }: LibraryToastProps) {
  const [visible, setVisible] = useState(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!action) return;

    // clear any running timers from a previous toast
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    if (exitTimer.current)    clearTimeout(exitTimer.current);

    setVisible(true);

    dismissTimer.current = setTimeout(() => {
      setVisible(false);
      exitTimer.current = setTimeout(onDismiss, 260); // wait for exit anim
    }, DURATION);

    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      if (exitTimer.current)    clearTimeout(exitTimer.current);
    };
  }, [action, onDismiss]);

  if (!action) return null;

  return (
    <div
      className={`${styles.toast} ${visible ? styles.toastVisible : styles.toastHidden}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className={styles.marker} aria-hidden="true">◆</span>
      <span className={styles.label}>{LABELS[action]}</span>
      <span className={styles.sep} aria-hidden="true">·</span>
      <Link href={HREFS[action]} className={styles.link}>
        View library&nbsp;→
      </Link>

      <div className={styles.fuse} aria-hidden="true">
        <span
          className={styles.fuseBar}
          style={{ animationDuration: `${DURATION}ms` }}
        />
      </div>
    </div>
  );
}
