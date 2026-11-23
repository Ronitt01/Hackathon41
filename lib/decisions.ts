// D-4 veto allowance and D-5 deadlock breaker: ranking, countdown, tie-break fallback. Pure, no I/O.
import { tripDays } from "./plan-candidates.ts";

/** 2 vetoes per member, 3 when the trip is longer than 5 days. */
export function vetoAllowance(start: string | null, end: string | null): number {
  return start && end && tripDays(start, end) > 5 ? 3 : 2;
}

export type RankInput = { id: string; title: string; vetoed_at?: string | null };
export type ReactionInput = { option_id: string; aspect_id: string | null; kind: string };
export type Ranked = { id: string; title: string; likes: number; roses: number; score: number };

/** Non-vetoed options ranked by likes + 3×Roses on the whole option. Ties keep input order. */
export function rankOptions(options: RankInput[], reactions: ReactionInput[]): Ranked[] {
  return options
    .filter((o) => !o.vetoed_at)
    .map((o) => {
      const on = (kind: string) => reactions.filter((r) => r.option_id === o.id && r.aspect_id === null && r.kind === kind).length;
      const likes = on("like"), roses = on("rose");
      return { id: o.id, title: o.title, likes, roses, score: likes + 3 * roses };
    })
    .sort((a, b) => b.score - a.score);
}

/** The options sharing the top score (empty when there are none). One entry = a clear winner. */
export function leaders(ranked: Ranked[]): Ranked[] {
  return ranked.filter((r) => r.score === ranked[0]?.score);
}

/** "locks in 2h 10m" style; null once the deadline has passed. */
export function countdown(deadline: string, now: number): string | null {
  const mins = Math.ceil((Date.parse(deadline) - now) / 60_000);
  if (!(mins > 0)) return null;
  const d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), m = mins % 60;
  if (d > 0) return `locks in ${d}d${h ? ` ${h}h` : ""}`;
  if (h > 0) return `locks in ${h}h${m ? ` ${m}m` : ""}`;
  return `locks in ${m}m`;
}

/** Tie-break line when Claude isn't available: a fair "do both" between the tied titles. */
export function fallbackCompromise(titles: string[]): string {
  return `${titles.slice(0, 3).join(" + ")}: split the time between them`.slice(0, 120);
}
