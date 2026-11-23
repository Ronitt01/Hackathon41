// M-3: item-level bill split. All amounts are integer paise.
import { splitByWeights, splitEqually } from "./money.ts";

export type SplitLine = { amount: number; kind: "item" | "tax" | "tip"; claimers: string[] };

/**
 * Each item is split equally among the people who had it; tax and tip are split in proportion to
 * each person's item subtotal. Shares add up EXACTLY to the sum of all lines.
 */
export function splitItems(lines: SplitLine[]): Map<string, number> {
  const shares = new Map<string, number>();
  const add = (id: string, paise: number) => shares.set(id, (shares.get(id) ?? 0) + paise);
  let extras = 0;
  for (const line of lines) {
    if (line.kind !== "item") {
      extras += line.amount;
      continue;
    }
    if (line.claimers.length === 0) throw new Error("Tick who had each item.");
    splitEqually(line.amount, line.claimers.length).forEach((p, i) => add(line.claimers[i], p));
  }
  if (extras > 0) {
    const ids = [...shares.keys()];
    const subtotals = ids.map((id) => shares.get(id)!);
    if (subtotals.every((s) => s === 0)) throw new Error("Add item amounts before tax or tip.");
    splitByWeights(extras, subtotals).forEach((p, i) => add(ids[i], p));
  }
  return shares;
}
