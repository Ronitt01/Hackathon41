import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidVpa, upiLink } from "./upi.ts";

test("upiLink builds an intent with exactly 2 decimals and encoded values", () => {
  assert.equal(
    upiLink({ vpa: "aarav.k@okicici", name: "Aarav K", amountPaise: 125050, note: "Goa & beach" }),
    "upi://pay?pa=aarav.k%40okicici&pn=Aarav%20K&am=1250.50&cu=INR&tn=Goa%20%26%20beach",
  );
  assert.match(upiLink({ vpa: "a1@ybl", name: "B", amountPaise: 750000, note: "x" }), /&am=7500\.00&/);
  assert.match(upiLink({ vpa: "a1@ybl", name: "B", amountPaise: 5, note: "x" }), /&am=0\.05&/);
});

test("upiLink rejects non-positive or fractional paise", () => {
  for (const bad of [0, -100, 12.5]) assert.throws(() => upiLink({ vpa: "a1@ybl", name: "B", amountPaise: bad, note: "x" }));
});

test("isValidVpa", () => {
  for (const ok of ["aarav@okicici", "9876543210@ybl", "first.last-1_x@paytm"]) assert.ok(isValidVpa(ok), ok);
  for (const bad of ["", "aarav", "a@ok", "@ybl", "aarav@1bank", "aa rav@ybl", "aarav@ybl.com", "x@ybl"]) assert.ok(!isValidVpa(bad), bad);
});
