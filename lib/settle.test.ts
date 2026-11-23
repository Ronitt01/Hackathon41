import { test } from "node:test";
import assert from "node:assert/strict";
import { minimiseTransfers, type Transfer } from "./settle.ts";

type Balance = { id: string; balance: number };

/** Applies transfers (payer's balance goes up, payee's goes down) and returns what's left. */
function afterTransfers(balances: Balance[], transfers: Transfer[]): Record<string, number> {
  const left = Object.fromEntries(balances.map((b) => [b.id, b.balance]));
  for (const t of transfers) {
    left[t.from] += t.amount;
    left[t.to] -= t.amount;
  }
  return left;
}

function assertSettles(balances: Balance[]) {
  const transfers = minimiseTransfers(balances);
  const nonZero = balances.filter((b) => b.balance !== 0).length;
  assert.ok(transfers.length <= Math.max(nonZero - 1, 0), `${transfers.length} transfers for ${nonZero} people`);
  for (const t of transfers) {
    assert.ok(Number.isSafeInteger(t.amount) && t.amount > 0);
    assert.notEqual(t.from, t.to);
  }
  for (const v of Object.values(afterTransfers(balances, transfers))) assert.equal(v, 0);
  return transfers;
}

test("already settled → no transfers", () => {
  assert.deepEqual(minimiseTransfers([]), []);
  assert.deepEqual(minimiseTransfers([{ id: "a", balance: 0 }, { id: "b", balance: 0 }]), []);
});

test("two people: debtor pays creditor", () => {
  assert.deepEqual(minimiseTransfers([{ id: "a", balance: 5000 }, { id: "b", balance: -5000 }]), [{ from: "b", to: "a", amount: 5000 }]);
});

test("6-person trip settles in ≤ 5 payments, largest debtor ↔ largest creditor first", () => {
  const balances = [
    { id: "aarav", balance: 500000 },
    { id: "bela", balance: 300000 },
    { id: "chirag", balance: -200000 },
    { id: "diya", balance: -200000 },
    { id: "esha", balance: -300000 },
    { id: "farhan", balance: -100000 },
  ];
  assert.deepEqual(assertSettles(balances), [
    { from: "esha", to: "aarav", amount: 300000 },
    { from: "chirag", to: "bela", amount: 200000 },
    { from: "diya", to: "aarav", amount: 200000 },
    { from: "farhan", to: "bela", amount: 100000 },
  ]);
});

test("ignores zero balances", () => {
  const t = assertSettles([{ id: "a", balance: 0 }, { id: "b", balance: 1 }, { id: "c", balance: -1 }]);
  assert.deepEqual(t, [{ from: "c", to: "b", amount: 1 }]);
});

test("random trips always cancel exactly in ≤ N−1 transfers", () => {
  let seed = 42;
  const rand = (n: number) => ((seed = (seed * 1103515245 + 12345) % 2 ** 31), seed % n);
  for (let run = 0; run < 500; run++) {
    const n = 2 + rand(11);
    const balances = Array.from({ length: n - 1 }, (_, i) => ({ id: `m${i}`, balance: rand(2000001) - 1000000 }));
    balances.push({ id: `m${n - 1}`, balance: -balances.reduce((a, b) => a + b.balance, 0) });
    assertSettles(balances);
  }
});

test("rejects balances that don't add up or aren't whole paise", () => {
  assert.throws(() => minimiseTransfers([{ id: "a", balance: 100 }, { id: "b", balance: -99 }]), /add up to 0/);
  assert.throws(() => minimiseTransfers([{ id: "a", balance: 0.5 }, { id: "b", balance: -0.5 }]), /integer paise/);
});
