"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addDays, bestWindows, dayMonth, holidayOn, monthCells } from "@/lib/dates";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/supabase/auth";

type Busy = { member_id: string; busy_on: string };

const HORIZON = 90;
const WEEKDAYS = [["M", "Monday"], ["T", "Tuesday"], ["W", "Wednesday"], ["T", "Thursday"], ["F", "Friday"], ["S", "Saturday"], ["S", "Sunday"]];
const monthName = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
const fullDay = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const at = (date: string) => Date.parse(`${date}T00:00:00Z`);

/** D-7: members tap the days they're busy; the next 90 days are ranked into the 3 best windows for the trip. */
export function BestDates({
  tripId,
  myMemberId,
  memberIds,
  isOrganizer,
  today,
  length,
  current,
  initial,
}: {
  tripId: string;
  myMemberId: string;
  memberIds: string[]; // active members
  isOrganizer: boolean;
  today: string;
  length: number;
  current: { start: string | null; end: string | null };
  initial: Busy[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(initial);
  const [month, setMonth] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const last = addDays(today, HORIZON);
  const [y, m] = today.split("-").map(Number);
  const months = Array.from({ length: 4 }, (_, i) => [y + Math.floor((m - 1 + i) / 12), ((m - 1 + i) % 12) + 1]).filter(
    ([yy, mm]) => `${yy}-${String(mm).padStart(2, "0")}` <= last.slice(0, 7),
  );
  const [year, mon] = months[month];
  const counted = busy.filter((b) => memberIds.includes(b.member_id)); // dropped-out members no longer count
  const mine = new Set(busy.filter((b) => b.member_id === myMemberId).map((b) => b.busy_on));
  const othersBusy = (date: string) => counted.filter((b) => b.busy_on === date && b.member_id !== myMemberId).length;
  const windows = bestWindows({ today, length, busyByMember: memberIds.map((id) => counted.filter((b) => b.member_id === id).map((b) => b.busy_on)) });

  async function toggle(date: string) {
    setError(null);
    const supabase = createClient();
    const was = mine.has(date);
    setBusy((all) => (was ? all.filter((b) => !(b.member_id === myMemberId && b.busy_on === date)) : [...all, { member_id: myMemberId, busy_on: date }]));
    const { error } = was
      ? await supabase.from("availability").delete().eq("member_id", myMemberId).eq("busy_on", date)
      : await supabase.from("availability").insert({ member_id: myMemberId, trip_id: tripId, busy_on: date });
    // Re-read so the ranking also picks up what friends marked meanwhile.
    // shortcut: availability isn't in the Realtime publication, so others' marks arrive on this re-read or a reload.
    const { data } = await supabase.from("availability").select("member_id, busy_on").eq("trip_id", tripId);
    if (data) setBusy(data);
    if (error) setError(errorMessage(error));
  }

  async function use(start: string, end: string) {
    setError(null);
    setSaving(start);
    const { error } = await createClient().from("trips").update({ start_date: start, end_date: end }).eq("id", tripId);
    setSaving(null);
    if (error) return setError(errorMessage(error));
    router.refresh();
  }

  return (
    <section className="grid gap-3" aria-labelledby="best-dates">
      <div>
        <h2 id="best-dates" className="text-[17px] leading-snug font-bold">Best dates</h2>
        <p className="text-[13px] text-muted-foreground">
          Tap the days you can&apos;t make it. We look for {length} days in the next {HORIZON} that suit the most people.
        </p>
      </div>

      <div className="grid gap-1 rounded-xl border bg-card p-2">
        <div className="flex items-center justify-between">
          <Button variant="ghost" className="size-11 px-0" aria-label="Previous month" disabled={month === 0} onClick={() => setMonth(month - 1)}>
            <ChevronLeft aria-hidden strokeWidth={1.8} className="size-5" />
          </Button>
          <h3 className="font-semibold" aria-live="polite">{monthName.format(Date.UTC(year, mon - 1, 1))}</h3>
          <Button variant="ghost" className="size-11 px-0" aria-label="Next month" disabled={month === months.length - 1} onClick={() => setMonth(month + 1)}>
            <ChevronRight aria-hidden strokeWidth={1.8} className="size-5" />
          </Button>
        </div>
        <div className="grid grid-cols-7 justify-items-center text-[12px] font-semibold text-muted-foreground" aria-hidden>
          {WEEKDAYS.map(([short, long]) => (
            <span key={long}>{short}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 justify-items-center gap-y-0.5">
          {monthCells(year, mon).map((date, i) => {
            if (!date) return <span key={`blank-${i}`} />;
            const holiday = holidayOn(date);
            const others = othersBusy(date);
            const isMine = mine.has(date);
            const label = [fullDay.format(at(date)), holiday, others > 0 && `${others} ${others === 1 ? "friend" : "friends"} busy`].filter(Boolean).join(", ");
            return (
              <button
                key={date}
                type="button"
                aria-pressed={isMine}
                aria-label={label}
                disabled={date <= today || date > last}
                onClick={() => toggle(date)}
                className={`relative grid size-11 place-items-center rounded-full text-[15px] tabular disabled:text-muted-foreground/60 ${
                  isMine ? "bg-truck-green-ink font-semibold text-white" : "hover:bg-muted"
                } ${holiday ? "font-bold underline decoration-2 underline-offset-4" : ""}`}
              >
                {Number(date.slice(8))}
                {others > 0 && (
                  <span aria-hidden className={`absolute top-0.5 right-0.5 text-[10px] leading-none font-bold ${isMine ? "text-white" : "text-muted-foreground"}`}>
                    {others}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="px-1 pb-1 text-[12px] text-muted-foreground">
          Green: you&apos;re busy. Small number: friends busy. Underlined: public holiday.
        </p>
      </div>
      {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}

      {windows.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">No {length}-day window fits in the next {HORIZON} days.</p>
      ) : (
        <ol className="grid" aria-label="Top date windows">
          {windows.map((w) => {
            const isCurrent = current.start === w.start && current.end === w.end;
            return (
              <li key={w.start} className="flex items-center gap-3 border-t py-2">
                <div className="min-w-0 flex-1">
                  <p className="tabular font-semibold">{dayMonth(w.start)} – {dayMonth(w.end)}</p>
                  <p className="text-[13px] text-muted-foreground">{w.reasons.join(" · ")}</p>
                </div>
                {isCurrent ? (
                  <span className="text-[13px] font-semibold text-truck-green-ink">Trip dates</span>
                ) : (
                  isOrganizer && (
                    <Button variant="outline" className="bg-card" disabled={saving !== null} onClick={() => use(w.start, w.end)}>
                      {saving === w.start ? "Saving…" : "Use these dates"}
                    </Button>
                  )
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
