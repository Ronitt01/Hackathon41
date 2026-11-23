import { test } from "node:test";
import assert from "node:assert/strict";
import { progress, streakWeeks, suggestedWeekly, weeksLeft } from "./jar.ts";

test("weeksLeft rounds up and is at least 1", () => {
  assert.equal(weeksLeft("2026-11-23", "2027-01-04"), 6);
  assert.equal(weeksLeft("2026-11-23", "2026-11-24"), 1);
  assert.equal(weeksLeft("2026-11-23", "2026-12-01"), 2);
  assert.equal(weeksLeft("2026-11-23", "2026-11-23"), 1);
  assert.equal(weeksLeft("2026-11-23", "2026-10-01"), 1);
});

test("suggestedWeekly spreads what's left", () => {
  assert.equal(suggestedWeekly(750000, 0, 6), 125000);
  assert.equal(suggestedWeekly(100000, 0, 3), 33334);
  assert.equal(suggestedWeekly(750000, 800000, 6), 0);
  assert.equal(suggestedWeekly(1000, 0, 0), 1000);
});

test("streakWeeks counts consecutive weeks ending this or last week", () => {
  const today = "2026-11-25"; // Wednesday
  assert.equal(streakWeeks([], today), 0);
  assert.equal(streakWeeks(["2026-11-23"], today), 1); // this Monday
  assert.equal(streakWeeks(["2026-11-22"], today), 1); // last Sunday = last week
  assert.equal(streakWeeks(["2026-11-24", "2026-11-17", "2026-11-10", "2026-11-11"], today), 3);
  assert.equal(streakWeeks(["2026-11-17", "2026-11-10"], today), 2); // nothing yet this week
  assert.equal(streakWeeks(["2026-11-24", "2026-11-10"], today), 1); // gap breaks it
  assert.equal(streakWeeks(["2026-11-10"], today), 0); // two weeks ago: streak lost
});

test("progress is a floored, capped percent", () => {
  assert.equal(progress(0, 750000), 0);
  assert.equal(progress(315000, 750000), 42);
  assert.equal(progress(749999, 750000), 99);
  assert.equal(progress(900000, 750000), 100);
  assert.equal(progress(100, 0), 0);
});
