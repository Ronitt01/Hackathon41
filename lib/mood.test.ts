import { test } from "node:test";
import assert from "node:assert/strict";
import { averageLine, moodVerdict, signalLines } from "./mood.ts";

const s = (avg: number | string | null, checkins: number, need_break = 0, low_cash = 0) => ({ avg_energy: avg, checkins, need_break, low_cash });

test("verdict: a break request beats the average", () => {
  assert.equal(moodVerdict(s(4.5, 5, 1)).board, "Someone needs a break");
  assert.equal(moodVerdict(s(4.5, 5, 2)).board, "2 people need a break");
});

test("verdict follows the average, or asks when hidden", () => {
  assert.equal(moodVerdict(s("4.2", 4)).board, "Group's feeling great"); // numeric can arrive as a string
  assert.equal(moodVerdict(s(3.4, 4)).board, "Group's doing okay");
  assert.equal(moodVerdict(s(2.1, 4)).board, "Group's running low");
  assert.equal(moodVerdict(s(null, 2)).board, "How's everyone feeling?");
  assert.equal(moodVerdict(null).board, "How's everyone feeling?");
});

test("average is shown only from 3 check-ins, with the reason otherwise", () => {
  assert.equal(averageLine(s(3.4, 3)), "Average energy 3.4 of 5");
  assert.match(averageLine(s(null, 2)), /once 3 people check in \(2 so far\)/);
  assert.match(averageLine(null), /\(0 so far\)/);
});

test("signals are counts, never names", () => {
  assert.deepEqual(signalLines(s(null, 0, 1, 2)), ["Someone needs a break", "2 people are low on cash"]);
  assert.deepEqual(signalLines(s(null, 0, 0, 1)), ["Someone is low on cash"]);
  assert.deepEqual(signalLines(s(null, 0)), []);
});
