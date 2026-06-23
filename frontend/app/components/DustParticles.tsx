"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  drift: number;
}

const COUNT = 38;

export default function DustParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;
    let raf: number;

    canvas.width = w;
    canvas.height = h;

    // Approximate oklch(0.93 0.012 330) — very light lavender-white
    const R = 233, G = 228, B = 241;

    const particles: Particle[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      size: 0.4 + Math.random() * 1.4,
      speed: 0.08 + Math.random() * 0.28,
      opacity: 0.015 + Math.random() * 0.055,
      drift: (Math.random() - 0.5) * 0.10,
    }));

    function draw() {
      ctx!.clearRect(0, 0, w, h);

      for (const p of particles) {
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${R}, ${G}, ${B}, ${p.opacity})`;
        ctx!.fill();

        p.y -= p.speed;
        p.x += p.drift;

        if (p.y < -4) {
          p.y = h + 4;
          p.x = Math.random() * w;
        }
        if (p.x < -4) p.x = w + 4;
        if (p.x > w + 4) p.x = -4;
      }

      raf = requestAnimationFrame(draw);
    }

    draw();

    function handleResize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = w;
      canvas!.height = h;
    }

    function handleVisibility() {
      if (document.hidden) cancelAnimationFrame(raf);
      else draw();
    }

    window.addEventListener("resize", handleResize);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 1,
      }}
      aria-hidden="true"
    />
  );
}
