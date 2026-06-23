"use client";

import { useEffect } from "react";
import styles from "../page.module.css";

/**
 * Drives the cover section's tungsten-style flicker (--flicker on [data-lamp])
 * and tracks mouse position within the panel to shift the lamp's perceived
 * origin (--lamp-x, --lamp-y), keeping it anchored in the bottom-right quadrant.
 */
export default function CoverLamp() {
  useEffect(() => {
    const cover = document.querySelector("[data-lamp]") as HTMLElement | null;
    if (!cover) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      cover.style.setProperty("--flicker", "0.92");
      return;
    }

    // ── Flicker timer ──
    let timer: ReturnType<typeof setTimeout>;

    function step() {
      const r = Math.random();
      let v: number;
      let d: number;

      if (r < 0.58) {
        v = 0.88 + Math.random() * 0.12;
        d = 450 + Math.random() * 950;
      } else if (r < 0.78) {
        v = 0.70 + Math.random() * 0.22;
        d = 110 + Math.random() * 230;
      } else if (r < 0.92) {
        v = 0.32 + Math.random() * 0.38;
        d = 45 + Math.random() * 95;
      } else {
        v = 0.05 + Math.random() * 0.12;
        d = 35 + Math.random() * 60;
      }

      cover!.style.setProperty("--flicker", v.toFixed(3));
      timer = setTimeout(step, d);
    }

    cover.style.setProperty("--flicker", "0.60");
    timer = setTimeout(step, 200);

    // ── Mouse drift — lamp origin shifts gently with cursor ──
    // Constrained to bottom-right: x [80–96%], y [93–103%].
    // lerp factor 0.07 keeps it sluggish enough to feel like a distant source.
    let rafId: number;
    let cx = 6, cy = 99;   // current interpolated position
    let tx = 6, ty = 99;   // target from mouse (or resting default)

    function tick() {
      cx += (tx - cx) * 0.07;
      cy += (ty - cy) * 0.07;
      cover!.style.setProperty("--lamp-x", `${cx.toFixed(2)}%`);
      cover!.style.setProperty("--lamp-y", `${cy.toFixed(2)}%`);
      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);

    function onMove(e: MouseEvent) {
      const rect = cover!.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;
      tx = 2 + nx * 16;
      ty = 93 + ny * 10;
    }

    function onLeave() {
      tx = 6;
      ty = 99;
    }

    cover.addEventListener("mousemove", onMove);
    cover.addEventListener("mouseleave", onLeave);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafId);
      cover.removeEventListener("mousemove", onMove);
      cover.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <>
      <div className={styles.lampGlow}    aria-hidden="true" />
      <div className={styles.lampFalloff} aria-hidden="true" />
    </>
  );
}
