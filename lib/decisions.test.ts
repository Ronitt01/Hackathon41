import { test } from "node:test";
import assert from "node:assert/strict";
import { countdown, fallbackCompromise, leaders, rankOptions, vetoAllowance } from "./decisions.ts";

test("vetoAllowance: 2 by default, 3 for trips over 5 days", () => {
  assert.equal(vetoAllowance(null, null), 2);
  assert.equal(vetoAllowance("2026-12-01", "2026-12-05"), 2); // 5 days
  assert.equal(vetoAllowance("2026-12-01", "2026-12-06"), 3); // 6 days
});

test("rankOptions: likes + 3×Roses, whole-option only, vetoed dropped", () => {
  const options = [
    { id: "a", title: "A" },
    { id: "b", title: "B" },
    { id: "c", title: "C", vetoed_at: "2026-11-23T10:00:00Z" },
  ];
  const r = (option_id: string, kind: string, aspect_id: string | null = null) => ({ option_id, kind, aspect_id });
  const ranked = rankOptions(options, [r("a", "like"), r("a", "like"), r("b", "rose"), r("a", "like", "asp"), r("c", "rose")]);
  assert.deepEqual(ranked.map((x) => [x.id, x.score]), [["b", 3], ["a", 2]]);
  assert.deepEqual(leaders(ranked).map((x) => x.id), ["b"]);
});

test("leaders returns every tied option, empty for none", () => {
  const ranked = rankOptions([{ id: "a", title: "A" }, { id: "b", title: "B" }], []);
  assert.deepEqual(leaders(ranked).map((x) => x.id), ["a", "b"]);
  assert.deepEqual(leaders([]), []);
});

test("countdown formats and expires", () => {
  const now = Date.parse("2026-11-23T10:00:00Z");
  assert.equal(countdown("2026-11-23T12:10:00Z", now), "locks in 2h 10m");
  assert.equal(countdown("2026-11-23T10:05:00Z", now), "locks in 5m");
  assert.equal(countdown("2026-11-25T13:00:00Z", now), "locks in 2d 3h");
  assert.equal(countdown("2026-11-23T10:00:00Z", now), null);
  assert.equal(countdown("not a date", now), null);
});

test("fallbackCompromise names the tied options", () => {
  assert.equal(fallbackCompromise(["Goa", "Gokarna"]), "Goa + Gokarna: split the time between them");
});
