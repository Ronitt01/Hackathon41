"use client";

import { useEffect, useRef, useState } from "react";
import { Heart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tap } from "@/lib/haptics";
import { inr, splitEqually } from "@/lib/money";
import { errorMessage } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";
import { tagLabel } from "@/lib/tags";
import { cn } from "@/lib/utils";
import type { Option } from "./data";
import { CHIP, KIND_LABEL } from "./option-card";

const passedKey = (tripId: string, meId: string) => `kafila:passed:${tripId}:${meId}`;

/** Options I said "not for me" to. Only on this phone: a pass is a skip, not a vote, so it never reaches the group. */
export function readPassed(tripId: string, meId: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(passedKey(tripId, meId)) ?? "[]");
  } catch {
    return [];
  }
}
function addPassed(tripId: string, meId: string, id: string) {
  try {
    localStorage.setItem(passedKey(tripId, meId), JSON.stringify([...new Set([...readPassed(tripId, meId), id])]));
  } catch {
    // private window: the card may come back next time, nothing worse
  }
}

const FLING_PX_PER_MS = 0.5;
const OUT_MS = 220;

/**
 * Quick vote: one idea at a time. Swipe or tap the heart to like it, swipe or tap X to skip. The card follows the
 * finger 1:1; a fast flick or a drag past a third of its width sends it off, anything less springs back.
 * The deck is a snapshot taken when it opens, so live updates from friends don't reshuffle it mid-swipe.
 */
