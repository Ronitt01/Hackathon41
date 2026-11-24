import Image from "next/image";
import Link from "next/link";
import { CircleAlert, CircleCheck, Eye, Lock } from "lucide-react";
import { ReflectorBar } from "@/components/kafila/reflector-bar";
import { cn } from "@/lib/utils";
import {
  BTN_PRIMARY,
  CARD,
  CARD_TEXT,
  CARD_TITLE,
  H2,
  INTRO,
  NAV_LINK,
  ONE_SCREEN,
  SECTION,
  WRAP,
  photo,
} from "./kit";

const OPTIONS = [
  { name: "Palolem beach huts", price: "₹3,200 per head" },
  { name: "Assagao homestay", price: "₹4,500 per head" },
];

/** Privacy: what only you see and what the group sees, each shown as the screen that shows it. */
export function PrivacySection() {
  const villa = photo("villa");
  return (
    <section
      id="privacy"
      aria-labelledby="privacy-h"
      className={cn(SECTION, "min-h-[200svh] lg:min-h-svh")}
    >
      <div className={cn(WRAP, "flex flex-1 flex-col")}>
        <h2 id="privacy-h" className={H2}>
          What stays private, and what the group sees
        </h2>
        <p className={INTRO}>
          Budgets are locked in the database, not only hidden on screen.
        </p>
        {/* Phone: the group card takes its content's height and the only-you panel spreads over the rest of the two screens. */}
        <div className="mt-10 grid flex-1 grid-rows-[1fr_auto] gap-6 lg:grid-cols-2 lg:grid-rows-1">
          <article className={cn(CARD, "flex flex-col p-6 xl:p-8")}>
            <h3 className={cn(CARD_TITLE, "flex items-center gap-2")}>
              <Lock aria-hidden strokeWidth={1.8} className="size-5" />
              Only you see
            </h3>
            <p className={CARD_TEXT}>
              Your budget, your savings and how well a plan fits you.
            </p>
            <div
              role="img"
              aria-label="Your private panel: budget ₹12,000, Trip Jar ₹4,050 saved of ₹12,000, and the villa fits you 58 out of 100. Only you can see this."
              className="mt-6 flex flex-1 flex-col justify-between gap-5 rounded-xl bg-wash p-4 md:p-5"
            >
              <span className="grid gap-1.5">
                <span className="text-[15px] font-semibold">
                  Your budget for this trip
                </span>
                <span className="flex h-11 items-center justify-between rounded-lg border border-input bg-card px-3 text-[17px] font-bold">
                  <span className="tabular">₹12,000</span>
                  <Lock aria-hidden strokeWidth={1.8} className="size-4" />
                </span>
              </span>
              <span className="grid gap-1.5">
                <span className="flex justify-between gap-3 text-[15px]">
                  <span className="font-semibold">Your Trip Jar</span>
                  <span className="tabular">₹4,050 of ₹12,000</span>
                </span>
                <ReflectorBar value={34} label="Trip Jar 34% saved" />
              </span>
              <span className="grid gap-1.5">
                <span className="flex justify-between gap-3 text-[15px]">
                  <span className="font-semibold">Villa fits you</span>
                  <span className="tabular">58</span>
                </span>
                <ReflectorBar
                  value={58}
                  index={1}
                  label="Villa fits you 58 out of 100"
                />
              </span>
              <span className="flex items-center gap-1.5 text-[15px] text-muted-foreground">
                <Lock aria-hidden strokeWidth={1.8} className="size-4" />
                Only you can see this.
              </span>
            </div>
          </article>

          <article className={cn(CARD, "flex flex-col p-6 xl:p-8")}>
            <h3 className={cn(CARD_TITLE, "flex items-center gap-2")}>
              <Eye aria-hidden strokeWidth={1.8} className="size-5" />
              The group sees
            </h3>
            <p className={CARD_TEXT}>
              Whether a plan fits everyone, never whose budget it breaks.
            </p>
            <div className="mt-6 flex flex-col overflow-hidden rounded-xl bg-wash lg:flex-1">
              <div
                role="img"
                aria-label="An option, Candolim villa with a pool at ₹7,000 per head, marked Over someone's budget without saying whose."
                className="flex flex-col lg:flex-1"
              >
              {/* Phones keep the photo's 4:3 so it isn't upscaled; desktop lets it fill the card's leftover height. */}
              <span className="relative aspect-[4/3] lg:aspect-auto lg:min-h-28 lg:flex-1">
                <Image
                  src={villa.file}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 540px, 100vw"
                  className="object-cover"
                />
              </span>
              <span className="grid gap-1 p-4 md:p-5">
                <span className="text-[17px] leading-snug font-bold">
                  Candolim villa with a pool
                </span>
                <span className="tabular text-[15px]">₹7,000 per head</span>
                <span className="mt-1 flex items-center gap-1.5 text-[15px] font-semibold text-truck-red">
                  <CircleAlert
                    aria-hidden
                    strokeWidth={1.8}
                    className="size-[18px]"
                  />
                  Over someone&apos;s budget
                </span>
              </span>
              </div>
              {/* Phones have the second screen's room for the rest of the group's list. */}
              <ul className="lg:hidden">
                {OPTIONS.map((o) => (
                  <li key={o.name} className="grid gap-1 border-t p-4 md:p-5">
                    <span className="text-[17px] leading-snug font-bold">
                      {o.name}
                    </span>
                    <span className="tabular text-[15px]">{o.price}</span>
                    <span className="mt-1 flex items-center gap-1.5 text-[15px] font-semibold text-truck-green-ink">
                      <CircleCheck
                        aria-hidden
                        strokeWidth={1.8}
                        className="size-[18px]"
                      />
                      Fits everyone
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-auto pt-3">
              <a href="#how" className={NAV_LINK}>
                How Kafila finds a fair plan
              </a>
            </p>
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

/** Wrapped: story cards in a row (two below lg). Each card is a painted board, so Bungee is allowed on it. */
export function WrappedSection() {
  return (
    <section
      id="wrapped"
      aria-labelledby="wrapped-h"
      className={cn(SECTION, "min-h-[200svh] lg:min-h-svh lg:pb-[72px]")}
    >
      <div className={cn(WRAP, "flex flex-1 flex-col")}>
        <h2 id="wrapped-h" className={H2}>
          A trip recap your group will want to post
        </h2>
        <p className={INTRO}>
          Back home, Kafila turns the trip into story cards: the most loved
          place, who planned the most. Save one or share it.
        </p>
        <Link href="/start" className={cn(BTN_PRIMARY, "mt-6 self-start")}>
          Start a trip
        </Link>
        <ul className="mt-10 grid flex-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {STORIES.map((c, i) => {
            const p = photo(c.subject);
            return (
              <li
                key={c.label}
                className={cn(
                  "chevron-band rounded-md p-2.5",
                  i === 2 && "max-lg:hidden",
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
                  {/* The photo grows to fill the card, so the cards reach the section's bottom padding. */}
                  <Image
                    src={p.file}
                    alt=""
                    width={p.width}
                    height={p.height}
                    sizes="(min-width: 1024px) 480px, (min-width: 640px) 50vw, 100vw"
                    className="aspect-[16/10] min-h-0 w-full flex-auto object-cover lg:aspect-[16/9]"
                  />
                  <div className="grid gap-1.5 p-5">
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
    q: "Isn't this just a bill splitter?",
    a: "It also keeps budgets private and picks a plan that fits everyone.",
  },
  {
    q: "Can someone guess the lowest budget?",
    a: "The group never sees a budget, only if a plan fits. Pairs get a warning.",
  },
  {
    q: "Does Kafila hold our money?",
    a: "No. Payments open your own UPI app.",
  },
  {
    q: "Do my friends need the app?",
    a: "No. They open the invite link and join as a guest.",
  },
];

/** FAQ: the heading and the invite screen on the left, the answers on the right (on the page's k=6 split line). */
export function FaqSection() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-h"
      className={cn(SECTION, ONE_SCREEN)}
    >
      <div
        className={cn(
          WRAP,
          "grid flex-1 grid-rows-[auto_auto_1fr] gap-y-8 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-6",
        )}
      >
        <h2 id="faq-h" className={cn(H2, "lg:col-span-6")}>
          Questions about Kafila
        </h2>
        <dl className="grid content-start gap-6 lg:col-span-6 lg:col-start-7 lg:row-span-2 lg:row-start-1 lg:gap-10">
          {FAQ.map((f) => (
            <div key={f.q}>
              <dt className="text-[18px] leading-snug font-bold">{f.q}</dt>
              <dd className="mt-1 max-w-[62ch] text-[16px] leading-[1.5]">
                {f.a}
              </dd>
            </div>
          ))}
        </dl>
        {/* The real invite screen, as a friend sees it: no install, just a name. */}
        <div
          role="img"
          aria-label="Kafila's invite page in a browser: You're invited, a Your name field filled in with Riya, and a Join trip button."
          className={cn(
            CARD,
            "grid w-full max-w-[420px] gap-3 self-end p-4 lg:col-span-5 lg:row-start-2 lg:max-w-[480px] lg:gap-4 lg:p-6",
          )}
        >
          <span className="flex items-center gap-3">
            <Image
              src="/illustrations/chai.svg"
              alt=""
              width={160}
              height={160}
              className="size-14 shrink-0 lg:size-20"
            />
            <span className="grid gap-0.5">
              <span className="text-[20px] leading-tight font-bold">
                You&apos;re invited
              </span>
              <span className="text-[15px] text-muted-foreground">
                Your friends saved you a seat.
              </span>
            </span>
          </span>
          <span className="grid gap-1.5">
            <span className="text-[15px] font-semibold">Your name</span>
            <span className="flex h-11 items-center rounded-lg border border-input bg-card px-3 text-[16px]">
              Riya
            </span>
          </span>
          <span className="flex h-11 items-center justify-center rounded-lg bg-ink text-[15px] font-semibold text-wash">
            Join trip
          </span>
        </div>
      </div>
    </section>
  );
}
