import { test } from "node:test";
import assert from "node:assert/strict";
import { fallbackSuggestions, groupTotalPaise, kindsFor, parseSuggestions, type SuggestInput } from "./suggest.ts";

const goa: SuggestInput = { destination: "Goa", days: 4, people: 6, groupPrefs: {}, existingTitles: [] };

test("no destination suggests where to go; a destination suggests stays, food and activities", () => {
  assert.deepEqual(kindsFor(null), ["destination"]);
  assert.deepEqual(kindsFor("Goa"), ["stay", "food", "activity"]);
});

test("group totals: stays per night, destinations per day, the rest once", () => {
  assert.equal(groupTotalPaise("stay", 1000, 6, 4), 1000 * 100 * 6 * 3); // 4 days = 3 nights
  assert.equal(groupTotalPaise("destination", 2000, 6, 4), 2000 * 100 * 6 * 4);
  assert.equal(groupTotalPaise("food", 500, 6, 4), 500 * 100 * 6);
  assert.equal(groupTotalPaise("stay", 1000, 2, 1), 1000 * 100 * 2); // a day trip still counts one night
});

test("parseSuggestions keeps valid items and drops bad kinds, prices, tags and repeats", () => {
  const raw = {
    suggestions: [
      { kind: "stay", title: "Anjuna beach huts", description: "On the sand.", pricePerPersonInr: 1200, tags: ["beach", "nope", "beach"] },
      { kind: "destination", title: "Gokarna", description: "", pricePerPersonInr: 1500, tags: [] }, // wrong kind once a destination is set
      { kind: "food", title: "Fish thali", description: "", pricePerPersonInr: -5, tags: [] }, // negative price
      { kind: "food", title: "  anjuna BEACH huts ", description: "", pricePerPersonInr: 100, tags: [] }, // repeat
      { kind: "activity", title: "Dudhsagar trek", description: "", pricePerPersonInr: 2000, tags: ["adventure"] },
      { kind: "activity", title: "Old Goa churches", description: "", pricePerPersonInr: 0, tags: ["culture"] },
    ],
  };
  const out = parseSuggestions(raw, { ...goa, existingTitles: ["Old Goa Churches"] });
  assert.deepEqual(out.map((s) => s.title), ["Anjuna beach huts", "Dudhsagar trek"]);
  assert.deepEqual(out[0].tags, ["beach"]);
  assert.equal(out[0].pricePaise, 1200 * 100 * 6 * 3);
  assert.deepEqual(parseSuggestions(null, goa), []);
  assert.deepEqual(parseSuggestions({ suggestions: "x" }, goa), []);
});

test("fallback ranks destinations by the group's likes and skips what's on the board", () => {
  const out = fallbackSuggestions({ ...goa, destination: null, groupPrefs: { culture: 5, beach: -3 }, existingTitles: ["udaipur"] }, 3);
  assert.equal(out.length, 3);
  assert.ok(out.every((s) => s.kind === "destination"));
  assert.equal(out[0].title, "Jaipur"); // culture, with Udaipur already on the board
  assert.ok(!out.some((s) => s.title === "Udaipur"));
});

test("fallback for a destination mixes stays, food and activities named for the place", () => {
  const out = fallbackSuggestions(goa, 9);
  assert.equal(out.length, 9);
  assert.deepEqual(new Set(out.map((s) => s.kind)), new Set(["stay", "food", "activity"]));
  assert.ok(out.some((s) => s.title === "Budget guesthouse in Goa"));
  assert.ok(out.every((s) => s.pricePaise >= 0));
});
