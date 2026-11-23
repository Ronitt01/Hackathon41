import { test } from "node:test";
import assert from "node:assert/strict";
import { checkProposal, fallbackReplan, isAhead, istNow, pairWithExisting, parseReplanStops, rainChance, todayDay, type ReplanStop } from "./replan.ts";

const stop = (startsAt: string | null, title: string, kind: ReplanStop["kind"] = "activity", tags: string[] = []): ReplanStop => ({
  startsAt, title, kind, tags, costPaise: 50000, locationName: null, branch: null,
});
const day = [stop("11:00", "Baga beach", "activity", ["beach"]), stop("13:00", "Lunch", "food"), stop("16:00", "Fort walk", "activity", ["culture"]), stop("20:30", "Night market", "activity", ["shopping"])];

test("istNow uses India time", () => {
  assert.deepEqual(istNow(new Date("2026-11-23T20:00:00Z")), { today: "2026-11-24", time: "01:30" });
});

test("todayDay: on the trip → that day, otherwise Day 1 in full", () => {
  assert.deepEqual(todayDay("2026-11-22", "2026-11-25", "2026-11-23"), { day: 2, live: true });
  assert.deepEqual(todayDay("2026-12-01", "2026-12-03", "2026-11-23"), { day: 1, live: false });
  assert.deepEqual(todayDay("2026-11-01", "2026-11-03", "2026-11-23"), { day: 1, live: false });
  assert.deepEqual(todayDay(null, null, "2026-11-23"), { day: 1, live: false });
});

test("isAhead skips past stops only when live", () => {
  assert.equal(isAhead("10:00:00", "12:00", true), false);
  assert.equal(isAhead("13:00:00", "12:00", true), true);
  assert.equal(isAhead(null, "12:00", true), true);
  assert.equal(isAhead("10:00:00", "12:00", false), true);
});

test("rain swaps only outdoor activities, keeping times", () => {
  const { stops, note } = fallbackReplan(day, "rain", 0, "10:00");
  assert.equal(stops.length, 4);
  assert.equal(stops[0].startsAt, "11:00");
  assert.notEqual(stops[0].title, "Baga beach");
  assert.ok(!stops[0].tags.includes("beach"));
  assert.deepEqual(stops.slice(1), day.slice(1));
  assert.match(note, /1 outdoor stop/);
  assert.match(fallbackReplan(day.slice(1), "rain", 0, "10:00").note, /already works/);
});

test("delay shifts timed stops and drops ones past 23:00", () => {
  const { stops, note } = fallbackReplan([...day, stop(null, "Souvenirs")], "delay", 180, "10:00");
  assert.deepEqual(stops.map((s) => s.startsAt), ["14:00", "16:00", "19:00", null]);
  assert.match(note, /180 min later; 1 stop no longer/);
});

test("tired: rest first, one activity, meals kept, nothing overlapping", () => {
  const { stops } = fallbackReplan(day, "tired", 0, "10:10");
  assert.equal(stops[0].title, "Rest at the stay");
  assert.equal(stops[0].startsAt, "10:30");
  assert.equal(stops.filter((s) => s.kind === "activity").length, 1);
  assert.ok(stops.some((s) => s.title === "Lunch"));
  const times = stops.map((s) => s.startsAt!);
  assert.deepEqual(times, [...times].sort());
  assert.ok(times[1] >= "12:00"); // 90 min of rest
});

test("parseReplanStops validates and sorts", () => {
  const ok = parseReplanStops([
    { title: " Lunch ", kind: "food", startsAt: "13:00", costPaise: 1200, tags: ["veg", "made-up"], locationName: "" },
    { title: "Museum", kind: "activity", startsAt: "10:00", costPaise: -5, tags: [], locationName: "Panaji" },
  ]);
  assert.deepEqual(ok, [
    { title: "Museum", kind: "activity", startsAt: "10:00", costPaise: 0, tags: [], locationName: "Panaji", branch: null },
    { title: "Lunch", kind: "food", startsAt: "13:00", costPaise: 1200, tags: ["veg"], locationName: null, branch: null },
  ]);
  assert.equal(parseReplanStops([]), null);
  assert.equal(parseReplanStops([{ title: "x", kind: "party" }]), null);
  assert.equal(parseReplanStops([{ title: "", kind: "food" }]), null);
  assert.equal(parseReplanStops("nope"), null);
  assert.equal(parseReplanStops([{ title: "x", kind: "food", startsAt: "25:00" }])?.[0].startsAt, null);
});

test("rainChance takes the max over the rest of today", () => {
  const times = ["2026-11-23T09:00", "2026-11-23T14:00", "2026-11-23T18:00", "2026-11-24T10:00"];
  assert.equal(rainChance(times, [90, 40, 70, 100], "2026-11-23", "14:20"), 70);
  assert.equal(rainChance(times, [90, null, null, 100], "2026-11-23", "14:20"), null);
});

const split: ReplanStop[] = [
  { ...stop("11:00", "Baga beach", "activity", ["beach"]), branch: "A" },
  { ...stop("11:00", "Fort walk", "activity", ["culture"]), branch: "B" },
  stop("14:00", "Lunch", "food"),
];

test("split day: delay and rain keep each stop's group", () => {
  assert.deepEqual(fallbackReplan(split, "delay", 60, "10:00").stops.map((s) => [s.startsAt, s.branch]), [["12:00", "A"], ["12:00", "B"], ["15:00", null]]);
  assert.deepEqual(fallbackReplan(split, "rain", 0, "10:00").stops.map((s) => s.branch), ["A", "B", null]);
  assert.deepEqual(parseReplanStops([{ title: "x", kind: "food", branch: "B" }, { title: "y", kind: "food", branch: "C" }])?.map((s) => s.branch), ["B", null]);
});

test("checkProposal drops repeats of fixed stops and moves past times up to now", () => {
  const out = checkProposal([stop("09:00", "Museum"), stop("15:00", "sunset cruise"), stop(null, "Souvenirs")], [{ title: "Sunset Cruise", kind: "activity" }], "12:30");
  assert.deepEqual(out.map((s) => [s.startsAt, s.title]), [["12:30", "Museum"], [null, "Souvenirs"]]);
  assert.equal(checkProposal([stop("09:00", "Museum")], [], null)[0].startsAt, "09:00");
});

test("pairWithExisting matches by title and kind, each row once", () => {
  const rows = [{ id: "1", title: "Lunch", kind: "food" }, { id: "2", title: "Lunch", kind: "food" }, { id: "3", title: "Fort walk", kind: "activity" }];
  const pairs = pairWithExisting([stop("13:00", "Lunch", "food"), stop("14:00", "lunch", "food"), stop("15:00", "Lunch", "food"), stop("16:00", "Fort walk", "food")], rows);
  assert.deepEqual(pairs.map((r) => r?.id ?? null), ["1", "2", null, null]);
});
