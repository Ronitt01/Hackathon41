// D-7 smart date finder. Pure: dates are "YYYY-MM-DD" strings, all maths in UTC.

export type Holiday = { date: string; name: string };

// Fixed-date holidays are exact; lunar festivals (Holi, Eid, Diwali…) shift every year and are approximate here.
// shortcut: static 2026–2027 list, extend each year (or load the official gazette list) before 2028.
export const HOLIDAYS: Holiday[] = [
  { date: "2026-01-01", name: "New Year" },
  { date: "2026-01-14", name: "Sankranti" },
  { date: "2026-01-26", name: "Republic Day" },
  { date: "2026-03-04", name: "Holi" },
  { date: "2026-03-20", name: "Eid" },
  { date: "2026-04-03", name: "Good Friday" },
  { date: "2026-05-27", name: "Bakrid" },
  { date: "2026-08-15", name: "Independence Day" },
  { date: "2026-09-04", name: "Janmashtami" },
  { date: "2026-10-02", name: "Gandhi Jayanti" },
  { date: "2026-10-20", name: "Dussehra" },
  { date: "2026-11-08", name: "Diwali" },
  { date: "2026-11-24", name: "Guru Nanak Jayanti" },
  { date: "2026-12-25", name: "Christmas" },
  { date: "2027-01-01", name: "New Year" },
  { date: "2027-01-14", name: "Sankranti" },
  { date: "2027-01-26", name: "Republic Day" },
  { date: "2027-03-10", name: "Eid" },
  { date: "2027-03-22", name: "Holi" },
  { date: "2027-03-26", name: "Good Friday" },
  { date: "2027-05-17", name: "Bakrid" },
  { date: "2027-08-15", name: "Independence Day" },
  { date: "2027-08-25", name: "Janmashtami" },
  { date: "2027-10-02", name: "Gandhi Jayanti" },
  { date: "2027-10-09", name: "Dussehra" },
  { date: "2027-10-29", name: "Diwali" },
  { date: "2027-11-14", name: "Guru Nanak Jayanti" },
  { date: "2027-12-25", name: "Christmas" },
];
const HOLIDAY_ON = new Map(HOLIDAYS.map((h) => [h.date, h.name]));

const DAY_MS = 86_400_000;
const ms = (date: string) => Date.parse(`${date}T00:00:00Z`);
export const addDays = (date: string, n: number) => new Date(ms(date) + n * DAY_MS).toISOString().slice(0, 10);
export const isWeekend = (date: string) => [0, 6].includes(new Date(ms(date)).getUTCDay());
export const holidayOn = (date: string) => HOLIDAY_ON.get(date) ?? null;

const fmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
/** "23 Nov" */
export const dayMonth = (date: string) => fmt.format(ms(date));

/** Today's date in India, "YYYY-MM-DD". */
export const todayInIndia = (now = Date.now()) => new Date(now + 5.5 * 3_600_000).toISOString().slice(0, 10);

/** Days of one month for a Monday-first grid: leading nulls, then every date. `month` is 1–12. */
export function monthCells(year: number, month: number): (string | null)[] {
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const lead = (new Date(ms(first)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => addDays(first, i))];
}

export type DateWindow = { start: string; end: string; free: number; total: number; holidays: string[]; longWeekend: boolean; weekendDays: number; reasons: string[] };

/**
 * Top `count` non-overlapping windows of `length` days starting after `today` and ending within `horizon` days.
 * Ranked by (a) members free for the whole window, (b) public holidays inside it (a holiday plus a weekend = long
 * weekend, ranks higher), (c) fewer weekend days (weekday stays are cheaper), then the earliest.
 */
export function bestWindows({
  today,
  length,
  busyByMember,
  horizon = 90,
  count = 3,
}: {
  today: string;
  length: number;
  busyByMember: string[][]; // one entry per active member: their busy dates
  horizon?: number;
  count?: number;
}): DateWindow[] {
  const busy = busyByMember.map((dates) => new Set(dates));
  const total = busy.length;
  const windows: (DateWindow & { score: number })[] = [];
  for (let offset = 1; offset + length - 1 <= horizon; offset++) {
    const days = Array.from({ length }, (_, i) => addDays(today, offset + i));
    const free = busy.filter((set) => !days.some((d) => set.has(d))).length;
    const holidays = [...new Set(days.map(holidayOn).filter((h): h is string => !!h))];
    const weekendDays = days.filter(isWeekend).length;
    // A holiday on a Saturday or Sunday gives no day off, so it can't make a long weekend.
    const longWeekend = weekendDays > 0 && days.some((d) => !!holidayOn(d) && !isWeekend(d));
    const reasons = [
      total === 0 ? null : free === total ? (total === 1 ? "You're free" : `All ${total} free`) : `${free} of ${total} free`,
      holidays.length ? `${holidays.join(" & ")}${longWeekend ? " long weekend" : ""}` : null,
      weekendDays === 0 ? "Weekdays, cheaper stays" : null,
    ].filter((r): r is string => !!r);
    windows.push({ start: days[0], end: days[length - 1], free, total, holidays, longWeekend, weekendDays, reasons, score: holidays.length * 2 + (longWeekend ? 1 : 0) });
  }
  windows.sort((a, b) => b.free - a.free || b.score - a.score || a.weekendDays - b.weekendDays || a.start.localeCompare(b.start));
  const picked: DateWindow[] = [];
  for (const w of windows) {
    if (picked.length === count) break;
    if (picked.every((p) => w.end < p.start || w.start > p.end)) picked.push(w);
  }
  return picked;
}
