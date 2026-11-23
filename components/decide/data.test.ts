import { test } from "node:test";
import assert from "node:assert/strict";
import { reactionsOn, type Reaction } from "./data.ts";

const r = (id: string, option_id: string, aspect_id: string | null, kind: Reaction["kind"]): Reaction => ({
  id, option_id, aspect_id, member_id: "m", kind,
});

test("reactionsOn keeps option-level and aspect-level likes apart", () => {
  const all = [r("1", "o1", null, "like"), r("2", "o1", "a1", "like"), r("3", "o1", null, "rose"), r("4", "o2", null, "like")];
  assert.deepEqual(reactionsOn(all, "o1", null, "like").map((x) => x.id), ["1"]);
  assert.deepEqual(reactionsOn(all, "o1", "a1", "like").map((x) => x.id), ["2"]);
  assert.deepEqual(reactionsOn(all, "o1", null, "rose").map((x) => x.id), ["3"]);
  assert.deepEqual(reactionsOn(all, "o3", null, "like"), []);
});
