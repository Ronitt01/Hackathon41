"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReflectorBar } from "@/components/kafila/reflector-bar";
import type { WrappedCard } from "@/lib/wrapped";

// Truck-paint fields: Tailwind class for the screen, matching hex for the canvas export. Every pair keeps text ≥ 4.5:1.
// Green uses the deeper text green: white on the parrot green itself is only 4.3:1.
const PALETTE = [
  { className: "bg-truck-yellow text-ink", bg: "#F2B705", fg: "#1A1410" },
  { className: "bg-truck-red text-wash", bg: "#C8102E", fg: "#F4F6F1" },
  { className: "bg-truck-green-ink text-white", bg: "#17703A", fg: "#FFFFFF" },
  { className: "bg-ink text-truck-yellow", bg: "#1A1410", fg: "#F2B705" },
];

// Canvas-only copies of the globals.css tokens (the export can't read Tailwind classes).
const GREEN = "#1E8C45";
const RED = "#C8102E";
const INK = "#1A1410";
const TRACK = "#E4E7DF";

const icon = { "aria-hidden": true, strokeWidth: 1.8, className: "size-5" } as const;

/** W-1: swipeable story cards with Prev/Next, arrow keys, share and save-as-image. */
export function WrappedStories({ cards, summary }: { cards: WrappedCard[]; summary: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Smoothness comes from motion-safe:scroll-smooth, so reduced motion jumps instead.
  function go(i: number) {
    const el = scroller.current;
    const n = Math.min(Math.max(i, 0), cards.length - 1);
    const card = el?.children[n] as HTMLElement | undefined;
    setActive(n); // don't wait for scroll events: they arrive late or not at all while smooth-scrolling
    if (el && card) el.scrollTo({ left: card.offsetLeft - el.offsetLeft });
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

  async function save() {
    setStatus(null);
    setError(null);
    const card = cards[active];
    const canvas = await drawCard(card, PALETTE[active % PALETTE.length]);
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
        onScroll={(e) => setActive(Math.round(e.currentTarget.scrollLeft / (e.currentTarget.clientWidth + 16)))} // + gap-4
        className="flex gap-4 snap-x snap-mandatory overflow-x-auto rounded-xl [scrollbar-width:none] motion-safe:scroll-smooth"
      >
        {cards.map((card, i) => (
          <article
            key={card.id}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${cards.length}`}
            className="chevron-band flex aspect-[9/16] w-full shrink-0 snap-center rounded-md p-2.5"
          >
            {/* Rear-board: chevron band frame, ink keyline, lettering first and its context line under it. */}
            <div className={`flex flex-1 flex-col rounded-[3px] border-2 border-ink p-7 ${PALETTE[i % PALETTE.length].className}`}>
              <div className="my-auto grid gap-3">
                <p
                  className={`font-display leading-[1.05] uppercase break-words ${
                    card.big.length > 12 ? "text-3xl" : card.big.length > 7 ? "text-4xl" : "text-6xl"
                  }`}
                >
                  {card.big}
                </p>
                {card.sharePct === undefined ? (
                  <>
                    <p className="text-[17px] font-semibold">{card.label}</p>
                    {card.sub && <p className="text-lg font-medium text-pretty">{card.sub}</p>}
                  </>
                ) : (
                  // share cards read as one sentence: "100%" ▸ tape ▸ "went on food (₹2,400)", label closes it
                  <>
                    <ReflectorBar value={card.sharePct} label={`${card.label}: ${card.big}`} />
                    {card.sub && <p className="text-lg font-medium text-pretty">{card.sub}</p>}
                    <p className="text-[15px] font-semibold opacity-90">{card.label}</p>
                  </>
                )}
              </div>
              <p className="text-[15px] font-bold">Kafila</p>
            </div>
          </article>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" className="h-11 bg-card pr-4 pl-3" onClick={() => go(active - 1)} disabled={active === 0}>
          <ChevronLeft {...icon} />
          Prev
        </Button>
        <span aria-live="polite" className="text-[13px] text-muted-foreground tabular">
          {active + 1} / {cards.length}
        </span>
        <Button variant="outline" className="h-11 bg-card pr-3 pl-4" onClick={() => go(active + 1)} disabled={active === cards.length - 1}>
          Next
          <ChevronRight {...icon} />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button className="h-11" onClick={share}>
          <Share2 {...icon} />
          Share
        </Button>
        <Button variant="outline" className="h-11 bg-card" onClick={save}>
          <Download {...icon} />
          Save card as image
        </Button>
      </div>
      {/* Always mounted so screen readers announce the text when it changes. */}
      <p aria-live="polite" className="text-[13px] text-muted-foreground">{status}</p>
      {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
    </section>
  );
}

/** Draws one card at story size (1080×1920) with the 2D canvas API; null if canvas isn't available. */
async function drawCard(card: WrappedCard, colour: { bg: string; fg: string }): Promise<HTMLCanvasElement | null> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  // next/font puts the real family names (with fallbacks) on these variables.
  const root = getComputedStyle(document.documentElement);
  const body = root.getPropertyValue("--font-hind").trim() || getComputedStyle(document.body).fontFamily;
  const display = root.getPropertyValue("--font-bungee").trim() || body;
  // The canvas draws with whatever is loaded right now, so wait for both faces first.
  await Promise.all([document.fonts?.load(`400 100px ${display}`), document.fonts?.load(`600 48px ${body}`)]).catch(() => {});
  const { width: W, height: H } = canvas;
  // The DOM card scaled ~2.8×: 10px chevron band, 2px ink keyline, 28px padding.
  const band = 28;
  const keyline = 6;
  const left = band + keyline + 80;
  const width = W - left * 2;

  // Chevron band: rows of red V strokes on parrot green (matches .chevron-band's 16×10 tile).
  ctx.fillStyle = GREEN;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = RED;
  ctx.lineWidth = 9;
  ctx.beginPath();
  for (let y = 0; y < H; y += 28) {
    for (let x = 0; x < W; x += 44) {
      ctx.moveTo(x, y + 3);
      ctx.lineTo(x + 22, y + 25);
      ctx.lineTo(x + 44, y + 3);
    }
  }
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.fillRect(band, band, W - band * 2, H - band * 2);
  ctx.fillStyle = colour.bg;
  ctx.fillRect(band + keyline, band + keyline, W - (band + keyline) * 2, H - (band + keyline) * 2);
  ctx.textBaseline = "top";

  // Each block measures itself first so the whole stack can be centred in the panel.
  const text = (font: string, value: string, lineHeight: number, maxLines: number) => {
    ctx.font = font;
    const lines = wrap(ctx, value, width);
    if (lines.length > maxLines) lines.splice(maxLines - 1, Infinity, `${lines[maxLines - 1]}…`);
    return {
      h: lines.length * lineHeight,
      draw: (y: number) => {
        ctx.font = font;
        ctx.fillStyle = colour.fg;
        // maxWidth squeezes a single word that is still wider than the card
        lines.forEach((line, i) => ctx.fillText(line, left, y + i * lineHeight, width));
      },
    };
  };
  // Reflector tape: red/white segments filling an ink-outlined track to the share.
  const tape = (pct: number) => ({
    h: 44,
    draw: (y: number) => {
      ctx.fillStyle = INK;
      ctx.fillRect(left, y, width, 44);
      ctx.fillStyle = TRACK;
      ctx.fillRect(left + 4, y + 4, width - 8, 36);
      const fill = ((width - 8) * Math.max(0, Math.min(100, pct))) / 100;
      for (let x = 0; x < fill; x += 28) {
        ctx.fillStyle = x % 56 ? "#FFFFFF" : RED;
        ctx.fillRect(left + 4 + x, y + 4, Math.min(28, fill - x), 36);
      }
    },
  });

  // Shrink the big lettering until its longest word fits, then wrap. Bungee is wide, so it starts smaller.
  const big = card.big.toUpperCase();
  let size = big.length > 12 ? 120 : 200;
  const widest = (s: number) => {
    ctx.font = `400 ${s}px ${display}`;
    return Math.max(...big.split(" ").map((w) => ctx.measureText(w).width));
  };
  while (size > 70 && widest(size) > width) size -= 10;

  // Lettering leads; the context line, tape and sub sit under it. Line caps keep it clear of the footer.
  // Same reading order as the on-screen card: share cards go number ▸ tape ▸ sub ▸ label.
  const blocks = (
    card.sharePct === undefined
      ? [
          text(`400 ${size}px ${display}`, big, size + 10, 3),
          text(`600 56px ${body}`, card.label, 70, 2),
          text(`500 60px ${body}`, card.sub, 78, 4),
        ]
      : [
          text(`400 ${size}px ${display}`, big, size + 10, 3),
          tape(card.sharePct),
          text(`500 60px ${body}`, card.sub, 78, 4),
          text(`600 50px ${body}`, card.label, 64, 2),
        ]
  ).filter((b) => b.h > 0);
  const gap = 40;
  const top = band + keyline + 96;
  const footer = H - band - keyline - 150;
  const total = blocks.reduce((h, b) => h + b.h, 0) + gap * (blocks.length - 1);
  let y = Math.max(top, top + (footer - 40 - top - total) / 2);
  for (const b of blocks) {
    b.draw(y);
    y += b.h + gap;
  }

  ctx.fillStyle = colour.fg;
  ctx.font = `700 48px ${body}`;
  ctx.fillText("Kafila", left, footer);
  return canvas;
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
