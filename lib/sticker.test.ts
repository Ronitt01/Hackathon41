import { test } from "node:test";
import assert from "node:assert/strict";
import { initials, nameHash, stickerPaint, stickerTilt } from "./sticker.ts";

test("hash is stable and ignores case and outer spaces", () => {
  assert.equal(nameHash("Meera"), nameHash("  meera "));
  assert.notEqual(nameHash("Meera"), nameHash("Kabir"));
});

test("tilt stays in −6..6 and is deterministic", () => {
  for (const n of ["Aarav", "Meera", "Kabir", "Sana", "", "ज़ोया", "a very long name indeed"]) {
    const t = stickerTilt(n);
    assert.ok(Number.isInteger(t) && t >= -6 && t <= 6, `${n}: ${t}`);
    assert.equal(stickerTilt(n), t);
  }
});

test("paint index covers all four paints across names", () => {
  const seen = new Set(Array.from({ length: 40 }, (_, i) => stickerPaint(`friend ${i}`)));
  assert.deepEqual([...seen].sort(), [0, 1, 2, 3]);
});

test("initials", () => {
  assert.equal(initials("Meera Iyer"), "MI");
  assert.equal(initials("Aarav Kumar Shah"), "AS");
  assert.equal(initials("kabir"), "KA");
  assert.equal(initials("  "), "?");
  assert.equal(initials("Z"), "Z");
});
