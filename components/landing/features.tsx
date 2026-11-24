import Image from "next/image";
import {
  Ban,
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
const CHIP =
  "inline-flex items-center rounded-full border border-ink bg-card px-2.5 text-[13px] leading-6 font-semibold";
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
      <div className={cn(WRAP, "grid gap-10 lg:grid-cols-12 lg:gap-x-6")}>
        <div className="lg:col-span-5">
          <h2 id="decide-h" className={H2}>
            Vote on the parts of a plan you like
          </h2>
          <p className={INTRO}>
            Friends add stays, food and days out. Everyone hearts the parts they
            like, and Kafila turns the likes into a group fit score that is
            never shown per person.
          </p>
          <ul className="mt-8 grid gap-4 text-[16px]">
            <li className="flex gap-3">
              <Heart
                aria-hidden
                strokeWidth={1.8}
                className="mt-0.5 size-5 shrink-0 text-ink"
              />
              Like the pool and skip the price, part by part.
            </li>
            <li className="flex gap-3">
              <Flower2
                aria-hidden
                strokeWidth={1.8}
                className="mt-0.5 size-5 shrink-0 text-ink"
              />
              One Rose each, for the option you want most.
            </li>
            <li className="flex gap-3">
              <Ban
                aria-hidden
                strokeWidth={1.8}
                className="mt-0.5 size-5 shrink-0 text-ink"
              />
              One veto each, with or without your name.
            </li>
          </ul>
        </div>

        <article
          role="img"
          aria-label="An option card in Decide: Beach shack dinner, ₹700 per head, group fit 82, fits everyone's budget, with liked parts and your Rose on it."
          className={cn(CARD, "overflow-hidden lg:col-span-6 lg:col-start-7")}
        >
          <Image
            src={p.file}
            alt=""
            width={p.width}
            height={p.height}
            sizes="(min-width: 1024px) 600px, 100vw"
            className="h-44 w-full object-cover xl:h-52"
          />
          <div className="grid gap-3 p-4 md:p-5">
            <div className="grid gap-1.5">
              <span className={cn(CHIP, "justify-self-start")}>Food</span>
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
            <ul className="divide-y border-y">
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
  const p = photo("thali");
  return (
    <section
      id="money"
      aria-labelledby="money-h"
      className={cn(SECTION, ONE_SCREEN)}
    >
      <div className={WRAP}>
        <h2 id="money-h" className={H2}>
          Settle up in the fewest payments
        </h2>
        <p className={INTRO}>
          Split a bill by who ate what. Kafila works out the fewest payments to
          square everyone up, and each one opens your UPI app with the amount
          filled in.
        </p>
        <div className="mt-10 grid gap-6 lg:grid-cols-12">
          <article className={cn(CARD, "p-6 lg:col-span-7 xl:p-8")}>
            <h3 className={CARD_TITLE}>Pay in one tap</h3>
            <p className={CARD_TEXT}>
              Three payments square up six friends after four days of shared
              bills.
            </p>
            <div
              role="img"
              aria-label="Settle up: Rohan pays Aarav ₹1,240, you pay Sana ₹860 with a Pay with UPI button, Kabir pays Aarav ₹410."
              className="mt-6 divide-y rounded-xl border bg-wash px-4"
            >
              {PAYMENTS.map((t) => (
                <div key={t.from} className="grid gap-3 py-3">
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
                      <span className={INK_BTN}>
                        <Smartphone
                          aria-hidden
                          strokeWidth={1.8}
                          className="size-[18px]"
                        />
                        Pay {t.amount} with UPI
                      </span>
                      <span className={OUTLINE_BTN}>Mark as paid</span>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </article>

          <article className={cn(CARD, "overflow-hidden lg:col-span-5")}>
            <Image
              src={p.file}
              alt=""
              width={p.width}
              height={p.height}
              sizes="(min-width: 1024px) 480px, 100vw"
              className="h-32 w-full object-cover xl:h-36"
            />
            <div className="p-6 xl:px-8">
              <h3 className={CARD_TITLE}>Split by item</h3>
              <p className={CARD_TEXT}>
                Everyone ticks what they had. Tax is shared the same way.
              </p>
              <div
                role="img"
                aria-label="Goan thali lunch split by item: two fish thalis for you and Rohan, three veg thalis for Meera, Sana and Kabir, four kokum sodas shared by four."
                className="mt-4 divide-y border-y"
              >
                {ITEMS.map((it) => (
                  <div
                    key={it.name}
                    className="flex items-center justify-between gap-3 py-2"
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
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

const LEVELS = ["Wiped", "Low", "Okay", "Good", "Great"];

/** Trip Jar and the on-trip tools: a bento, the Jar tall on the left, two tools stacked on the right. */
export function TripSection() {
  return (
    <section
      id="trip"
      aria-labelledby="trip-h"
      className={cn(SECTION, ONE_SCREEN)}
    >
      <div className={WRAP}>
        <h2 id="trip-h" className={H2}>
          Save before the trip, re-plan during it
        </h2>
        <p className={INTRO}>
          A private Trip Jar for your share, then a daily mood check and a rain
          plan once you&apos;re there.
        </p>
        <div className="mt-10 grid gap-6 lg:grid-cols-12 lg:grid-rows-2">
          <article
            className={cn(
              CARD,
              "flex flex-col p-6 lg:col-span-5 lg:row-span-2 xl:p-8",
            )}
          >
            <h3 className={CARD_TITLE}>Trip Jar</h3>
            <p className={CARD_TEXT}>
              Put a little aside each week toward your share. Only you see what
              you&apos;ve saved.
            </p>
            <div
              role="img"
              aria-label="Your Trip Jar: ₹3,950 to go, ₹2,900 of ₹6,850 saved."
              className="mt-auto grid gap-4 pt-6"
            >
              <PaintedBoard note="Your share is ₹6,850">
                ₹3,950 to go
              </PaintedBoard>
              <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                <ReflectorBar value={42} label="Saved 42%" />
                <span className="tabular text-[13px] font-semibold">
                  ₹2,900 saved
                </span>
              </div>
            </div>
          </article>

          <article className={cn(CARD, "p-6 lg:col-span-7 xl:px-8")}>
            <h3 className={CARD_TITLE}>Mood pulse</h3>
            <p className={CARD_TEXT}>
              Rate your energy each morning. The group sees the average, never
              your answer.
            </p>
            <div
              role="img"
              aria-label="Energy check-in from 1 to 5 with Good picked, and the group line: mostly good, one friend needs a break."
              className="mt-4 grid gap-2"
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
              <span className="text-[13px] text-muted-foreground">
                Group today: mostly good. 1 friend needs a break.
              </span>
            </div>
          </article>

          <article className={cn(CARD, "p-6 lg:col-span-7 xl:px-8")}>
            <h3 className={CARD_TITLE}>Rain plan</h3>
            <p className={CARD_TEXT}>
              Rain at 3 pm? Kafila proposes the rest of the day indoors.
            </p>
            <div
              role="img"
              aria-label="Rain re-plan for 3 pm: Palolem kayaks swapped for the Old Goa churches walk."
              className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border bg-wash p-3"
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
    </section>
  );
}
