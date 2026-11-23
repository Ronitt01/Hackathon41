// W-1 Trip Wrapped: pure maths over group-visible data only (never budgets, prefs, jars or satisfaction).
import { inr } from "./money.ts";

export type WrappedInput = {
  trip: { start_date: string | null; end_date: string | null };
  members: { id: string; display_name: string }[]; // active members only
  expenses: { title: string; amount_paise: number; category: string; created_by: string | null }[];
  stops: { day: number }[]; // active plan's stops
  options: { id: string; title: string; created_by: string | null; vetoed_at: string | null }[];
  reactions: { option_id: string; kind: "like" | "rose" }[]; // whole-option reactions
};

export type WrappedCard = { id: string; eyebrow: string; big: string; sub: string };

const CATEGORY_LABEL: Record<string, string> = {
  food: "food", stay: "stays", travel: "travel", activity: "activities", shopping: "shopping", other: "other stuff",
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
// Whole rupees: paise make the big numbers too wide for a phone card.
const rupees = (paise: number) => inr(Math.round(paise / 100) * 100);

/** Days between two "YYYY-MM-DD" dates, inclusive. */
function daySpan(start: string, end: string): number {
  return Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1;
}

export function wrappedCards({ trip, members, expenses, stops, options, reactions }: WrappedInput): WrappedCard[] {
  const cards: WrappedCard[] = [];
  const total = expenses.reduce((sum, e) => sum + e.amount_paise, 0);

  if (total > 0) {
    const people = Math.max(members.length, 1);
    cards.push({
      id: "total",
      eyebrow: "Spent together",
      big: rupees(total),
      sub: people > 1 ? `That's about ${rupees(total / people)} each for ${people} of you` : "Every rupee, tracked",
    });
  }

  const food = expenses.filter((e) => e.category === "food");
  if (food.length) {
    const top = food.reduce((a, b) => (b.amount_paise > a.amount_paise ? b : a));
    cards.push({ id: "meal", eyebrow: "Priciest meal", big: rupees(top.amount_paise), sub: top.title });
  }

  if (total > 0) {
    const byCategory = new Map<string, number>();
    for (const e of expenses) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount_paise);
    const [category, amount] = [...byCategory].reduce((a, b) => (b[1] > a[1] ? b : a));
    cards.push({
      id: "category",
      eyebrow: "Where the money went",
      big: `${Math.round((amount * 100) / total)}%`,
      sub: `went on ${CATEGORY_LABEL[category] ?? category} (${rupees(amount)})`,
    });
  }

  const love = new Map<string, { likes: number; roses: number }>();
  for (const r of reactions) {
    const c = love.get(r.option_id) ?? { likes: 0, roses: 0 };
    if (r.kind === "like") c.likes += 1;
    else c.roses += 1;
    love.set(r.option_id, c);
  }
  const score = (id: string) => (love.get(id)?.likes ?? 0) + 3 * (love.get(id)?.roses ?? 0);
  // Vetoed ideas still count toward MVP, but the group ruled them out as places.
  const loved = options.filter((o) => !o.vetoed_at).reduce<(typeof options)[number] | null>((best, o) => (score(o.id) > (best ? score(best.id) : 0) ? o : best), null);
  if (loved) {
    const { likes, roses } = love.get(loved.id)!;
    const counts = [likes && plural(likes, "like"), roses && plural(roses, "rose")].filter(Boolean).join(" · ");
    cards.push({ id: "loved", eyebrow: "Most loved place", big: loved.title, sub: counts });
  }

  if (stops.length) {
    const fromDates = trip.start_date && trip.end_date ? daySpan(trip.start_date, trip.end_date) : 0;
    const days = Math.max(fromDates, ...stops.map((s) => s.day));
    cards.push({ id: "plan", eyebrow: "Planned together", big: plural(stops.length, "stop"), sub: `across ${plural(days, "day")}` });
  }

  const made = new Map<string, number>();
  for (const row of [...options, ...expenses]) if (row.created_by) made.set(row.created_by, (made.get(row.created_by) ?? 0) + 1);
  const mvp = members.reduce<{ name: string; n: number } | null>((best, m) => {
    const n = made.get(m.id) ?? 0;
    return n > (best?.n ?? 0) ? { name: m.display_name, n } : best;
  }, null);
  if (mvp) {
    cards.push({ id: "mvp", eyebrow: "MVP planner", big: mvp.name, sub: `did the most planning, with ${plural(mvp.n, "addition")} to ideas and expenses` });
  }

  return cards;
}

/** Plain-text recap for sharing in the group chat. */
export function wrappedSummary(tripName: string, cards: WrappedCard[]): string {
  return [`${tripName} — Trip Wrapped`, ...cards.map((c) => `${c.eyebrow}: ${c.big}${c.sub ? ` (${c.sub})` : ""}`), "Made with Kafila"].join("\n");
}
