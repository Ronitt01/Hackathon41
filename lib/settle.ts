// M-5: debt-minimised settle-up. All amounts are integer paise.

export type Transfer = { from: string; to: string; amount: number };

/**
 * Greedy min-cash-flow: repeatedly the largest debtor pays the largest creditor min(debt, credit).
 * Every transfer zeroes at least one person, so N non-zero balances settle in ≤ N−1 transfers.
 * Balance > 0 = the group owes them; < 0 = they owe the group.
 */
export function minimiseTransfers(balances: { id: string; balance: number }[]): Transfer[] {
  if (!balances.every((b) => Number.isSafeInteger(b.balance))) throw new Error("minimiseTransfers: balances must be integer paise");
  if (balances.reduce((a, b) => a + b.balance, 0) !== 0) throw new Error("minimiseTransfers: balances must add up to 0");

  const debtors = balances.filter((b) => b.balance < 0).map((b) => ({ id: b.id, left: -b.balance }));
  const creditors = balances.filter((b) => b.balance > 0).map((b) => ({ id: b.id, left: b.balance }));
  const transfers: Transfer[] = [];
  const largestFirst = (a: { left: number }, b: { left: number }) => b.left - a.left; // stable sort keeps input order on ties

  while (debtors.length && creditors.length) {
    debtors.sort(largestFirst);
    creditors.sort(largestFirst);
    const d = debtors[0];
    const c = creditors[0];
    const amount = Math.min(d.left, c.left);
    transfers.push({ from: d.id, to: c.id, amount });
    d.left -= amount;
    c.left -= amount;
    if (d.left === 0) debtors.shift();
    if (c.left === 0) creditors.shift();
  }
  return transfers;
}
