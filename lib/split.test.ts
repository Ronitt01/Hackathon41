import { test } from "node:test";
import assert from "node:assert/strict";
import { splitItems } from "./split.ts";

const total = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0);

test("PRD case: two friends skip the drinks and pay nothing toward them", () => {
  const all = ["a", "b", "c", "d"];
  const shares = splitItems([
    { amount: 120000, kind: "item", claimers: all }, // food ₹1,200 — everyone
    { amount: 80000, kind: "item", claimers: ["a", "b"] }, // drinks ₹800 — only a and b
    { amount: 10000, kind: "tax", claimers: [] }, // ₹100 tax, by item subtotal
    { amount: 10000, kind: "tip", claimers: [] }, // ₹100 tip, by item subtotal
  ]);
  // subtotals: a,b = 30000 + 40000 = 70000; c,d = 30000. Extras 20000 split 7:7:3:3.
  assert.deepEqual(Object.fromEntries(shares), { a: 77000, b: 77000, c: 33000, d: 33000 });
  assert.equal(total(shares), 220000);
  // c and d pay exactly their food share plus proportional tax/tip — nothing toward the drinks
  assert.equal(shares.get("c"), 30000 + 3000);
});

test("odd paise still add up exactly", () => {
  const shares = splitItems([
    { amount: 1001, kind: "item", claimers: ["a", "b", "c"] },
    { amount: 333, kind: "item", claimers: ["c"] },
    { amount: 77, kind: "tax", claimers: [] },
  ]);
  assert.equal(total(shares), 1411);
  for (const v of shares.values()) assert.ok(Number.isSafeInteger(v));
});

test("items only, no extras", () => {
  assert.deepEqual(Object.fromEntries(splitItems([{ amount: 500, kind: "item", claimers: ["x"] }])), { x: 500 });
});

test("rejects an item nobody had, and tax with no items", () => {
  assert.throws(() => splitItems([{ amount: 500, kind: "item", claimers: [] }]), /Tick who had/);
  assert.throws(() => splitItems([{ amount: 0, kind: "item", claimers: ["a"] }, { amount: 50, kind: "tip", claimers: [] }]), /before tax or tip/);
});
