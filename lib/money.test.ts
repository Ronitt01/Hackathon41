import { test } from "node:test";
import assert from "node:assert/strict";
import { inr, splitByWeights, splitEqually, toPaise } from "./money.ts";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

test("inr formats with Indian grouping", () => {
  assert.equal(inr(750000), "₹7,500");
  assert.equal(inr(10000000), "₹1,00,000");
  assert.equal(inr(12550), "₹125.50");
});

test("toPaise parses rupee input", () => {
  assert.equal(toPaise("1,250.5"), 125050);
  assert.equal(toPaise("₹ 1250"), 125000);
  assert.equal(toPaise("0.05"), 5);
  for (const bad of ["", "-5", "1.234", "abc", "1e5"]) assert.equal(toPaise(bad), null);
});

test("splits always add up exactly", () => {
  assert.deepEqual(splitEqually(100000, 3), [33334, 33333, 33333]);
  assert.equal(sum(splitEqually(100001, 7)), 100001);
  assert.deepEqual(splitByWeights(1000, [1, 3]), [250, 750]);
  assert.equal(sum(splitByWeights(999, [2, 2, 3])), 999);
  assert.throws(() => splitByWeights(100, [0, 0]));
});
