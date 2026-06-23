"use client";

import { useEffect, useRef, type ReactNode, type CSSProperties } from "react";

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: "default" | "image";
  style?: CSSProperties;
}

/**
 * Scroll-reveal wrapper.
 * SSR: renders fully visible (no data-reveal attr).
 * Client: hides then fades in when element enters viewport.
 */
export default function Reveal({
  children,
  className = "",
  delay = 0,
  variant = "default",
  style,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Mark hidden after hydration — content was already visible on SSR
    el.dataset.reveal = variant === "image" ? "hidden-img" : "hidden";

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setTimeout(() => {
          if (!ref.current) return;
          ref.current.dataset.reveal =
            variant === "image" ? "visible-img" : "visible";
        }, delay);
        observer.disconnect();
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, variant]);

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
