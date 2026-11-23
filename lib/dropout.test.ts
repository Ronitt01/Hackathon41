import { test } from "node:test";
import assert from "node:assert/strict";
import { dropoutImpact, perHead } from "./dropout.ts";

test("6 → 5 people: per-head goes up by the difference", () => {
  const r = dropoutImpact(1260000, 6, Array(5).fill({ travelPaise: 0, budgetPaise: null }));
  assert.equal(r.oldPerHead, 210000);
  assert.equal(r.newPerHead, 252000);
  assert.equal(r.deltaPaise, 42000); // "+₹420 per person"
  assert.equal(r.fitsEveryone, true);
});

test("checks every remaining budget against their own travel + new share", () => {
  const travellers = [
    { travelPaise: 300000, budgetPaise: 600000 },
    { travelPaise: 100000, budgetPaise: 350000 }, // 100000 + 252000 = 352000 > 350000
    { travelPaise: 0, budgetPaise: null },
  ];
  const r = dropoutImpact(756000, 4, travellers);
  assert.equal(r.newPerHead, 252000);
  assert.deepEqual(r.totals, [552000, 352000, 252000]);
  assert.equal(r.fitsEveryone, false);
  assert.equal(dropoutImpact(756000, 4, [travellers[0], travellers[2], travellers[2]]).fitsEveryone, true);
});

test("no shared cost → no change; nobody left → 0", () => {
  assert.equal(dropoutImpact(0, 3, [{ travelPaise: 5, budgetPaise: 10 }]).deltaPaise, 0);
  assert.equal(perHead(1000, 0), 0);
  assert.equal(perHead(1000, 3), 333);
});
