import { test } from "node:test";
import assert from "node:assert/strict";
import { lovedTags, tasteWeights } from "./taste.ts";

test("tasteWeights: only tags averaging 4+ get a 0.5–1 weight", () => {
  const w = tasteWeights([
    { rating: 5, tags: ["beach", "nightlife"] },
    { rating: 4, tags: ["beach"] },
    { rating: 2, tags: ["nightlife", "culture"] },
    { rating: 5, tags: ["cafes", "cafes"] }, // duplicate tag counts once
    { rating: 9, tags: ["culture"] }, // invalid rating ignored
  ]);
  assert.deepEqual(w, { beach: 0.75, cafes: 1 });
  assert.deepEqual(lovedTags(w), ["cafes", "beach"]);
  assert.deepEqual(tasteWeights([]), {});
});
