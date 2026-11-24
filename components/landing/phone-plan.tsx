import Image from "next/image";
import { CalendarDays, Check, ChevronLeft } from "lucide-react";
import { PaintedBoard } from "@/components/kafila/painted-board";
import { ReflectorBar } from "@/components/kafila/reflector-bar";
import { cn } from "@/lib/utils";
import { photo } from "./kit";

// The demo trip's fair-plan state: six friends, the group minimum at 64%. Scores are anonymous, lowest first.
const SCORES = [64, 71, 78, 84, 88, 93];
const WHY = ["₹1,150 under your budget", "Two café mornings, your top pick", "No starts before 9 am"];
const STOPS = [
  { day: "Day 1", time: "10:00", title: "Check in at Anjuna beach huts", place: "Anjuna", subject: "beach" },
  { day: null, time: "17:30", title: "Sunset at Chapora fort", place: "Vagator", subject: "chapora" },
  { day: "Day 2", time: "09:30", title: "Fontainhas café trail", place: "Panjim", subject: "fontainhas" },
];

// Each block (and itinerary row) shows only when the phone is tall enough to hold it whole, so the panel's foot never
// cuts through a line. Thresholds: the block's bottom edge in the phone + 8px; on a narrow screen (<= 306px) the board
// takes three lines and the card wraps more, so it uses the worst case (a 218px screen). Literal strings for Tailwind.
const FITS = {
  scores: "[@container_(max-height:348px)]:hidden [@container_(max-width:306px)_and_(max-height:373px)]:hidden",
  why: "[@container_(max-height:526px)]:hidden [@container_(max-width:306px)_and_(max-height:591px)]:hidden",
  stops: [
    "[@container_(max-height:640px)]:hidden [@container_(max-width:306px)_and_(max-height:704px)]:hidden",
    "[@container_(max-height:713px)]:hidden [@container_(max-width:306px)_and_(max-height:777px)]:hidden",
    "[@container_(max-height:785px)]:hidden [@container_(max-width:306px)_and_(max-height:850px)]:hidden",
  ],
};

/**
 * The hero's picture is the product: Kafila's Plan tab, rendered as live HTML in a phone frame that runs
 * off the bottom of its panel. One labelled image for assistive tech; nothing inside is interactive.
 */
export function PhonePlan({ className }: { className?: string }) {
  return (
    <div
      role="img"
      aria-label="Kafila's Plan tab for a Goa trip: a painted board says Fits everyone's budget, the group minimum is 64%, your share is ₹6,850, and day 1 starts at Anjuna beach."
      className={cn("[container-type:size]", className)}
    >
      {/* The bezel is a ring (drawn outside the screen, like the Card's ink ring), so the screen is the only box around its UI. */}
      <div className="flex h-full flex-col overflow-hidden rounded-t-[27px] bg-wash ring-[7px] ring-ink">
        <div className="flex h-14 shrink-0 items-center gap-1.5 border-b-4 border-truck-green px-2">
          <span className="grid size-9 place-items-center rounded-full">
            <ChevronLeft aria-hidden className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[17px] leading-tight font-bold">Goa with friends</span>
            <span className="block text-[13px] text-muted-foreground">4 days · 6 friends</span>
          </span>
          <span className="pr-1.5 text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">Kafila</span>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)] content-start gap-3 px-3.5 pt-3.5">
          <PaintedBoard>Fits everyone&apos;s budget</PaintedBoard>

          <div className={cn("grid gap-1.5", FITS.scores)}>
            <p className="text-[15px] leading-snug font-bold">How well it fits everyone</p>
            <ul className="grid grid-cols-[96px_1fr_36px] items-center gap-x-2 gap-y-1">
              {SCORES.map((s, i) => (
                <li key={i} className="col-span-3 grid grid-cols-subgrid items-center">
                  <span className="text-[13px] font-bold">{i === 0 && "Group minimum"}</span>
                  <ReflectorBar value={s} index={i} label={i === 0 ? "Group minimum" : `Friend ${i + 1} of 6`} />
                  <span className="tabular text-right text-[13px] font-semibold">{s}%</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={cn("rounded-xl border bg-card px-3.5 py-3", FITS.why)}>
            <p className="mb-1.5 text-[15px] leading-snug font-bold">Why this works for you</p>
            <ul className="grid gap-1 text-[14px]">
              {WHY.map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <Check aria-hidden strokeWidth={1.8} className="mt-0.5 size-4 shrink-0 text-truck-green-ink" />
                  {line}
                </li>
              ))}
            </ul>
            <p className="mt-2 flex items-baseline justify-between border-t pt-2">
              <span className="text-[14px] text-muted-foreground">Your share</span>
              <strong className="tabular text-[20px] font-bold">₹6,850</strong>
            </p>
          </div>

          <div className={cn("grid grid-cols-[minmax(0,1fr)] gap-1.5 pb-6", FITS.stops[0])}>
            <p className="flex items-center gap-1.5 text-[15px] font-bold">
              <CalendarDays aria-hidden strokeWidth={1.8} className="size-4" />
              Itinerary
            </p>
            <ol className="divide-y rounded-xl border bg-card px-3">
              {STOPS.map((s, i) => {
                const p = photo(s.subject);
                return (
                  <li key={s.title} className={cn("flex items-center gap-3 py-2", i > 0 && FITS.stops[i])}>
                    <Image src={p.file} alt="" width={96} height={96} sizes="48px" className="size-12 shrink-0 rounded-lg object-cover" />
                    <span className="min-w-0 leading-snug">
                      <span className="block text-[13px] font-semibold text-muted-foreground tabular">
                        {s.day ? `${s.day} · ` : ""}
                        {s.time}
                      </span>
                      <span className="block truncate text-[15px] font-semibold">{s.title}</span>
                      <span className="block text-[13px] text-muted-foreground">{s.place}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
