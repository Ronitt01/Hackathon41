"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowDown, ChevronLeft, ChevronRight, Globe, Heart, IndianRupee, Lock, PencilLine, Scale, Share2, Smartphone } from "lucide-react";
import { DemoTripButton } from "@/components/demo-trip-button";
import { burst } from "@/components/kafila/confetti";
import { BTN_PRIMARY } from "@/components/landing/kit";
import { cn } from "@/lib/utils";
import { SCENES, STEPS, type Fact } from "./scenes";
import { Stage } from "./stage";
import s from "./tour.module.css";

const FACT_ICON: Record<Fact, typeof Lock> = {
  phone: Smartphone,
  google: Globe,
  lock: Lock,
  heart: Heart,
  scale: Scale,
  edit: PencilLine,
  upi: IndianRupee,
  share: Share2,
};

const CHAPTERS = SCENES.flatMap((sc, i) => (sc.chapter && sc.step ? [{ id: sc.id, step: sc.step, label: sc.chapter, index: i }] : []));
const LAST = SCENES.length - 1;

const WIDE = "(min-width: 1024px)";
const subscribeWide = (cb: () => void) => {
  const mq = window.matchMedia(WIDE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Step number for the HUD: the intro is 0, the closing screen counts as the whole journey done. */
const stepAt = (i: number) => (i === LAST ? STEPS : (SCENES[i].step ?? 0));

/**
 * "How Kafila works": a scroll deck. Each scene is one full screen of text over a fixed 3D stage; the scene that
 * crosses the middle of the viewport drives the stage. Keys and a presenter's clicker step one scene at a time.
 */
export function Tour() {
  const [active, setActive] = useState(0);
  const [announce, setAnnounce] = useState("");
  const compact = !useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE).matches, () => true);
  const rootRef = useRef<HTMLDivElement>(null);
  const sections = useRef<(HTMLElement | null)[]>([]);
  const activeRef = useRef(0);
  const target = useRef<number | null>(null); // where a key press is heading, so quick presses add up

  const go = useCallback((i: number) => {
    const n = Math.max(0, Math.min(LAST, i));
    target.current = n;
    sections.current[n]?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
    const sc = SCENES[n];
    setAnnounce(sc.step ? `Step ${sc.step} of ${STEPS}: ${sc.title}` : sc.title);
  }, []);

  useEffect(() => {
    rootRef.current?.setAttribute("data-hydrated", "");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const i = Number((e.target as HTMLElement).dataset.index);
          activeRef.current = i;
          if (target.current === i) target.current = null;
          setActive(i);
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    for (const el of sections.current) if (el) io.observe(el);
    const settle = () => (target.current = null);
    window.addEventListener("scrollend", settle);
    // A resize or a phone rotation changes every scene's height; land back on the current one.
    let raf = 0;
    const realign = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => sections.current[activeRef.current]?.scrollIntoView({ block: "start" }));
    };
    window.addEventListener("resize", realign);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("scrollend", settle);
      window.removeEventListener("resize", realign);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [contenteditable='true']")) return;
      const cur = target.current ?? activeRef.current;
      let next: number;
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
        case "PageDown":
          next = cur + 1;
          break;
        case " ":
          // Space presses a focused button, except the deck's own controls: there it keeps stepping forward.
          if (t?.closest("button:not([data-deck]), [role='button']")) return;
          next = e.shiftKey ? cur - 1 : cur + 1;
          break;
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
          next = cur - 1;
          break;
        case "Home":
          next = 0;
          break;
        case "End":
          next = LAST;
          break;
        default:
          return;
      }
      e.preventDefault();
      go(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  // The verdict lands: one truck-paint burst from the lifted board (burst() is a no-op under reduced motion).
  useEffect(() => {
    if (SCENES[active].id !== "fits") return;
    const t = window.setTimeout(() => {
      const r = document.querySelector('[data-piece="fits-board"]')?.getBoundingClientRect();
      burst({ origin: r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined, count: 70 });
    }, 1000);
    return () => window.clearTimeout(t);
  }, [active]);

  const step = stepAt(active);

  return (
    <div ref={rootRef} className={s.root}>
      <header className="fixed inset-x-0 top-0 z-30 h-16 border-b bg-wash [contain:paint]">
        <div className="flex h-full items-center gap-4 px-4 md:px-6 lg:px-[3vw]">
          <Link href="/" className="inline-flex h-11 items-center text-[15px] font-bold tracking-[0.16em] uppercase">
            Kafila
          </Link>
          <nav aria-label="Tour steps" className="hidden flex-1 justify-center lg:flex">
            <ol className="flex items-center gap-0.5">
              {CHAPTERS.map((c) => {
                const state = c.step === step ? "now" : c.step < step ? "done" : "next";
                return (
                  <li key={c.id}>
                    <a
                      href={`#${c.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        go(c.index);
                      }}
                      aria-current={state === "now" ? "step" : undefined}
                      className="group inline-flex h-11 items-center gap-2 rounded-full px-2 text-[14px] font-semibold text-muted-foreground transition-colors duration-150 hover:text-ink aria-[current=step]:text-ink"
                    >
                      <span
                        className={cn(
                          "tabular grid size-7 place-items-center rounded-full text-[13px] font-bold ring-1 transition-colors duration-200",
                          state === "now" && "bg-truck-green-ink text-white ring-truck-green-ink",
                          state === "done" && "bg-ink text-wash ring-ink",
                          state === "next" && "bg-card ring-input",
                        )}
                      >
                        {c.step}
                      </span>
                      <span className="sr-only whitespace-nowrap min-[1440px]:not-sr-only">{c.label}</span>
                    </a>
                  </li>
                );
              })}
            </ol>
          </nav>
          <div className="ml-auto flex items-center gap-3 lg:ml-0">
            <Progress step={step} />
            <Link href="/start" className={cn(BTN_PRIMARY, "hidden h-11 shrink-0 whitespace-nowrap md:inline-flex")}>
              Start a trip
            </Link>
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="relative z-10 outline-none">
        {SCENES.map((sc, i) => {
          const Heading = i === 0 ? "h1" : "h2";
          const FactIcon = sc.fact ? FACT_ICON[sc.fact.icon] : null;
          return (
            <section
              key={sc.id}
              id={sc.id}
              ref={(el) => {
                sections.current[i] = el;
              }}
              data-index={i}
              data-active={i === active ? "" : undefined}
              aria-labelledby={`${sc.id}-h`}
              className={cn(s.section, "relative flex h-svh items-end lg:items-center")}
            >
              <div
                className={cn(
                  s.text,
                  "relative w-full px-5 pb-[calc(env(safe-area-inset-bottom)+28px)] md:px-10 lg:w-[46vw] lg:max-w-[40rem] lg:pt-16 lg:pb-0 lg:pl-[max(3vw,1.5rem)]",
                )}
              >
                <div className="flex items-start gap-3 lg:gap-4">
                  {sc.step && <Milestone n={sc.step} />}
                  <Heading
                    id={`${sc.id}-h`}
                    className={cn(
                      "font-semibold tracking-[-0.02em] text-balance",
                      i === 0
                        ? "text-[40px] leading-[1] md:text-[56px] lg:text-[76px]"
                        : "text-[26px] leading-[1.08] md:text-[36px] lg:text-[50px]",
                    )}
                  >
                    {sc.title}
                  </Heading>
                </div>
                <p className="mt-3 max-w-[42ch] text-[16px] leading-[1.5] text-pretty md:text-[18px] lg:mt-5 lg:text-[20px]">
                  {sc.body}
                </p>
                {sc.fact && FactIcon && (
                  <p className="mt-3 flex max-w-[44ch] items-start gap-2.5 text-[14px] leading-snug font-semibold md:text-[15px] lg:mt-6 lg:text-[16px]">
                    <FactIcon aria-hidden className="mt-px size-[18px] shrink-0 text-truck-green-ink" strokeWidth={2} />
                    {sc.fact.text}
                  </p>
                )}
                {sc.id === "intro" && (
                  <p className="mt-6 flex items-center gap-2 text-[15px] font-semibold text-muted-foreground lg:mt-10">
                    <span className="hidden items-center gap-2 pointer-fine:inline-flex">
                      Press <Kbd>→</Kbd> or <Kbd>Space</Kbd> to step through
                    </span>
                    <span className="inline-flex items-center gap-2 pointer-fine:hidden">
                      <ArrowDown aria-hidden className="size-4" strokeWidth={2} />
                      Scroll to step through
                    </span>
                  </p>
                )}
                {sc.id === "end" && (
                  <div className="mt-6 flex flex-wrap items-start gap-3 lg:mt-9">
                    <DemoTripButton className="[&_button]:h-12 [&_button]:rounded-xl [&_button]:px-5 [&_button]:text-[16px]" />
                    <Link
                      href="/start"
                      className="inline-flex h-12 items-center justify-center rounded-xl border border-input bg-card px-5 text-[16px] font-semibold text-ink transition-colors duration-150 hover:bg-muted"
                    >
                      Start a trip
                    </Link>
                    <button
                      type="button"
                      data-deck
                      onClick={() => {
                        go(0);
                        document.getElementById("main")?.focus({ preventScroll: true });
                      }}
                      className="inline-flex h-12 items-center px-2 text-[15px] font-semibold text-muted-foreground underline decoration-1 underline-offset-4 hover:text-ink"
                    >
                      Watch again
                    </button>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </main>

      <Stage index={active} compact={compact} />

      {/* Presenter controls for a mouse or a projector; on touch the scroll is the control. */}
      <div className="fixed right-[3vw] bottom-6 z-30 hidden items-center gap-3 lg:flex">
        <span className="text-[13px] font-semibold text-muted-foreground pointer-coarse:hidden">
          <Kbd>←</Kbd> <Kbd>→</Kbd>
        </span>
        <button
          type="button"
          data-deck
          onClick={() => go((target.current ?? activeRef.current) - 1)}
          disabled={active === 0}
          aria-label="Previous step"
          className="grid size-11 place-items-center rounded-full border border-input bg-card text-ink transition-colors duration-150 hover:bg-muted disabled:opacity-40"
        >
          <ChevronLeft aria-hidden className="size-5" />
        </button>
        <button
          type="button"
          data-deck
          onClick={() => go((target.current ?? activeRef.current) + 1)}
          disabled={active === LAST}
          aria-label="Next step"
          className="grid size-11 place-items-center rounded-full bg-ink text-wash transition-colors duration-150 hover:bg-ink/85 disabled:opacity-40"
        >
          <ChevronRight aria-hidden className="size-5" />
        </button>
      </div>

      <p aria-live="polite" className="sr-only">
        {announce}
      </p>
    </div>
  );
}

/** Progress as reflector tape, the world's one way to draw a share: the stripes pull out as the trip goes on. */
function Progress({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        role="progressbar"
        aria-label="Tour progress"
        aria-valuemin={0}
        aria-valuemax={STEPS}
        aria-valuenow={step}
        aria-valuetext={step === 0 ? "Not started" : `Step ${step} of ${STEPS}`}
        className="relative h-3.5 w-20 overflow-hidden rounded-[2px] border border-ink bg-track md:w-28"
      >
        <div
          className="absolute inset-0 [background:repeating-linear-gradient(90deg,var(--truck-red)_0_10px,var(--card)_10px_20px)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
          style={{ transform: `translateX(${(step / STEPS - 1) * 100}%)` }}
        />
      </div>
      <span className="tabular min-w-[2.75rem] text-[13px] font-semibold" aria-hidden>
        {step} / {STEPS}
      </span>
    </div>
  );
}

/** A highway milestone (yellow cap, white stone) carrying the step number. */
function Milestone({ n }: { n: number }) {
  return (
    <svg
      viewBox="0 0 40 52"
      aria-hidden
      className="mt-0.5 h-[44px] w-[34px] shrink-0 md:mt-1 md:h-[52px] md:w-[40px] lg:mt-1.5 lg:h-[60px] lg:w-[46px]"
    >
      <path d="M2 50V20a18 18 0 0 1 36 0v30Z" fill="var(--card)" stroke="var(--ink)" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M3.25 20a16.75 16.75 0 0 1 33.5 0Z" fill="var(--truck-yellow)" />
      <path d="M2 20h36" stroke="var(--ink)" strokeWidth="2" />
      <text
        x="20"
        y="42"
        textAnchor="middle"
        fontFamily="var(--font-hind), sans-serif"
        fontWeight="700"
        fontSize="17"
        fill="var(--ink)"
      >
        {n}
      </text>
    </svg>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-grid h-7 min-w-7 place-items-center rounded-md border border-ink/60 bg-card px-1.5 font-sans text-[13px] font-semibold text-ink">
      {children}
    </kbd>
  );
}
