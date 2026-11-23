"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { WrappedCard } from "@/lib/wrapped";

// Tailwind class for the screen, matching hex for the canvas export. Every pair keeps text contrast ≥ 4.5:1.
const PALETTE = [
  { className: "bg-amber-300 text-stone-950", bg: "#fcd34d", fg: "#0c0a09" },
  { className: "bg-emerald-800 text-white", bg: "#065f46", fg: "#ffffff" },
  { className: "bg-rose-700 text-white", bg: "#be123c", fg: "#ffffff" },
  { className: "bg-lime-300 text-stone-950", bg: "#bef264", fg: "#0c0a09" },
  { className: "bg-orange-700 text-white", bg: "#c2410c", fg: "#ffffff" },
  { className: "bg-teal-900 text-white", bg: "#134e4a", fg: "#ffffff" },
];

/** W-1: swipeable story cards with Prev/Next, arrow keys, share and save-as-image. */
export function WrappedStories({ cards, summary }: { cards: WrappedCard[]; summary: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Smoothness comes from motion-safe:scroll-smooth, so reduced motion jumps instead.
  function go(i: number) {
    const el = scroller.current;
    if (el) el.scrollTo({ left: Math.min(Math.max(i, 0), cards.length - 1) * el.clientWidth });
  }

  async function share() {
    setStatus(null);
    setError(null);
    try {
      if (navigator.share) {
        await navigator.share({ title: "Trip Wrapped", text: summary });
      } else {
        await navigator.clipboard.writeText(summary);
        setStatus("Recap copied. Paste it in your group chat.");
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") setError("Couldn't share. Try again.");
    }
  }

  function save() {
    setStatus(null);
    setError(null);
    const card = cards[active];
    const canvas = drawCard(card, PALETTE[active % PALETTE.length]);
    if (!canvas) return setError("Your browser can't make images. Take a screenshot instead.");
    canvas.toBlob((blob) => {
      if (!blob) return setError("Couldn't save the image. Try again.");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `kafila-wrapped-${active + 1}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  }

  return (
    <section
      aria-label="Trip Wrapped"
      className="mx-auto grid w-full max-w-sm gap-4"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          go(active + (e.key === "ArrowRight" ? 1 : -1));
        }
      }}
    >
      <div
        ref={scroller}
        tabIndex={0}
        role="region"
        aria-label="Story cards. Use arrow keys to move."
        onScroll={(e) => setActive(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-3xl outline-none [scrollbar-width:none] focus-visible:ring-3 focus-visible:ring-ring/50 motion-safe:scroll-smooth"
      >
        {cards.map((card, i) => (
          <article
            key={card.id}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${cards.length}`}
            className={`flex aspect-[9/16] w-full shrink-0 snap-center flex-col justify-between rounded-3xl p-7 ${PALETTE[i % PALETTE.length].className}`}
          >
            <div className={`grid gap-4 ${i === active ? "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-6 motion-safe:duration-500" : ""}`}>
              <p className="text-sm font-semibold tracking-widest uppercase">{card.eyebrow}</p>
              <p className={`font-extrabold leading-none tracking-tight break-words ${card.big.length > 7 ? "text-4xl" : "text-6xl"}`}>{card.big}</p>
              {card.sub && <p className="text-lg font-medium">{card.sub}</p>}
            </div>
            <p className="text-sm font-semibold">Kafila</p>
          </article>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" className="h-11 px-4" onClick={() => go(active - 1)} disabled={active === 0}>
          Prev
        </Button>
        <span aria-live="polite" className="text-sm tabular-nums text-muted-foreground">
          {active + 1} / {cards.length}
        </span>
        <Button variant="outline" className="h-11 px-4" onClick={() => go(active + 1)} disabled={active === cards.length - 1}>
          Next
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button className="h-11" onClick={share}>Share</Button>
        <Button variant="outline" className="h-11" onClick={save}>Save card as image</Button>
      </div>
      {/* Always mounted so screen readers announce the text when it changes. */}
      <p aria-live="polite" className="text-sm text-muted-foreground">{status}</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </section>
  );
}

/** Draws one card at story size (1080×1920) with the 2D canvas API; null if canvas isn't available. */
function drawCard(card: WrappedCard, colour: { bg: string; fg: string }): HTMLCanvasElement | null {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const font = getComputedStyle(document.body).fontFamily;
  const left = 96;
  const width = canvas.width - left * 2;

  ctx.fillStyle = colour.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = colour.fg;
  ctx.textBaseline = "top";

  ctx.font = `600 48px ${font}`;
  ctx.fillText(card.eyebrow.toUpperCase(), left, 360);

  // Shrink the big number until its longest word fits, then wrap.
  let size = card.big.length > 12 ? 140 : 220;
  do {
    ctx.font = `800 ${size}px ${font}`;
    size -= 10;
  } while (size > 60 && Math.max(...card.big.split(" ").map((w) => ctx.measureText(w).width)) > width);
  // Line caps keep the sub text above the "Kafila" footer at y=1740.
  const y = drawLines(ctx, card.big, left, 460, width, size + 10, 3);
  ctx.font = `500 60px ${font}`;
  drawLines(ctx, card.sub, left, y + 60, width, 78, 5);

  ctx.font = `600 44px ${font}`;
  ctx.fillText("Kafila", left, canvas.height - 180);
  return canvas;
}

/** Draws wrapped text, at most maxLines (the last gets "…"); returns the y below it. */
function drawLines(ctx: CanvasRenderingContext2D, text: string, left: number, y: number, width: number, lineHeight: number, maxLines: number): number {
  const lines = wrap(ctx, text, width);
  if (lines.length > maxLines) lines.splice(maxLines - 1, Infinity, `${lines[maxLines - 1]}…`);
  // maxWidth squeezes a single word that is still wider than the card
  for (const line of lines) {
    ctx.fillText(line, left, y, width);
    y += lineHeight;
  }
  return y;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > width) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}
