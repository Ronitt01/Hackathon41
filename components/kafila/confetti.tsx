"use client";

import { useEffect, useRef } from "react";

// Truck paints only (DESIGN.md): chrome yellow, truck red, parrot green, deep ink.
const PAINTS = ["#F2B705", "#C8102E", "#1E8C45", "#1A1410"];
const MAX = 80;
const DURATION = 1200;

type Shape = "tri" | "chevron" | "petal";
type Bit = { x: number; y: number; vx: number; vy: number; r: number; vr: number; s: number; c: string; k: Shape };

const reduced = () => typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * A short truck-paint confetti burst (triangles, chevron slivers, marigold petals) on a throwaway canvas.
 * `origin` is in viewport px (default: top-centre). No-op under prefers-reduced-motion.
 */
export function burst(opts: { origin?: { x: number; y: number }; count?: number } = {}) {
  if (reduced()) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const { x: ox, y: oy } = opts.origin ?? { x: w / 2, y: Math.min(160, h * 0.2) };
  const count = Math.max(1, Math.min(MAX, opts.count ?? 60));

  const canvas = document.createElement("canvas");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:60";
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  document.body.appendChild(canvas);
  ctx.scale(dpr, dpr);

  const kinds: Shape[] = ["tri", "chevron", "petal"];
  const bits: Bit[] = Array.from({ length: count }, (_, i) => {
    // Fan upward (−160°..−20°) so it reads as a pop; gravity then brings it down.
    const a = (-160 + Math.random() * 140) * (Math.PI / 180);
    const v = 5 + Math.random() * 7;
    return {
      x: ox,
      y: oy,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      r: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.4,
      s: 5 + Math.random() * 5,
      c: PAINTS[i % PAINTS.length],
      k: kinds[i % kinds.length],
    };
  });

  const start = performance.now();
  let last = start;
  const frame = (now: number) => {
    const t = now - start;
    const dt = Math.min(2, (now - last) / 16.67); // frame-rate independent steps
    last = now;
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = t > DURATION - 300 ? Math.max(0, (DURATION - t) / 300) : 1;
    for (const b of bits) {
      b.vx *= 0.985 ** dt;
      b.vy = b.vy * 0.985 ** dt + 0.28 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.r += b.vr * dt;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.r);
      ctx.fillStyle = ctx.strokeStyle = b.c;
      ctx.beginPath();
      if (b.k === "tri") {
        ctx.moveTo(0, -b.s);
        ctx.lineTo(b.s * 0.9, b.s * 0.6);
        ctx.lineTo(-b.s * 0.9, b.s * 0.6);
        ctx.fill();
      } else if (b.k === "chevron") {
        ctx.lineWidth = 2.4;
        ctx.moveTo(-b.s, -b.s * 0.4);
        ctx.lineTo(0, b.s * 0.4);
        ctx.lineTo(b.s, -b.s * 0.4);
        ctx.stroke();
      } else {
        ctx.ellipse(0, 0, b.s * 0.45, b.s, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    if (t < DURATION) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}

/**
 * Fires one burst when mounted with `when`, from the centre of its parent element, so
 * server-rendered moments ("All square", "Goal reached") can celebrate. With `sessionKey`
 * it fires at most once per browser session for that key, so revisiting the screen stays calm.
 */
export function ConfettiOnMount({ when, sessionKey, count }: { when: boolean; sessionKey?: string; count?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const fired = useRef(false);
  useEffect(() => {
    if (!when || fired.current) return;
    fired.current = true;
    if (sessionKey) {
      const k = `kafila:confetti:${sessionKey}`;
      try {
        if (sessionStorage.getItem(k)) return;
        sessionStorage.setItem(k, "1");
      } catch {
        // Storage blocked (private mode): celebrating again is harmless.
      }
    }
    const rect = ref.current?.parentElement?.getBoundingClientRect();
    burst({ count, origin: rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : undefined });
  }, [when, sessionKey, count]);
  return <span ref={ref} hidden />;
}
