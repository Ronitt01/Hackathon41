import assert from "node:assert/strict";
import { test } from "node:test";
import { revealCards } from "./reveal-cards.ts";

test("stamps match the counts when every card is drawn", () => {
  const r = revealCards(5, 2);
  assert.equal(r.shown, 5);
  assert.equal(r.stamped.length, 2);
  assert.notEqual(r.winner, null);
  assert.ok(!r.stamped.includes(r.winner!));
  assert.equal(new Set(r.stamped).size, 2);
});

test("no fit stamps every drawn card and picks none", () => {
  assert.deepEqual(revealCards(9, 9).stamped.length, 6);
  assert.equal(revealCards(9, 9).winner, null);
  assert.deepEqual(revealCards(0, 0), { shown: 0, stamped: [], winner: null });
});

test("scaling down keeps one stamp and one survivor", () => {
  assert.equal(revealCards(40, 1).stamped.length, 1); // rounds to 0 without the floor
  assert.equal(revealCards(40, 39).stamped.length, 5); // rounds to 6 without the cap
  assert.equal(revealCards(12, 0).stamped.length, 0);
});
