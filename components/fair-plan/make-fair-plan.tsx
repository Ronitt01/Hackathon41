"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { LoaderCircle, Lock, LockOpen } from "lucide-react";
import { PaintedBoard } from "@/components/kafila/painted-board";
import { StickerAvatar } from "@/components/kafila/sticker-avatar";
import { useToast } from "@/components/kafila/toast";
import { Button } from "@/components/ui/button";
import { success } from "@/lib/haptics";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { MAX_CARDS, REVEAL_SLOT, revealCards } from "./reveal-cards";
import s from "./reveal.module.css";

const NO_FIT = "No plan fits everyone's budget yet. Try fewer days or a cheaper stay, then make a fair plan again.";
const NO_OPTIONS = "Add a few places, food spots or stays in Decide first, then make a fair plan.";
const WAITING = ["Lining up plans…", "Balancing everyone's likes…", "Keeping every budget private…"];
const MAX_AVATARS = 8;
const TILTS = [-2, 1.5, -1, 2, -1.5, 1];
const TRY_MS = 800; // cards deal in (480 ms + stagger)
const WIN_MS = 1400; // the board holds before the refreshed page takes over

type Phase = "lock" | "try" | "stamp" | "win" | "landed" | "nofit";
type Counts = { candidates: number; overBudget: number };
type Result =
  | { kind: "ok" | "no_fit"; counts: Counts }
  | { kind: "no_options" }
  | { kind: "error"; message: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
// Empty when no candidates came back (an older route sends no counts), so never "Checked 0 plans".
const summary = ({ candidates, overBudget }: Counts) =>
  candidates ? `Checked ${plural(candidates, "plan")} · ${overBudget} ${overBudget === 1 ? "was" : "were"} over someone's budget` : "";

/** The stage's one line for each beat. */
function stageLine(phase: Phase, counts: Counts | null, waitStep: number) {
  const n = counts?.candidates ?? 0;
  if (phase === "lock") return "Locking budgets. Nobody sees anyone else's.";
  if (phase === "try") return n ? `Trying ${plural(n, "plan")}` : WAITING[waitStep];
  if (phase === "nofit") return (counts && summary(counts)) || NO_FIT;
  if (phase === "stamp" && counts && n) return counts.overBudget === 0 ? `All ${plural(n, "plan")} fit everyone's budget` : summary(counts);
  return "Found the fairest plan";
}

async function requestPlan(tripId: string): Promise<Result> {
  try {
    const res = await fetch(`/api/trips/${tripId}/plan`, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { kind: "error", message: typeof body.error === "string" ? body.error : "Something went wrong. Please try again." };
    if (body.status === "no_options") return { kind: "no_options" };
    // Counts are optional so an older deploy of the route still lands (the reveal just skips the cards).
    const counts = { candidates: Number(body.candidates) || 0, overBudget: Number(body.overBudget) || 0 };
    return { kind: body.status === "no_fit" ? "no_fit" : "ok", counts };
  } catch {
    return { kind: "error", message: "Couldn't reach the server. Check your connection and try again." };
  }
}

/**
 * A-1: the "Make a fair plan" button, pinned above the tab bar, and the four-beat reveal it plays above the plan:
 * budgets lock → N plans deal in → the ones over someone's budget get stamped and fall → the fairest grows into the board.
 * Only counts reach this phone, never whose budget or which plan. Also refreshes this phone when anyone saves a new plan.
 */
export function MakeFairPlan({
  tripId,
  again = false,
  members,
  autoStart = false,
}: {
  tripId: string;
  again?: boolean;
  members: string[];
  autoStart?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [phase, setPhase] = useState<Phase | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [looping, setLooping] = useState(false);
  const [waitStep, setWaitStep] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, startTransition] = useTransition();
  const running = useRef(false);
  const started = useRef(false);

  // "landed" closes itself once the refreshed page (with the real board) is in.
  const open = phase !== null && !(phase === "landed" && !refreshing);
  const busy = (open && phase !== "nofit") || refreshing;
  const status = open ? null : error ? null : phase === "landed" && counts ? summary(counts) : notice;
  // One persistent live region reads every beat (a region mounted already holding text often isn't announced); the stage's line is visual.
  const line = phase ? stageLine(phase, counts, waitStep) : "";
  const live = !open ? status : phase === "nofit" && counts?.candidates ? `${line}. ${NO_FIT}` : line;

  useEffect(() => {
    if (!looping || counts) return;
    const timer = setInterval(() => setWaitStep((n) => (n + 1) % WAITING.length), 1600);
    return () => clearInterval(timer);
  }, [looping, counts]);

  // A new plan sets trips.active_plan_id, so every phone re-renders the Plan tab. Not mid-reveal: the reveal refreshes at its end.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`trip:${tripId}:fair-plan`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "trips", filter: `id=eq.${tripId}` }, () => {
        if (!running.current) router.refresh();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, router]);

  async function run() {
    if (running.current) return;
    running.current = true;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setNotice(null);
    setError(null);
    setCounts(null);
    setLooping(false);
    setWaitStep(0);
    setPhase("lock");
    requestAnimationFrame(() => document.getElementById(REVEAL_SLOT)?.scrollIntoView({ block: "start", behavior: calm ? "auto" : "smooth" }));

    const req = requestPlan(tripId).then((r) => {
      if ("counts" in r) setCounts(r.counts);
      return r;
    });
    // Beat 1: one padlock per friend clicks shut.
    if (!calm) await sleep(Math.max(900, 450 + Math.min(members.length, MAX_AVATARS) * 140));
    setPhase("try");
    // Beat 2: the plans deal in; a slow request makes them bob while the messages rotate.
    const loop = window.setTimeout(() => setLooping(true), calm ? 0 : TRY_MS + 100);
    const res = await req;
    clearTimeout(loop);
    if (res.kind === "error" || res.kind === "no_options") {
      setPhase(null);
      if (res.kind === "error") setError(res.message);
      else setNotice(NO_OPTIONS);
      running.current = false;
      return;
    }
    // Beat 3: stamps, then the stamped cards fall away and the survivor is picked. No candidates counted → nothing to judge, skip it.
    if (res.counts.candidates) {
      if (!calm) await sleep(TRY_MS);
      setPhase("stamp");
      const { stamped } = revealCards(res.counts.candidates, res.counts.overBudget);
      if (!calm) await sleep(stamped.length * 200 + 1000);
    }
    if (res.kind === "no_fit") {
      setPhase("nofit");
      running.current = false;
      return;
    }
    // Beat 4: the board (it bursts confetti on mount), then the real result.
    setPhase("win");
    success();
    toast("Scene set hai — fits everyone", { tone: "success" });
    startTransition(() => router.refresh());
    await sleep(WIN_MS);
    setPhase("landed");
    running.current = false;
  }

  // ?reveal=1 (the demo trip): play once, and drop the param so a reload doesn't re-run it.
  useEffect(() => {
    if (!autoStart || started.current) return;
    started.current = true;
    router.replace(pathname, { scroll: false });
    void run();
  }, [autoStart]); // eslint-disable-line react-hooks/exhaustive-deps -- once, on mount

  const slot = open ? document.getElementById(REVEAL_SLOT) : null;

  return (
    <>
      {slot && createPortal(<Stage phase={phase!} line={line} counts={counts} members={members} looping={looping} />, slot)}
      {/* The stage already grew and stamped its board; the refreshed real board was display:none, so it would stamp again on reveal. */}
      {phase === "landed" && <style>{"#fair-board .board-stamp{animation:none}"}</style>}
      {/* Keeps the last content clear of the pinned bar. */}
      <div aria-hidden className="h-12" />
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 bg-wash shadow-[0_-8px_16px_var(--wash)]">
        <div className="mx-auto grid max-w-md gap-1.5 px-4 pt-2 pb-3">
          <p role="status" className={cn("text-center text-[13px] text-muted-foreground empty:hidden", open && "sr-only")}>
            {live}
          </p>
          {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
          <Button type="button" onClick={() => void run()} disabled={busy} className="h-[50px] w-full rounded-xl text-base font-bold">
            {busy && <LoaderCircle aria-hidden strokeWidth={1.8} className="size-5 motion-safe:animate-spin" />}
            {busy ? "Working on it…" : again ? "Make a new fair plan" : "Make a fair plan"}
          </Button>
        </div>
      </div>
    </>
  );
}

/** The reveal itself. Animation lives in reveal.module.css; under reduced motion every beat is its static end state. */
function Stage({
  phase,
  line,
  counts,
  members,
  looping,
}: {
  phase: Phase;
  line: string;
  counts: Counts | null;
  members: string[];
  looping: boolean;
}) {
  const winning = phase === "win" || phase === "landed";
  const cards = counts ? revealCards(counts.candidates, counts.overBudget) : { shown: MAX_CARDS, stamped: [], winner: null };
  const avatars = members.slice(0, MAX_AVATARS);

  return (
    <section aria-label="Making a fair plan" className="grid gap-3">
      {/* Hide the stale board below while ours plays, so the screen keeps one board. */}
      {phase !== "nofit" && <style>{"#fair-board{display:none}"}</style>}

      {/* Visual only: MakeFairPlan's bottom live region reads it out. The board speaks first, so no line above it once it's up. */}
      {!winning && (
        <p aria-hidden className="text-[15px] leading-snug font-bold">
          {line}
        </p>
      )}

      {!winning && (
        <ul aria-hidden className="flex flex-wrap gap-2.5">
          {avatars.map((name, i) => (
            <li key={`${name}-${i}`} className="relative">
              <StickerAvatar name={name} />
              <span className="absolute -right-1 -bottom-1 grid size-4.5 place-items-center rounded-full bg-ink text-wash ring-2 ring-wash">
                <LockOpen strokeWidth={2.5} className={cn("absolute size-2.5", s.open)} style={{ "--d": `${150 + i * 140}ms` } as CSSProperties} />
                <Lock strokeWidth={2.5} className={cn("size-2.5", s.shut)} style={{ "--d": `${150 + i * 140}ms` } as CSSProperties} />
              </span>
            </li>
          ))}
          {members.length > avatars.length && (
            <li className="tabular grid size-9 place-items-center rounded-full bg-card text-[13px] font-bold ring-2 ring-ink">
              +{members.length - avatars.length}
            </li>
          )}
        </ul>
      )}

      {(phase === "try" || phase === "stamp") && cards.shown > 0 && (
        <ol aria-hidden className="grid grid-cols-3 gap-2">
          {Array.from({ length: cards.shown }, (_, i) => {
            const j = cards.stamped.indexOf(i);
            const stamped = phase === "stamp" && j >= 0;
            const picked = phase === "stamp" && i === cards.winner;
            return (
              <li
                key={i}
                className={cn("relative grid h-[76px] content-start gap-1.5 rounded-lg border bg-card px-2.5 py-2", s.card, looping && (phase === "try" ? s.wait : s.settled), stamped && s.fall)}
                style={{ "--i": i, "--r": `${TILTS[i % TILTS.length]}deg`, "--j": stamped ? j : cards.stamped.length } as CSSProperties}
              >
                <span className="text-[13px] font-bold">Plan {i + 1}</span>
                <span className="h-1 w-4/5 rounded-full bg-muted" />
                <span className="h-1 w-3/5 rounded-full bg-muted" />
                <span className="h-1 w-2/3 rounded-full bg-muted" />
                {stamped && (
                  <span className={cn("absolute inset-x-1.5 top-6 rounded-sm border-2 border-truck-red bg-card px-1 py-0.5 text-center text-[11px] leading-tight font-bold text-truck-red uppercase", s.stamp)}>
                    Over someone&apos;s budget
                  </span>
                )}
                {picked && (
                  <span className={cn("absolute inset-x-1.5 bottom-1.5 rounded-full bg-truck-green-ink text-center text-[11px] leading-5 font-bold text-white", s.pick)}>
                    Fairest
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {winning && (
        <div className={s.grow}>
          <PaintedBoard celebrate note={(counts && summary(counts)) || undefined}>
            Fits everyone&apos;s budget
          </PaintedBoard>
        </div>
      )}

      {phase === "nofit" && line !== NO_FIT && (
        <p aria-hidden className="text-muted-foreground">
          {NO_FIT}
        </p>
      )}
    </section>
  );
}