export function SwipeDeck({
  tripId,
  meId,
  options,
  activeCount,
  onClose,
  onChange,
}: {
  tripId: string;
  meId: string;
  options: Option[];
  activeCount: number;
  onClose: () => void;
  onChange: () => void;
}) {
  const [deck] = useState(options);
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; t: number; dx: number; v: number } | null>(null);
  const leaving = useRef(false);
  const top = deck[index];

  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const place = (dx: number, transition = "none") => {
    const el = card.current;
    if (!el) return;
    el.style.transition = transition;
    el.style.transform = reduced() ? "" : `translateX(${dx}px) rotate(${dx / 24}deg)`;
    el.dataset.lean = dx > 40 ? "like" : dx < -40 ? "pass" : "";
  };

  async function decide(like: boolean, fromVelocity = 0) {
    if (!top || leaving.current) return;
    leaving.current = true;
    tap();
    const el = card.current;
    const width = el?.offsetWidth ?? 360;
    if (el) {
      if (reduced()) {
        el.style.transition = `opacity ${OUT_MS}ms ease-out`;
        el.style.opacity = "0";
      } else {
        // Leave at least as fast as the finger was moving, so a flick never slows down on release.
        const ms = Math.max(140, Math.min(OUT_MS, width / Math.max(Math.abs(fromVelocity), 1.5)));
        place((like ? 1 : -1) * width * 1.4, `transform ${ms}ms cubic-bezier(.2,.8,.2,1)`);
      }
    }
    const write = like
      ? createClient().from("reactions").insert({ trip_id: tripId, option_id: top.id, aspect_id: null, member_id: meId, kind: "like" })
      : (addPassed(tripId, meId, top.id), Promise.resolve({ error: null }));
    const [{ error }] = await Promise.all([write, new Promise((r) => setTimeout(r, OUT_MS))]);
    if (error) setError(errorMessage(error));
    else if (like) {
      setLiked((n) => n + 1);
      onChange();
    }
    setIndex((i) => i + 1);
    leaving.current = false;
  }

  // The next card mounts in the same element: clear the fling's end state before it paints.
  useEffect(() => {
    const el = card.current;
    if (!el) return;
    el.style.transition = "none";
    el.style.transform = "";
    el.style.opacity = "";
    el.dataset.lean = "";
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select")) return;
      if (e.key === "ArrowRight") decide(true);
      else if (e.key === "ArrowLeft") decide(false);
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (leaving.current || (e.target as HTMLElement).closest("button")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, t: e.timeStamp, dx: 0, v: 0 };
    place(0);
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dt = e.timeStamp - d.t;
    if (dt > 0) d.v = (dx - d.dx) / dt;
    d.dx = dx;
    d.t = e.timeStamp;
    place(dx);
  }
  function onPointerUp() {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const width = card.current?.offsetWidth ?? 360;
    const flung = Math.abs(d.v) > FLING_PX_PER_MS && Math.sign(d.v) === Math.sign(d.dx);
    if (flung || Math.abs(d.dx) > width / 3) decide(d.dx > 0, d.v);
    else place(0, "transform 260ms cubic-bezier(.2,.9,.3,1.2)"); // spring back, with a touch of overshoot
  }

  if (!top) {
    return (
      <section aria-labelledby="deck-done" className="mx-auto grid w-full max-w-[440px] justify-items-center gap-3 rounded-xl border-2 border-truck-green-ink bg-card px-4 py-8 text-center">
        <h2 id="deck-done" className="text-[20px] font-bold">That&apos;s all of them</h2>
        <p className="text-[15px] text-muted-foreground">
          {liked ? `You liked ${liked}. The fair plan counts your hearts.` : "Nothing caught your eye. That's fine, it still counts as 'don't mind'."}
        </p>
        <Button className="h-11 px-5" onClick={onClose}>Back to all ideas</Button>
      </section>
    );
  }

  const perHead = top.price_paise != null ? splitEqually(top.price_paise, Math.max(1, activeCount))[0] : null;
  return (
    <section aria-labelledby="deck-title" className="mx-auto grid w-full max-w-[440px] gap-3">
      <div className="flex items-center justify-between">
        <h2 id="deck-title" className="text-[17px] font-bold">Quick vote</h2>
        <p className="tabular text-[13px] text-muted-foreground" aria-live="polite">{index + 1} of {deck.length}</p>
      </div>

      <div className="relative">
        {/* The next card peeks from behind, so the stack reads as a stack. */}
        {deck[index + 1] && <div aria-hidden className="absolute inset-x-3 top-3 bottom-0 rounded-xl border bg-card" />}
        <div
          ref={card}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={cn(
            "group relative grid cursor-grab touch-pan-y overflow-hidden rounded-xl border-2 border-ink bg-card select-none active:cursor-grabbing",
            "data-[lean=like]:border-truck-green-ink data-[lean=pass]:border-truck-red",
          )}
        >
          {top.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- any user-pasted URL; next/image needs allow-listed hosts
            <img src={top.image_url} alt="" draggable={false} className="h-44 w-full object-cover" />
          ) : (
            <div aria-hidden className="chevron-band h-3" />
          )}
          <div className="grid gap-2 p-4">
            <div className="flex flex-wrap gap-1.5">
              <span className={CHIP}>{KIND_LABEL[top.kind] ?? top.kind}</span>
              {top.source === "ai" && <span className={cn(CHIP, "border-border text-muted-foreground")}>Suggested by Kafila</span>}
            </div>
            <h3 className="text-[22px] leading-tight font-bold">{top.title}</h3>
            {perHead != null && (
              <p className="tabular text-[15px]">
                {top.source === "ai" && "About "}
                <span className="font-semibold">{inr(perHead)}</span> per head
              </p>
            )}
            {top.description && <p className="text-[15px] text-muted-foreground">{top.description}</p>}
            {top.tags.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
                {top.tags.map((t) => <li key={t} className={CHIP}>{tagLabel(t)}</li>)}
              </ul>
            )}
          </div>
          {/* Stamps fade in as the card leans, on the trailing side so they stay on screen while the card moves away. */}
          <span aria-hidden className="pointer-events-none absolute top-4 left-4 -rotate-6 rounded-md border-2 border-truck-green-ink bg-card px-2 font-display text-[18px] text-truck-green-ink opacity-0 transition-opacity duration-150 group-data-[lean=like]:opacity-100">Love it</span>
          <span aria-hidden className="pointer-events-none absolute top-4 right-4 rotate-6 rounded-md border-2 border-truck-red bg-card px-2 font-display text-[18px] text-truck-red opacity-0 transition-opacity duration-150 group-data-[lean=pass]:opacity-100">Nope</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="h-14 rounded-xl border-2 border-ink bg-card text-[16px]" onClick={() => decide(false)} aria-label={`Not for me: ${top.title}`}>
          <X aria-hidden strokeWidth={2.2} className="size-5" />
          Not for me
        </Button>
        <Button className="h-14 rounded-xl bg-truck-green-ink text-[16px] text-white hover:bg-truck-green-ink/90" onClick={() => decide(true)} aria-label={`Love it: ${top.title}`}>
          <Heart aria-hidden strokeWidth={2.2} className="size-5" />
          Love it
        </Button>
      </div>
      <p className="text-center text-[13px] text-muted-foreground">
        Swipe right to like, left to skip. Skips stay on your phone.{" "}
        <button type="button" onClick={onClose} className="font-semibold text-ink underline underline-offset-4">Stop for now</button>
      </p>
      {error && <p role="alert" className="text-[15px] text-destructive">{error}</p>}
    </section>
  );
}
