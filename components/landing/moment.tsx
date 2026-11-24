"use client";

import { useEffect, useRef, useState } from "react";
import { CircleAlert, CircleCheck, Lock } from "lucide-react";
import { PaintedBoard } from "@/components/kafila/painted-board";
import { ReflectorBar } from "@/components/kafila/reflector-bar";
import { StickerAvatar } from "@/components/kafila/sticker-avatar";
import { cn } from "@/lib/utils";
import { CARD, H2, INTRO, WRAP } from "./kit";
import s from "./moment.module.css";

const FRIENDS = ["You", "Meera", "Aarav", "Kabir", "Sana", "Rohan"];
const PLANS = [
  {
    name: "Candolim villa, Dudhsagar trek",
    detail: "4 days · ₹11,400 a head",
    over: true,
  },
  {
    name: "Panjim guesthouse, Palolem day",
    detail: "4 days · ₹7,900 a head",
    over: false,
  },
  {
    name: "Candolim villa, shack dinners",
    detail: "4 days · ₹9,200 a head",
    over: true,
  },
  {
    name: "Anjuna huts, cafés, Chapora fort",
    detail: "4 days · ₹6,850 a head",
    over: false,
  },
  {
    name: "Anjuna huts, flea market",
    detail: "3 days · ₹5,600 a head",
    over: false,
  },
];
const SCORES = [64, 71, 78, 84, 88, 93];

const STEPS = [
  {
    title: "Everyone locks a budget",
    text: "Six friends each set a number. It stays on their own phone.",
  },
  {
    title: "Kafila drafts five plans",
    text: "Stays, food and days out, built from what the group liked in Decide.",
  },
  {
    title: "Two plans go over",
    text: "They break someone's budget, so they're out. The app never says whose.",
  },
  {
    title: "The fairest plan wins",
    text: "Of the plans that fit, Kafila picks the one where the least happy friend is happiest.",
  },
];

/** "How a fair plan happens": four steps that swap in place as the reader scrolls through this section. */
export function FairPlanMoment() {
  const ref = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    // One passive read a frame: how far through its own two screens the section has scrolled.
    const read = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const range = r.height - window.innerHeight;
      const p = range > 0 ? Math.min(1, Math.max(0, -r.top / range)) : 0;
      setStep(Math.min(STEPS.length - 1, Math.floor(p * STEPS.length)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section
      ref={ref}
      id="how"
      aria-labelledby="how-h"
      data-moment="pinned-chapters"
      className={s.moment}
    >
      <div className={s.pin}>
        <div className={cn(WRAP, s.layout)}>
          <div className={s.head}>
            <h2 id="how-h" className={H2}>
              How Kafila finds a fair plan
            </h2>
            <p className={INTRO}>
              Meera has the lowest budget in the group. Nobody else knows that,
              and the plan still fits her.
            </p>
          </div>
          <ol className={s.steps}>
            {STEPS.map((st, i) => (
              <li key={st.title} className={s.step} data-active={i === step}>
                <div className={s.text}>
                  <span className={s.num} aria-hidden>
                    {i + 1}
                  </span>
                  <span>
                    <span className="block text-[18px] leading-snug font-bold">
                      {st.title}
                    </span>
                    <span className="mt-0.5 block text-[16px] leading-[1.5]">
                      {st.text}
                    </span>
                  </span>
                </div>
                <div className={s.figure}>
                  {/* Re-mounted when its step comes up, so the board stamps and the tape fills again. */}
                  <Stage key={String(i === step)} i={i} />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/** What the app shows at each step, on one stage of fixed size so nothing shifts as steps swap. */
function Stage({ i }: { i: number }) {
  const frame = cn(
    CARD,
    "flex h-full max-h-[600px] min-h-[300px] flex-col justify-center overflow-hidden p-5 md:p-8",
  );
  if (i === 0)
    return (
      <div
        className={frame}
        role="img"
        aria-label="Six friends, each with a padlocked budget. No amounts are shown."
      >
        <ul className="grid grid-cols-3 gap-2 sm:gap-3">
          {FRIENDS.map((n) => (
            <li
              key={n}
              className="grid justify-items-center gap-2 rounded-xl border bg-wash px-1 py-4"
            >
              <StickerAvatar name={n} size="lg" />
              <span className="text-[15px] font-semibold">{n}</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-ink bg-card px-2 text-[13px] leading-6 font-semibold">
                <Lock aria-hidden strokeWidth={2} className="size-3.5" />
                Locked
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  if (i === 1 || i === 2)
    return (
      <div
        className={frame}
        role="img"
        aria-label={
          i === 1
            ? "Five candidate plans for four days in Goa, with their cost per head."
            : "Two of the five plans are stamped Over someone's budget. The other three fit everyone."
        }
      >
        <ul className="divide-y rounded-xl border bg-card px-4">
          {PLANS.map((p, k) => (
            <li
              key={p.name}
              className={cn(
                "flex items-center justify-between gap-3 py-3",
                i === 2 && p.over && "text-muted-foreground",
              )}
            >
              <span className="min-w-0">
                <span className="block text-[15px] leading-snug font-semibold">
                  {p.name}
                </span>
                <span className="tabular block text-[13px] text-muted-foreground">
                  {p.detail}
                </span>
              </span>
              {i === 2 &&
                (p.over ? (
                  <span
                    style={{ animationDelay: `${k * 70}ms` }}
                    className={cn(
                      s.stamp,
                      "inline-flex shrink-0 -rotate-2 items-center gap-1 rounded-md border-2 border-truck-red px-2 py-0.5 text-[13px] font-bold text-truck-red",
                    )}
                  >
                    <CircleAlert
                      aria-hidden
                      strokeWidth={2}
                      className="size-4"
                    />
                    <span className="hidden sm:inline">
                      Over someone&apos;s budget
                    </span>
                    <span className="sm:hidden">Over budget</span>
                  </span>
                ) : (
                  <CircleCheck
                    aria-hidden
                    strokeWidth={1.8}
                    className="size-5 shrink-0 text-truck-green-ink"
                  />
                ))}
            </li>
          ))}
        </ul>
      </div>
    );
  return (
    <div
      className={cn(frame, "gap-5")}
      role="img"
      aria-label="The winning plan, Anjuna huts, cafés and Chapora fort, under a painted board that says Fits everyone's budget. The least happy friend scores 64%."
    >
      <PaintedBoard note="Anjuna huts, cafés, Chapora fort · ₹6,850 a head">
        Fits everyone&apos;s budget
      </PaintedBoard>
      <div className="grid gap-1.5">
        <p className="text-[15px] font-bold">How well it fits everyone</p>
        <ul className="grid grid-cols-[104px_1fr_40px] items-center gap-x-2 gap-y-1.5">
          {SCORES.map((v, k) => (
            <li
              key={k}
              // Phones show the minimum plus two rows so the board never clips on a short screen.
              className={cn(
                "col-span-3 grid grid-cols-subgrid items-center",
                k > 2 && "max-md:hidden",
              )}
            >
              <span className="text-[13px] font-bold">
                {k === 0 && "Group minimum"}
              </span>
              <ReflectorBar
                value={v}
                index={k}
                label={k === 0 ? "Group minimum" : `Friend ${k + 1} of 6`}
              />
              <span className="tabular text-right text-[13px] font-semibold">
                {v}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
