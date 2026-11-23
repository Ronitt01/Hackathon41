// Trip Jar (M-1) maths. Dates are "YYYY-MM-DD" calendar days; money is integer paise.

const DAY = 86_400_000;
const dayNumber = (date: string) => Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY);
// Monday-start week index (1970-01-01 was a Thursday, so shift by 3 days).
const weekNumber = (date: string) => Math.floor((dayNumber(date) + 3) / 7);

/** Whole weeks left until booking day, rounded up, never less than 1. */
export function weeksLeft(today: string, bookingDate: string): number {
  return Math.max(1, Math.ceil((dayNumber(bookingDate) - dayNumber(today)) / 7));
}

/** Weekly amount that reaches the goal in time: ceil(remaining / weeks). 0 once the goal is reached. */
export function suggestedWeekly(goal: number, saved: number, weeks: number): number {
  return Math.ceil(Math.max(0, goal - saved) / Math.max(1, weeks));
}

/** Consecutive Monday-start weeks with a deposit, ending this week (or last week, if this week has none yet). */
export function streakWeeks(depositDates: string[], today: string): number {
  const weeks = new Set(depositDates.map(weekNumber));
  let week = weekNumber(today);
  if (!weeks.has(week)) week -= 1;
  let streak = 0;
  while (weeks.has(week - streak)) streak += 1;
  return streak;
}

/** Whole percent saved, 0–100 (floored, so 100 means the goal is really reached). */
export function progress(saved: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(100, Math.max(0, Math.floor((saved * 100) / goal)));
}
