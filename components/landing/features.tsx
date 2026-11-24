import Image from "next/image";
import {
  ArrowRight,
  Check,
  CircleCheck,
  CloudRain,
  Flower2,
  Heart,
  Smartphone,
} from "lucide-react";
import { PaintedBoard } from "@/components/kafila/painted-board";
import { ReflectorBar } from "@/components/kafila/reflector-bar";
import { StickerStack } from "@/components/kafila/sticker-avatar";
import { cn } from "@/lib/utils";
import {
  CARD,
  CARD_TEXT,
  CARD_TITLE,
  H2,
  INTRO,
  ONE_SCREEN,
  SECTION,
  WRAP,
  photo,
} from "./kit";

/* Mock controls: they look like the app's, but on this page they are part of a picture, not buttons. */
const ON =
  "inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-truck-green-ink bg-truck-green-ink px-3.5 text-[15px] font-semibold text-white";
const OFF =
  "inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-input bg-card px-3.5 text-[15px] font-semibold";
const INK_BTN =
  "inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-ink px-4 text-[15px] font-semibold text-wash";
const OUTLINE_BTN =
  "inline-flex h-11 items-center justify-center gap-1.5 rounded-lg border bg-card px-4 text-[15px] font-semibold";

/** Decide: a split, the words on the left, one option card on the right as the app shows it. */
export function DecideSection() {
  const p = photo("shack");
  return (
    <section
      id="decide"
      aria-labelledby="decide-h"
      className={cn(SECTION, ONE_SCREEN)}
    >
      <div
        className={cn(
          WRAP,
          "flex flex-1 flex-col gap-8 lg:grid lg:grid-cols-12 lg:gap-x-6",
        )}
      >
        <div className="lg:col-span-5">
          <h2 id="decide-h" className={H2}>
            Vote on the parts of a plan you like
          </h2>
          <p className={INTRO}>
            Heart the parts you like, give one Rose, use one veto. Kafila turns
            it into a group fit score, never shown per person.
          </p>
        </div>

        <article
          role="img"
          aria-label="An option card in Decide: Beach shack dinner, ₹700 per head, group fit 82, fits everyone's budget, with liked parts and your Rose on it."
          className={cn(
            CARD,
            "flex flex-1 flex-col overflow-hidden lg:col-span-6 lg:col-start-7",
          )}
        >
          {/* The photo takes whatever height is left, so the card reaches the section's bottom padding. */}
          <Image
            src={p.file}
            alt=""
            width={p.width}
            height={p.height}
            sizes="(min-width: 1024px) 600px, 100vw"
            className="h-32 w-full flex-auto object-cover"
          />
          <div className="grid gap-3 p-4 md:p-5">
            <div className="grid gap-1">
              <p className="text-[17px] leading-snug font-bold">
                Beach shack dinner
              </p>
              <p className="tabular text-[15px]">
                <span className="font-semibold">₹4,200</span> total
                <span className="text-muted-foreground"> · ₹700 per head</span>
              </p>
            </div>
            <div className="grid grid-cols-[auto_1fr] items-center gap-3">
              <p className="tabular text-[15px] font-bold">Group fit 82</p>
              <ReflectorBar value={82} label="Group fit 82 out of 100" />
            </div>
            <p className="flex items-center gap-1.5 text-[15px] font-semibold text-truck-green-ink">
              <CircleCheck
                aria-hidden
                className="size-[18px]"
                strokeWidth={1.8}
              />
              Fits everyone&apos;s budget
            </p>
            <ul className="divide-y">
              <li className="flex items-center justify-between gap-3 py-1.5">
                <span className="text-[15px]">
                  <span className="font-semibold">Sunset table</span>
                  <span className="text-muted-foreground"> · on the sand</span>
                </span>
                <span className={cn(ON, "min-w-11 px-3")}>
                  <Heart
                    aria-hidden
                    className="size-[18px] fill-current"
                    strokeWidth={1.8}
                  />
                  <span className="tabular">4</span>
                </span>
              </li>
              <li className="flex items-center justify-between gap-3 py-1.5">
                <span className="text-[15px]">
                  <span className="font-semibold">Music</span>
                  <span className="text-muted-foreground"> · till late</span>
                </span>
                <span className={cn(OFF, "min-w-11 px-3")}>
                  <Heart
                    aria-hidden
                    className="size-[18px]"
                    strokeWidth={1.8}
                  />
                  <span className="tabular">2</span>
                </span>
              </li>
            </ul>
            <div className="grid grid-cols-2 gap-2">
              <span className={ON}>
                <Heart
                  aria-hidden
                  className="size-[18px] fill-current"
                  strokeWidth={1.8}
                />
                Liked <span className="tabular">· 5</span>
              </span>
              <span className={ON}>
                <Flower2
                  aria-hidden
                  className="size-[18px]"
                  strokeWidth={1.8}
                />
                Your Rose
              </span>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

const PAYMENTS = [
  { from: "Rohan", to: "Aarav", amount: "₹1,240", mine: false },
  { from: "You", to: "Sana", amount: "₹860", mine: true },
  { from: "Kabir", to: "Aarav", amount: "₹410", mine: false },
];
const ITEMS = [
  { name: "Fish thali × 2", amount: "₹640", who: ["You", "Rohan"] },
  { name: "Veg thali × 3", amount: "₹750", who: ["Meera", "Sana", "Kabir"] },
  {
    name: "Kokum soda × 4",
    amount: "₹240",
    who: ["Aarav", "Meera", "Sana", "Rohan"],
  },
];

/** Money: two cards side by side, the settle-up list wider than the item split. */
export function MoneySection() {
  return (
    <section
      id="money"
      aria-labelledby="money-h"
      className={cn(SECTION, ONE_SCREEN)}
    >
      <div className={cn(WRAP, "flex flex-1 flex-col")}>
        <h2 id="money-h" className={H2}>
          Split by item, settle up on UPI
        </h2>
        <p className={INTRO}>
          Kafila finds the fewest payments, and each one opens your UPI app.
        </p>
        <div className="mt-6 grid gap-3 sm:mt-8 sm:gap-4 lg:mt-10 lg:grid-cols-12 lg:gap-6">
          <article
            className={cn(
              CARD,
              "flex flex-col p-4 sm:p-5 md:p-6 lg:col-span-6 xl:p-8",
            )}
          >
            <h3 className={CARD_TITLE}>UPI settle-up</h3>
            <div
              role="img"
              aria-label="Settle up: Rohan pays Aarav ₹1,240, you pay Sana ₹860 with a Pay with UPI button, Kabir pays Aarav ₹410."
              className="mt-4 divide-y rounded-xl border bg-wash px-4"
            >
              {PAYMENTS.map((t) => (
                <div
                  key={t.from}
                  className="grid gap-2.5 py-2.5"
                >
                  <p className="flex items-baseline justify-between gap-3 text-[15px]">
                    <span>
                      <span className="font-semibold">{t.from}</span>{" "}
                      {t.mine ? "pay" : "pays"}{" "}
                      <span className="font-semibold">{t.to}</span>
                    </span>
                    <span className="tabular font-bold">{t.amount}</span>
                  </p>
                  {t.mine && (
                    <span className="grid grid-cols-2 gap-2">
                      <span className={cn(INK_BTN, "max-sm:px-3")}>
                        <Smartphone
                          aria-hidden
                          strokeWidth={1.8}
                          className="size-[18px] max-sm:hidden"
                        />
                        <span className="sm:hidden">Pay with UPI</span>
                        <span className="max-sm:hidden">
                          Pay {t.amount} with UPI
                        </span>
                      </span>
                      <span className={OUTLINE_BTN}>Mark as paid</span>
                    </span>
                  )}
                </div>
              ))}
            </div>
            {/* The foot of the real settle-up screen: payments already made. */}
            <div
              role="img"
              aria-label="Recent payments: Meera paid Aarav ₹1,500 on 22 Nov."
              className="grid gap-1 pt-6 max-sm:hidden"
            >
              <p className="text-[15px] font-bold">Recent payments</p>
              <p className="flex items-center justify-between gap-3 border-t py-2 text-[15px]">
                <span className="flex items-center gap-1.5">
                  Meera
                  <ArrowRight
                    aria-hidden
                    strokeWidth={1.8}
                    className="size-4 text-muted-foreground"
                  />
                  Aarav
                </span>
                <span className="tabular text-[13px] text-muted-foreground">
                  ₹1,500 · 22 Nov
                </span>
              </p>
            </div>
          </article>

          <article
            className={cn(
              CARD,
              "flex flex-col p-4 sm:p-5 md:p-6 lg:col-span-6 xl:p-8",
            )}
          >
            <h3 className={CARD_TITLE}>Item split</h3>
            <div
              role="img"
              aria-label="Goan thali lunch split by item: two fish thalis for you and Rohan, three veg thalis for Meera, Sana and Kabir, four kokum sodas shared by four."
              className="mt-4 divide-y"
            >
              {ITEMS.map((it) => (
                <div
                  key={it.name}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold">
                      {it.name}
                    </span>
                    <span className="tabular block text-[13px] text-muted-foreground">
                      {it.amount}
                    </span>
                  </span>
                  <StickerStack names={it.who} size="sm" />
                </div>
              ))}
            </div>
            <p className="mt-auto flex items-center gap-1.5 pt-6 text-[15px] font-semibold text-truck-green-ink max-sm:hidden">
              <Check aria-hidden strokeWidth={1.8} className="size-[18px]" />
              <span className="tabular">All ₹1,630 assigned</span>
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

const DEPOSITS = [
  { date: "18 Nov", amount: "₹1,000" },
  { date: "11 Nov", amount: "₹1,000" },
  { date: "4 Nov", amount: "₹900" },
];

const LEVELS = ["Wiped", "Low", "Okay", "Good", "Great"];

/** Trip Jar and the on-trip tools: a split, the Jar standing on the ground left, one card of trip tools right. */
export function TripSection() {
  return (
    <section
      id="trip"
      aria-labelledby="trip-h"
      className={cn(SECTION, ONE_SCREEN)}
    >
      <div className={cn(WRAP, "flex flex-1 flex-col")}>
        <h2 id="trip-h" className={H2}>
          Save before the trip, re-plan during it
        </h2>
        <p className={INTRO}>
          A private jar for your share, then a mood check and a rain plan on the
          trip.
        </p>
        <div className="mt-6 grid gap-3 sm:mt-8 sm:gap-4 lg:mt-10 lg:grid-cols-12 lg:gap-6">
          {/* No card here: the painted board is the box, so it stands on the ground. */}
          <article className="flex flex-col lg:col-span-5 lg:pb-2">
            <PaintedBoard
              note="Your share is ₹6,850"
              className="self-start [&>div]:text-left"
            >
              ₹3,950 to go
            </PaintedBoard>
            <h3 className={cn(CARD_TITLE, "mt-4")}>Trip Jar</h3>
            <p className={CARD_TEXT}>Only you see what you&apos;ve saved.</p>
            <div
              role="img"
              aria-label="Your Trip Jar: ₹2,900 of ₹6,850 saved, 42%. Last deposits: ₹1,000 on 18 Nov, ₹1,000 on 11 Nov, ₹900 on 4 Nov."
              className="mt-4 grid gap-2 lg:mt-6"
            >
              <p className="flex items-baseline justify-between gap-3">
                <span className="tabular">
                  <span className="text-[22px] leading-none font-bold">
                    ₹2,900
                  </span>
                  <span className="text-muted-foreground"> of ₹6,850</span>
                </span>
                <span className="tabular text-[15px] font-semibold">42%</span>
              </p>
              <ReflectorBar value={42} label="Saved 42%" />
              <ul className="mt-2 divide-y max-sm:hidden">
                {DEPOSITS.map((d) => (
                  <li
                    key={d.date}
                    className="flex justify-between py-2.5 text-[15px]"
                  >
                    <span className="text-muted-foreground">{d.date}</span>
                    <span className="tabular font-semibold">{d.amount}</span>
                  </li>
                ))}
              </ul>
            </div>
          </article>

          <div className="grid gap-4 lg:col-span-6 lg:col-start-7 lg:grid-rows-2 lg:gap-6">
            <article className={cn(CARD, "flex flex-col p-4 md:p-6 xl:p-8")}>
              <h3 className={CARD_TITLE}>Mood pulse check-in</h3>
              <p className={cn(CARD_TEXT, "hidden lg:block")}>
                The group sees the average, never your answer.
              </p>
              <div
                role="img"
                aria-label="Energy check-in from 1 to 5 with Good picked, and the group line: mostly good, one friend needs a break."
                className="mt-3 grid gap-2 lg:mt-auto lg:pt-4"
              >
                <span className="grid grid-cols-5 gap-1.5">
                  {LEVELS.map((w, i) => (
                    <span
                      key={w}
                      className={cn(
                        "grid min-h-12 place-items-center rounded-xl border py-1 leading-tight",
                        i === 3
                          ? "border-truck-green-ink bg-truck-green-ink text-white"
                          : "border-input bg-card",
                      )}
                    >
                      <span className="tabular text-[16px] font-bold">
                        {i + 1}
                      </span>
                      <span className="text-[13px] font-semibold">{w}</span>
                    </span>
                  ))}
                </span>
                <span className="text-[13px] text-muted-foreground max-sm:hidden">
                  Group today: mostly good. 1 friend needs a break.
                </span>
              </div>
            </article>

            <article className={cn(CARD, "flex flex-col p-4 md:p-6 xl:p-8")}>
              <h3 className={CARD_TITLE}>Rain re-plan</h3>
              <p className={cn(CARD_TEXT, "hidden lg:block")}>
                Rain at 3 pm? Kafila proposes the rest of the day indoors.
              </p>
              <div
                role="img"
                aria-label="Rain re-plan for 3 pm: Palolem kayaks swapped for the Old Goa churches walk."
                className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border bg-wash p-3 lg:mt-auto"
              >
                <span className="min-w-0 leading-snug">
                  <span className="tabular block text-[13px] font-semibold text-muted-foreground">
                    15:00 · Now
                  </span>
                  <span className="block text-[15px] font-semibold line-through decoration-truck-red">
                    Palolem kayaks
                  </span>
                </span>
                <CloudRain
                  aria-hidden
                  strokeWidth={1.8}
                  className="size-5 text-muted-foreground"
                />
                <span className="min-w-0 leading-snug">
                  <span className="tabular block text-[13px] font-semibold text-truck-green-ink">
                    15:00 · New
                  </span>
                  <span className="block text-[15px] font-semibold">
                    Old Goa churches walk
                  </span>
                </span>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
