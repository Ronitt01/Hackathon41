// Pure itinerary helpers (C-2). Dates are "YYYY-MM-DD" strings from Postgres `date` columns.

const DAY_MS = 86_400_000;
const utc = (date: string) => new Date(`${date}T00:00:00Z`).getTime();
const shortDate = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

/** Days to show: the longest of the trip's date range, the highest stop day, and 1. */
export function dayCount(start: string | null, end: string | null, stopDays: number[]): number {
  const tripDays = start && end ? Math.round((utc(end) - utc(start)) / DAY_MS) + 1 : 0;
  return Math.max(tripDays, ...stopDays, 1);
}

/** "Day 3 · 14 Dec" when the trip has a start date, else "Day 3". */
export function dayLabel(day: number, start: string | null): string {
  return start ? `Day ${day} · ${shortDate.format(utc(start) + (day - 1) * DAY_MS)}` : `Day ${day}`;
}

type Ordered = { id: string; position: number; starts_at: string | null };

/** Within a day: by position, then start time (untimed last). */
export function byPosition(a: Ordered, b: Ordered): number {
  return a.position - b.position || (a.starts_at ?? "99").localeCompare(b.starts_at ?? "99");
}

/** Rows whose position must change so `ordered` becomes dense 0..n-1 in its current order. */
export function positionUpdates(ordered: Pick<Ordered, "id" | "position">[]): { id: string; position: number }[] {
  return ordered.flatMap((s, i) => (s.position === i ? [] : [{ id: s.id, position: i }]));
}

// Lives here (not in the "use client" component) so the server page can import it as a plain string.
export const STOP_COLUMNS = "id, day, position, starts_at, title, kind, location_name, cost_paise, tags, locked";
