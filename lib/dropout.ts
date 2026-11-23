// M-8 dropout recalculator: pure maths. The route loads the numbers (some private) and never returns them.

export type Traveller = { travelPaise: number; budgetPaise: number | null };

/** Same rounding as lib/fairness: each person's share of the shared (group) cost. */
export function perHead(sharedPaise: number, people: number): number {
  return people > 0 ? Math.round(sharedPaise / people) : 0;
}

/**
 * Cost change when the group shrinks from `before` people to `remaining`.
 * fitsEveryone: every remaining member's own travel + new share is within their budget (no budget = fits).
 * totals[i] is remaining[i]'s new personal cost, for plan_members.
 */
export function dropoutImpact(sharedPaise: number, before: number, remaining: Traveller[]) {
  const oldPerHead = perHead(sharedPaise, before);
  const newPerHead = perHead(sharedPaise, remaining.length);
  const totals = remaining.map((m) => m.travelPaise + newPerHead);
  return {
    oldPerHead,
    newPerHead,
    deltaPaise: newPerHead - oldPerHead,
    fitsEveryone: remaining.every((m, i) => !m.budgetPaise || totals[i] <= m.budgetPaise),
    totals,
  };
}
