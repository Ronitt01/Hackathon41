import { test } from "node:test";
import assert from "node:assert/strict";
import { claimAction, duplicateNote, groupPacking, itemKey, unclaimAction } from "./packing.ts";

const rows = [
  { id: "1", name: "Speaker", member_id: "a" },
  { id: "2", name: "  speaker ", member_id: "b" },
  { id: "3", name: "Umbrella", member_id: null },
  { id: "4", name: "Snacks", member_id: "a" },
  { id: "5", name: "Snacks", member_id: "a" },
  { id: "6", name: "Power bank", member_id: null },
  { id: "7", name: "power  BANK", member_id: "c" },
];

test("itemKey ignores case and extra spaces", () => {
  assert.equal(itemKey("  Power   Bank "), "power bank");
});

test("groupPacking merges same names in first-seen order with distinct claimers", () => {
  const items = groupPacking(rows);
  assert.deepEqual(items.map((i) => i.name), ["Speaker", "Umbrella", "Snacks", "Power bank"]);
  assert.deepEqual(items[0].claimers, ["a", "b"]);
  assert.deepEqual(items[1].claimers, []);
  assert.deepEqual(items[2].claimers, ["a"]); // same person twice is not a duplicate
  assert.deepEqual(items[3].rows.map((r) => r.id), ["6", "7"]);
});

test("duplicateNote flags 2+ different people, with a sensible article", () => {
  const [speaker, umbrella, snacks] = groupPacking(rows);
  assert.equal(duplicateNote(speaker), "2 people are bringing a speaker");
  assert.equal(duplicateNote(umbrella), null);
  assert.equal(duplicateNote(snacks), null);
  const umbrellas = groupPacking([
    { id: "x", name: "Umbrella", member_id: "a" },
    { id: "y", name: "umbrella", member_id: "b" },
    { id: "z", name: "Umbrella", member_id: "c" },
  ]);
  assert.equal(duplicateNote(umbrellas[0]), "3 people are bringing an umbrella");
  const cards = groupPacking([{ id: "x", name: "Cards", member_id: "a" }, { id: "y", name: "cards", member_id: "b" }]);
  assert.equal(duplicateNote(cards[0]), "2 people are bringing cards");
});

test("claimAction takes the open row, else inserts, and is a no-op if already mine", () => {
  const [speaker, umbrella, , powerBank] = groupPacking(rows);
  assert.deepEqual(claimAction(umbrella, "a"), { kind: "take", id: "3" });
  assert.deepEqual(claimAction(speaker, "c"), { kind: "insert" });
  assert.equal(claimAction(speaker, "a"), null);
  assert.deepEqual(claimAction(powerBank, "a"), { kind: "take", id: "6" });
});

test("unclaimAction releases the last row and deletes extra ones", () => {
  const [speaker, umbrella] = groupPacking(rows);
  assert.deepEqual(unclaimAction(speaker, "b"), { kind: "delete", id: "2" });
  assert.equal(unclaimAction(umbrella, "a"), null);
  const solo = groupPacking([{ id: "9", name: "Torch", member_id: "a" }]);
  assert.deepEqual(unclaimAction(solo[0], "a"), { kind: "release", id: "9" });
});
