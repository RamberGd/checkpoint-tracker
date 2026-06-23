"use client";

import { useEffect, useRef } from "react";

type FocusedField = "username" | "email" | "password" | "confirm" | null;

interface Props {
  focusedField: FocusedField;
  glowY: number | null;
}

const COLORS: Record<string, string> = {
  username: "oklch(0.52 0.155 328 / 0.50)",
  email:    "oklch(0.72 0.14  58  / 0.48)",
  password: "oklch(0.42 0.15  280 / 0.48)",
  confirm:  "oklch(0.42 0.15  280 / 0.48)",
};

// Single ellipse mask — one clean alpha sweep, no stacking rings
const MASK = "radial-gradient(ellipse 58% 44% at 0% 50%, black 0%, transparent 100%)";

export default function SignupLamp({ focusedField, glowY }: Props) {
  const flickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pageEl = document.querySelector("[data-signup-lamp]") as HTMLElement | null;
    const spotEl = flickerRef.current;
    if (!pageEl || !spotEl) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      pageEl.style.setProperty("--flicker", "0.92");
      spotEl.style.opacity = "0.92";
      return;
    }

    let timer: ReturnType<typeof setTimeout>;

    function step() {
      const r = Math.random();
      let v: number, d: number;
      if (r < 0.58)       { v = 0.88 + Math.random() * 0.12; d = 450 + Math.random() * 950; }
      else if (r < 0.78)  { v = 0.70 + Math.random() * 0.22; d = 110 + Math.random() * 230; }
      else if (r < 0.92)  { v = 0.32 + Math.random() * 0.38; d = 45  + Math.random() * 95;  }
      else                 { v = 0.05 + Math.random() * 0.12; d = 35  + Math.random() * 60;  }

      pageEl!.style.setProperty("--flicker", v.toFixed(3));
      if (spotEl) spotEl.style.opacity = v.toFixed(3);

      timer = setTimeout(step, d);
    }

    pageEl.style.setProperty("--flicker", "0.60");
    spotEl.style.opacity = "0.60";
    timer = setTimeout(step, 200);
    return () => clearTimeout(timer);
  }, []);

  const color = COLORS[focusedField ?? "username"];
  const top = glowY ?? -400;

  return (
    <div
      ref={flickerRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        left: 0,
        top,
        transform: "translateY(-50%)",
        width: "42vw",
        height: "160px",
        pointerEvents: "none",
        zIndex: 2,
        opacity: 0.9,
        transition: "top 400ms cubic-bezier(0.25, 1, 0.5, 1)",
      }}
    >
      {/* Inner layer: fades in/out on focus change, holds the gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: focusedField !== null ? 1 : 0,
          transition: "opacity 620ms ease",
          background: color,
          WebkitMaskImage: MASK,
          maskImage: MASK,
        }}
      />
    </div>
  );
}
