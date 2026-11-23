import { test } from "node:test";
import assert from "node:assert/strict";
import { byPosition, dayCount, dayLabel, positionUpdates } from "./days.ts";

test("dayCount takes the max of date range, stop days and 1", () => {
  assert.equal(dayCount(null, null, []), 1);
  assert.equal(dayCount("2026-12-12", "2026-12-14", []), 3);
  assert.equal(dayCount("2026-12-12", "2026-12-14", [5]), 5);
  assert.equal(dayCount("2026-12-30", "2027-01-02", [1]), 4); // across year end
  assert.equal(dayCount("2026-12-12", null, [2]), 2);
});

test("dayLabel adds the date only with a start date", () => {
  assert.equal(dayLabel(1, null), "Day 1");
  assert.equal(dayLabel(1, "2026-12-12"), "Day 1 · 12 Dec");
  assert.equal(dayLabel(21, "2026-12-12"), "Day 21 · 1 Jan");
});

test("byPosition sorts by position then time, untimed last", () => {
  const rows = [
    { id: "c", position: 1, starts_at: null },
    { id: "b", position: 0, starts_at: null },
    { id: "a", position: 0, starts_at: "09:00:00" },
  ];
  assert.deepEqual(rows.sort(byPosition).map((r) => r.id), ["a", "b", "c"]);
});

test("positionUpdates densifies and only touches changed rows", () => {
  assert.deepEqual(positionUpdates([{ id: "a", position: 0 }, { id: "b", position: 1 }]), []);
  // after a swap
  assert.deepEqual(positionUpdates([{ id: "b", position: 1 }, { id: "a", position: 0 }]), [
    { id: "b", position: 0 },
    { id: "a", position: 1 },
  ]);
  // after a delete left a gap
  assert.deepEqual(positionUpdates([{ id: "a", position: 0 }, { id: "c", position: 2 }]), [{ id: "c", position: 1 }]);
});
