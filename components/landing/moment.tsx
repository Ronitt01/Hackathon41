"use client";

import { useState } from "react";
import { CircleAlert, CircleCheck, Lock } from "lucide-react";
import { PaintedBoard } from "@/components/kafila/painted-board";
import { ReflectorBar } from "@/components/kafila/reflector-bar";
import { StickerAvatar } from "@/components/kafila/sticker-avatar";
import { cn } from "@/lib/utils";
import { CARD, H2, INTRO, ONE_SCREEN, SECTION, WRAP } from "./kit";

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

/** The active step is marked only by its filled green disc; every step's words stay in ink. */
const NUM =
  "grid size-8 shrink-0 place-items-center rounded-full border-[1.5px] border-ink text-[15px] font-bold tabular-nums group-aria-pressed:border-truck-green-ink group-aria-pressed:bg-truck-green-ink group-aria-pressed:text-white";

/** "How a fair plan happens": four step buttons swap the stage. At rest (and without scripts) it shows the verdict. */
export function FairPlanMoment() {
  const [step, setStep] = useState(STEPS.length - 1);

  return (
    <section
      id="how"
      aria-labelledby="how-h"
      className={cn(SECTION, ONE_SCREEN)}
    >
      <div
        className={cn(
          WRAP,
          "flex flex-1 flex-col gap-6 lg:grid lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-6 lg:gap-y-8",
        )}
      >
        <div className="flex flex-col gap-4 lg:contents">
          <div className="lg:col-span-6">
            <h2 id="how-h" className={H2}>
              How Kafila finds a fair plan
            </h2>
            <p className={INTRO}>
              Meera has the lowest budget in the group. Nobody else knows
              that, and the plan still fits her.
            </p>
          </div>
          {/* Phone: four numbered discs with the active step's words under them. Desktop: every step listed. */}
          <ol className="flex gap-1 lg:col-span-5 lg:row-start-2 lg:grid lg:gap-0 lg:self-start lg:border-b">
            {STEPS.map((st, i) => (
              <li key={st.title} className="lg:border-t">
                <button
                  type="button"
                  aria-pressed={i === step}
                  onClick={() => setStep(i)}
                  onFocus={() => setStep(i)}
                  className="group grid size-11 cursor-pointer place-items-center text-left lg:size-auto lg:w-full lg:grid-cols-[32px_minmax(0,1fr)] lg:place-items-start lg:gap-x-3.5 lg:py-5"
                >
                  <span className={NUM} aria-hidden>
                    {i + 1}
                  </span>
                  <span className="max-lg:sr-only">
                    <span className="block text-[18px] leading-snug font-bold">
                      {st.title}
                    </span>
                    <span className="mt-0.5 block text-[16px] leading-[1.5]">
                      {st.text}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
          {/* Phones only: the active step's words (the buttons already carry them for screen readers). */}
          <p aria-hidden className="lg:hidden">
            <span className="block text-[17px] leading-snug font-bold">
              {STEPS[step].title}
            </span>
            <span className="mt-0.5 block text-[15px] leading-[1.5]">
              {STEPS[step].text}
            </span>
          </p>
        </div>
        {/* The stage stands on the section's ground, level with the steps. Inactive pictures are `hidden` (display:none), so
            showing one again replays its board stamp and tape fill. */}
        <div className="mt-auto lg:mt-0 lg:col-[7/-1] lg:row-start-2 lg:self-start">
          {STEPS.map((st, i) => (
            <Stage key={st.title} i={i} hidden={i !== step} />
          ))}
        </div>
      </div>
    </section>
  );
}

/** What the app shows at each step, at its natural height. */
function Stage({ i, hidden }: { i: number; hidden: boolean }) {
  if (i === 0)
    return (
      <div
        hidden={hidden}
        role="img"
        aria-label="Six friends, each with a padlocked budget. No amounts are shown."
      >
        <ul className="grid grid-cols-3 gap-2 sm:gap-3">
          {FRIENDS.map((n) => (
            <li
              key={n}
              className="grid justify-items-center gap-2 rounded-xl border bg-card px-1 py-4"
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
        hidden={hidden}
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
                    className="inline-flex shrink-0 -rotate-2 items-center gap-1 rounded-md border-2 border-truck-red px-2 py-0.5 text-[13px] font-bold text-truck-red motion-safe:animate-[board-stamp_360ms_cubic-bezier(0.22,1,0.36,1)_both]"
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
  // The board stands on the section's ground (no card around it), hugging its lettering, set left.
  return (
    <div
      hidden={hidden}
      className="flex flex-col gap-4"
      role="img"
      aria-label="The winning plan, Anjuna huts, cafés and Chapora fort, under a painted board that says Fits everyone's budget. The least happy friend scores 64%."
    >
      <PaintedBoard
        className="self-start [&>div]:text-left"
        note="Anjuna huts, cafés, Chapora fort · ₹6,850 a head"
      >
        Fits everyone&apos;s budget
      </PaintedBoard>
      <div className={cn(CARD, "grid gap-2 p-5 md:p-6 lg:gap-3")}>
        <p className="text-[15px] font-bold">How well it fits everyone</p>
        <ul className="grid grid-cols-[104px_1fr_40px] items-center gap-x-2 gap-y-1.5 lg:gap-y-3">
          {SCORES.map((v, k) => (
            <li
              key={k}
              className="col-span-3 grid grid-cols-subgrid items-center"
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
