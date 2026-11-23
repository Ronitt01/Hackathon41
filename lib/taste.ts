// W-2 group taste profile: stop ratings from a previous trip → a small boost per tag. Pure.

export type RatedStop = { rating: number; tags: string[] };

/** Tags the group rated 4+ on average → weight 0.5 (avg 4) … 1 (avg 5). Other tags get nothing. */
export function tasteWeights(rows: RatedStop[]): Record<string, number> {
  const sum: Record<string, { total: number; n: number }> = {};
  for (const r of rows) {
    if (!Number.isInteger(r.rating) || r.rating < 1 || r.rating > 5) continue;
    for (const tag of new Set(r.tags)) {
      const s = (sum[tag] ??= { total: 0, n: 0 });
      s.total += r.rating;
      s.n++;
    }
  }
  const out: Record<string, number> = {};
  for (const [tag, { total, n }] of Object.entries(sum)) {
    const avg = total / n;
    if (avg >= 4) out[tag] = (avg - 3) / 2;
  }
  return out;
}

/** Tag ids the group loved, strongest first. */
export const lovedTags = (weights: Record<string, number>) => Object.entries(weights).sort((a, b) => b[1] - a[1]).map(([t]) => t);
