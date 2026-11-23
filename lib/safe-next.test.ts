import { test } from "node:test";
import assert from "node:assert/strict";
import { safeNext } from "./safe-next.ts";

test("keeps same-site paths", () => {
  assert.equal(safeNext("/trips/abc"), "/trips/abc");
  assert.equal(safeNext("/join/xyz?x=1"), "/join/xyz?x=1");
});

test("rejects anything that could leave the site", () => {
  for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "evil.com", "", null, undefined]) {
    assert.equal(safeNext(bad), "/");
  }
});
