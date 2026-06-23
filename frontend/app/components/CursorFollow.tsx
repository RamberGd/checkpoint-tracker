"use client";

import { useEffect, useRef } from "react";
import styles from "./CursorFollow.module.css";

const INTERACTIVE =
  'a, button, [role="button"], [role="link"], select, textarea, input, label[for], [tabindex]:not([tabindex="-1"])';

export default function CursorFollow() {
  const dotRef  = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const pos     = useRef({ x: -100, y: -100 });
  const ring    = useRef({ x: -100, y: -100 });
  const rafId   = useRef<number>(0);
  const visible = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const dot   = dotRef.current;
    const ringEl = ringRef.current;
    if (!dot || !ringEl) return;

    const onMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      if (!visible.current) {
        ring.current  = { x: e.clientX, y: e.clientY };
        visible.current = true;
        dot.classList.add(styles.visible);
        ringEl.classList.add(styles.visible);
      }
    };

    const onLeave = () => {
      visible.current = false;
      dot.classList.remove(styles.visible);
      ringEl.classList.remove(styles.visible);
    };

    const onOver = (e: MouseEvent) => {
      const hit = (e.target as Element).closest(INTERACTIVE);
      dot.classList.toggle(styles.hover, !!hit);
      ringEl.classList.toggle(styles.hover, !!hit);
    };

    const onDown = (e: MouseEvent) => {
      const hit = (e.target as Element).closest(INTERACTIVE);
      if (hit) {
        dot.classList.add(styles.press);
        ringEl.classList.add(styles.press);
      }
    };

    const onUp = () => {
      dot.classList.remove(styles.press);
      ringEl.classList.remove(styles.press);
    };

    const LERP = 0.10;

    const loop = () => {
      ring.current.x += (pos.current.x - ring.current.x) * LERP;
      ring.current.y += (pos.current.y - ring.current.y) * LERP;
      dot.style.transform   = `translate(${pos.current.x}px, ${pos.current.y}px)`;
      ringEl.style.transform = `translate(${ring.current.x}px, ${ring.current.y}px)`;
      rafId.current = requestAnimationFrame(loop);
    };

    const styleEl = document.createElement("style");
    styleEl.textContent = "*, *::before, *::after { cursor: none !important; }";
    document.head.appendChild(styleEl);

    document.addEventListener("mousemove",  onMove);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseover",  onOver);
    document.addEventListener("mousedown",  onDown);
    document.addEventListener("mouseup",    onUp);
    rafId.current = requestAnimationFrame(loop);

    return () => {
      document.removeEventListener("mousemove",  onMove);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseover",  onOver);
      document.removeEventListener("mousedown",  onDown);
      document.removeEventListener("mouseup",    onUp);
      cancelAnimationFrame(rafId.current);
      styleEl.remove();
    };
  }, []);

  return (
    <>
      <div ref={dotRef}  className={styles.dot}  aria-hidden="true" />
      <div ref={ringRef} className={styles.ring} aria-hidden="true" />
    </>
  );
}
