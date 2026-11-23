// T-2: turns mood_summary() aggregates into the words the group sees. Never takes names or member ids.

export type MoodSummary = { avg_energy: number | string | null; checkins: number; need_break: number; low_cash: number };

/** mood_summary() hides the average below this many check-ins so one person can't be singled out. */
export const MIN_CHECKINS = 3;

const people = (n: number) => (n === 1 ? "Someone" : `${n} people`);

/** The painted-board verdict for today (+ optional note under it). */
export function moodVerdict(s: MoodSummary | null): { board: string; note?: string } {
  if (s && s.need_break > 0) return { board: s.need_break === 1 ? "Someone needs a break" : `${s.need_break} people need a break`, note: "Slow down or re-plan the rest of today" };
  const avg = s?.avg_energy == null ? null : Number(s.avg_energy);
  if (avg === null) return { board: "How's everyone feeling?", note: "Tap your energy for today" };
  if (avg >= 4) return { board: "Group's feeling great" };
  if (avg >= 3) return { board: "Group's doing okay" };
  return { board: "Group's running low", note: "A slower afternoon might help" };
}

/** "Average energy 3.4", or why it's hidden. */
export function averageLine(s: MoodSummary | null): string {
  const n = s?.checkins ?? 0;
  if (s?.avg_energy != null && n >= MIN_CHECKINS) return `Average energy ${Number(s.avg_energy).toFixed(1)} of 5`;
  return `The average shows once ${MIN_CHECKINS} people check in (${n} so far), so no one's answer can be singled out.`;
}

/** Anonymous signal lines: "Someone needs a break", "2 people are low on cash". */
export function signalLines(s: MoodSummary | null): string[] {
  if (!s) return [];
  const lines: string[] = [];
  if (s.need_break > 0) lines.push(`${people(s.need_break)} ${s.need_break === 1 ? "needs" : "need"} a break`);
  if (s.low_cash > 0) lines.push(`${people(s.low_cash)} ${s.low_cash === 1 ? "is" : "are"} low on cash`);
  return lines;
}
