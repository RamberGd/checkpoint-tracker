"use client";

import { useEffect, useRef } from "react";
import CoverLamp from "./CoverLamp";
import styles from "../page.module.css";

export default function HeroScroll() {
  const driverRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const p2HeadRef = useRef<HTMLParagraphElement>(null);
  const p2BodyRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let ctx: { revert: () => void } | undefined;

    (async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);

      ctx = gsap.context(() => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: driverRef.current,
            start: "top top",
            end: "bottom bottom",
            scrub: 1.2,
          },
        });

        tl.to(trackRef.current, { x: "-100vw", ease: "none", duration: 10 }, 0);

        tl.fromTo(
          p2HeadRef.current,
          { x: -50, opacity: 0 },
          { x: 0, opacity: 1, ease: "none", duration: 3.5 },
          6.0
        );

        tl.fromTo(
          p2BodyRef.current,
          { opacity: 0 },
          { opacity: 1, ease: "none", duration: 2.5 },
          7.0
        );
      });
    })();

    return () => ctx?.revert();
  }, []);

  return (
    <div ref={driverRef} className={styles.introDriver}>
      <div className={styles.introStage}>
        <div ref={trackRef} className={styles.introTrack}>

          {/* ── Panel A: Cover — no image, atmospheric dark only ── */}
          <section
            className={styles.introPanel}
            aria-label="Cover"
            data-lamp="cover"
          >
            <CoverLamp />

            <p className={`${styles.coverIssue} ${styles.introFadeIn}`}>
              Issue 001 — MMXXVI
            </p>

            <div className={styles.coverBottom}>
              <h1 className={`${styles.coverTitle} ${styles.introSlideIn}`}>
                Checkpoint
              </h1>
              <p
                className={`${styles.coverSubline} ${styles.introSlideIn} ${styles.introDelay300}`}
              >
                A journal for your games.
              </p>
              <div
                className={`${styles.coverRule} ${styles.introFadeIn} ${styles.introDelay500}`}
                aria-hidden="true"
              />
            </div>
          </section>

          {/* ── Panel B: Manifesto ── */}
          <section
            className={`${styles.introPanel} ${styles.introPanelB}`}
            aria-label="Manifesto"
          >
            {/*
              Spanning image: left: -43vw positions it 43vw to the left of
              Panel B's edge (= track position 57vw), so it bleeds into Panel A's
              territory. Panel B has overflow: visible so this paints through.
              At full Panel B scroll, right edge lands at 78vw in viewport.
            */}
            <div className={styles.panelBSpan} aria-hidden="true">
              <video
                src="/crt-glow.mp4"
                autoPlay
                loop
                muted
                playsInline
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center 30%",
                  filter: "grayscale(100%) contrast(1.08)",
                }}
              />
            </div>

            <div className={styles.introPanelBContent}>
              <p ref={p2HeadRef} className={styles.introBHead}>
                Everything<br />
                you&rsquo;ve played,<br />
                held.
              </p>
              <p ref={p2BodyRef} className={styles.introBBody}>
                Some games you finish. Some you abandon at chapter three.
                Some you carry for years — across platforms, across consoles,
                across different versions of yourself.
              </p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
