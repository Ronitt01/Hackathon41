import Image from "next/image";
import { CircleAlert, Eye, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CARD,
  CARD_TITLE,
  H2,
  INTRO,
  ONE_SCREEN,
  SECTION,
  WRAP,
  photo,
} from "./kit";

const MINE = [
  "Your budget",
  "What you've saved in the Trip Jar",
  "How well a plan fits you",
  "Your vetoes, unless you sign them",
  "Your mood check-ins",
];
const GROUP = [
  "Whether a plan fits everyone's budget",
  "The group fit score of each option",
  "The group minimum on the fairness meter",
  "How many friends asked for a break",
];

/** Privacy: two columns, what only you see and what the group sees, each with the screen that shows it. */
export function PrivacySection() {
  const villa = photo("villa");
  return (
    <section
      id="privacy"
      aria-labelledby="privacy-h"
      className={cn(SECTION, ONE_SCREEN)}
    >
      <div className={WRAP}>
        <h2 id="privacy-h" className={H2}>
          What stays private, and what the group sees
        </h2>
        <p className={INTRO}>
          Budgets are locked in the database, not only hidden on screen. The
          group gets what it needs to decide, and nothing that points to one
          person.
        </p>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <article className={cn(CARD, "flex flex-col p-6 xl:p-8")}>
            <h3 className={cn(CARD_TITLE, "flex items-center gap-2")}>
              <Lock aria-hidden strokeWidth={1.8} className="size-5" />
              Only you see
            </h3>
            <ul className="mt-3 grid gap-1.5 text-[16px]">
              {MINE.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
            <div
              role="img"
              aria-label="Your budget field showing ₹12,000, marked only you can see this."
              className="mt-auto grid gap-1.5 pt-6"
            >
              <span className="text-[15px] font-semibold">
                Your budget for this trip
              </span>
              <span className="flex h-11 items-center justify-between rounded-lg border border-input bg-card px-2.5 text-[16px]">
                <span className="tabular">₹12,000</span>
                <Lock
                  aria-hidden
                  strokeWidth={1.8}
                  className="size-4 text-muted-foreground"
                />
              </span>
              <span className="text-[13px] text-muted-foreground">
                Only you can see this.
              </span>
            </div>
          </article>

          <article className={cn(CARD, "flex flex-col p-6 xl:p-8")}>
            <h3 className={cn(CARD_TITLE, "flex items-center gap-2")}>
              <Eye aria-hidden strokeWidth={1.8} className="size-5" />
              The group sees
            </h3>
            <ul className="mt-3 mb-6 grid gap-1.5 text-[16px]">
              {GROUP.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
            <div
              role="img"
              aria-label="An option, Candolim villa with a pool at ₹7,000 per head, marked Over someone's budget without saying whose."
              className="mt-auto flex items-center gap-3 rounded-xl border bg-wash p-3"
            >
              <Image
                src={villa.file}
                alt=""
                width={112}
                height={112}
                sizes="56px"
                className="size-14 shrink-0 rounded-lg object-cover"
              />
              <span className="min-w-0 leading-snug">
                <span className="block text-[15px] font-semibold">
                  Candolim villa with a pool
                </span>
                <span className="tabular block text-[13px] text-muted-foreground">
                  ₹7,000 per head
                </span>
                <span className="mt-0.5 flex items-center gap-1 text-[13px] font-semibold text-truck-red">
                  <CircleAlert
                    aria-hidden
                    strokeWidth={1.8}
                    className="size-4"
                  />
                  Over someone&apos;s budget
                </span>
              </span>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

const STORIES = [
  {
    subject: "dudhsagar",
    big: "Dudhsagar falls trek",
    label: "Most loved place",
    sub: "6 likes and 2 Roses",
    paint: "bg-truck-yellow text-ink",
  },
  {
    subject: "market",
    big: "Meera",
    label: "MVP planner",
    sub: "added the most ideas",
    paint: "bg-truck-red text-wash",
  },
  {
    subject: "bomjesus",
    big: "14 stops",
    label: "Planned together",
    sub: "across 4 days",
    paint: "bg-truck-green-ink text-white",
  },
];

/** Wrapped: three story cards in a row. Each card is a painted board, so Bungee is allowed on it. */
export function WrappedSection() {
  return (
    <section
      id="wrapped"
      aria-labelledby="wrapped-h"
      className={cn(SECTION, ONE_SCREEN)}
    >
      <div className={WRAP}>
        <h2 id="wrapped-h" className={H2}>
          A trip recap your group will want to post
        </h2>
        <p className={INTRO}>
          Back home, Kafila turns the trip into story cards: the most loved
          place, the priciest meal, who planned the most. Save one as an image
          or share it.
        </p>
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {STORIES.map((c, i) => {
            const p = photo(c.subject);
            return (
              <li
                key={c.label}
                className={cn(
                  "chevron-band rounded-md p-2.5",
                  i === 2 && "sm:max-lg:hidden",
                )}
              >
                <div
                  role="img"
                  aria-label={`Trip Wrapped card. ${c.big}, ${c.label}. ${c.sub}.`}
                  className={cn(
                    "flex h-full flex-col overflow-hidden rounded-[3px] border-2 border-ink",
                    c.paint,
                  )}
                >
                  <Image
                    src={p.file}
                    alt=""
                    width={p.width}
                    height={p.height}
                    sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
                    className="aspect-[16/10] w-full border-b-2 border-ink object-cover"
                  />
                  <div className="grid flex-1 content-start gap-1.5 p-5">
                    <p className="font-display text-[26px] leading-[1.05] uppercase xl:text-[30px]">
                      {c.big}
                    </p>
                    <p className="text-[15px] font-semibold">{c.label}</p>
                    <p className="text-[17px] font-medium">{c.sub}</p>
                    <p className="mt-3 text-[13px] font-bold tracking-[0.12em] uppercase">
                      Kafila
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

const FAQ = [
  {
    q: "Isn't this just a trip planner with a bill splitter?",
    a: "Those apps book things and split bills afterwards. Kafila also handles the people: private budgets, a fair plan, saving before the trip and splits by item during it.",
  },
  {
    q: "How does Kafila decide what's fair?",
    a: "Every private budget is a hard limit. Among the plans that fit, it picks the one where the least happy friend scores highest, so the quietest person counts as much as the loudest.",
  },
  {
    q: "Can someone work out who has the lowest budget?",
    a: "The group never receives anyone's budget, only whether a plan fits. In a group of two, Kafila warns you that yours could be guessed.",
  },
  {
    q: "Does Kafila hold our money?",
    a: "No. Payments open your own UPI app. Trip Jar auto-save is a preview for now, and no real money is ever held.",
  },
  {
    q: "Why not plan in the group chat?",
    a: "Keep the chat. Paste it into Kafila and it turns the messages into options the group can vote on.",
  },
  {
    q: "Do my friends need to install an app?",
    a: "No. They open the invite link in a browser and join as a guest with just a name, or with Google.",
  },
];

/** FAQ: the heading on the left, every answer open on the right (native details, so a reader can fold them). */
export function FaqSection() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-h"
      className={cn(SECTION, ONE_SCREEN)}
    >
      <div className={cn(WRAP, "grid gap-8 lg:grid-cols-12 lg:gap-x-6")}>
        <div className="lg:col-span-4">
          <h2 id="faq-h" className={H2}>
            Questions about Kafila
          </h2>
        </div>
        <div className="border-t lg:col-span-7 lg:col-start-6">
          {FAQ.map((f) => (
            <details key={f.q} open className="group border-b py-4">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-[18px] leading-snug font-bold [&::-webkit-details-marker]:hidden">
                {f.q}
                <span
                  aria-hidden
                  className="grid size-6 shrink-0 place-items-center text-[20px] font-medium text-muted-foreground"
                >
                  <span className="group-open:hidden">+</span>
                  <span className="hidden group-open:inline">−</span>
                </span>
              </summary>
              <p className="mt-1 max-w-[62ch] text-[16px] leading-[1.55]">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
