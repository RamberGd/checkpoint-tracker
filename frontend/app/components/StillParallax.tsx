"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import styles from "../page.module.css";
import Reveal from "./Reveal";

const RANGE = 160; // total px travel — image moves ±80px

export default function StillParallax() {
  const sectionRef = useRef<HTMLElement>(null);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const section = sectionRef.current;
    const img = imgRef.current;
    if (!section || !img) return;

    const onScroll = () => {
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 = section bottom at viewport bottom; 1 = section top at viewport top
      const progress = 1 - rect.bottom / (vh + rect.height);
      const clamped = Math.max(0, Math.min(1, progress));
      img.style.transform = `translateY(${(clamped - 0.5) * RANGE}px)`;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section ref={sectionRef} className={styles.still} aria-label="Editorial image">
      <div ref={imgRef} className={styles.stillParallaxImg}>
        <Image
          src="https://images.unsplash.com/photo-1777714221034-0d5152d676df?auto=format&fit=crop&w=1600&q=80"
          alt="A vintage television set glowing in a dark room — warm light against deep shadow"
          fill
          sizes="100vw"
          style={{ objectFit: "cover", objectPosition: "center 30%" }}
          priority={false}
        />
      </div>

      <Reveal delay={400}>
        <p className={styles.stillCaption}>
          Some games you carry longer than you played them.
        </p>
      </Reveal>
    </section>
  );
}
