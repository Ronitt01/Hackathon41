import { test } from "node:test";
import assert from "node:assert/strict";
import { deterministicCandidates, parseAiCandidates, tripDays, type PlanOption, type PlanStop } from "./plan-candidates.ts";

const opt = (id: string, kind: string, pricePaise: number, tags: string[] = []): PlanOption => ({ id, kind, title: id, pricePaise, tags });
const options = [
  opt("stay-a", "stay", 900000), opt("stay-b", "stay", 600000), opt("stay-c", "stay", 1200000), opt("stay-d", "stay", 300000),
  opt("beach", "activity", 0, ["beach"]), opt("fort", "activity", 20000, ["culture"]), opt("club", "activity", 300000, ["nightlife"]),
  opt("trek", "activity", 150000, ["nature", "adventure"]), opt("cafe", "food", 60000, ["cafes"]), opt("thali", "food", 40000, ["veg"]),
];
const locked: PlanStop = { day: 2, position: 0, startsAt: "10:00", title: "Dudhsagar", kind: "activity", costPaise: 500000, tags: ["nature"], optionId: null, locationName: "Goa" };

test("tripDays: from dates, default 3, max 7", () => {
  assert.equal(tripDays(null, null), 3);
  assert.equal(tripDays("2026-11-23", "2026-11-25"), 3);
  assert.equal(tripDays("2026-11-23", "2026-11-23"), 1);
  assert.equal(tripDays("2026-11-01", "2026-11-20"), 7);
});

test("deterministic: 3–5 candidates, different stays, locked stop kept, slots and positions sane", () => {
  const cs = deterministicCandidates(3, options, { "stay-c": { likes: 3, roses: 1 }, club: { likes: 2, roses: 0 } }, [locked]);
  assert.ok(cs.length >= 3 && cs.length <= 5);
  assert.deepEqual(cs.slice(0, 3).map((c) => c.stayOptionId), ["stay-c", "stay-d", "stay-b"]); // most liked first, then cheapest
  for (const c of cs) {
    assert.ok(c.stops.some((s) => s.title === "Dudhsagar" && s.day === 2 && s.locked));
    assert.ok(!c.stops.some((s) => s.day === 2 && s.startsAt === "10:00" && s.title !== "Dudhsagar"), "locked slot not double-booked");
    const ids = c.stops.map((s) => s.optionId).filter(Boolean);
    assert.equal(new Set(ids).size, ids.length, "no option used twice");
    for (let d = 1; d <= 3; d++) {
      assert.deepEqual(c.stops.filter((s) => s.day === d).map((s) => s.position), c.stops.filter((s) => s.day === d).map((_, i) => i));
    }
    assert.deepEqual(c.travelPaiseByCity, {});
  }
  // most-liked strategy puts the liked club in; lean strategy has at most one stop per day plus stay + locked
  assert.ok(cs[0].stops.some((s) => s.optionId === "club"));
  assert.ok(cs[1].stops.filter((s) => s.kind !== "stay" && !s.locked).length <= 3);
});

test("deterministic: no stays → candidates with no stay; lunch slot prefers food", () => {
  const cs = deterministicCandidates(2, options.filter((o) => o.kind !== "stay"), {}, []);
  assert.equal(cs.length, 3);
  assert.ok(cs.every((c) => c.stayOptionId === null && !c.stops.some((s) => s.kind === "stay")));
  assert.equal(cs[0].stops.find((s) => s.day === 1 && s.startsAt === "13:00")?.kind, "food");
});

test("parseAiCandidates: validates ids, days and types; trusts our prices; appends locked stops", () => {
  const good = {
    stayOptionId: "stay-b",
    stops: [
      { day: 1, startsAt: "10:00", title: "Beach day", kind: "activity", costPaise: 999, tags: [], optionId: "beach" },
      { day: 3, startsAt: "25:00", title: "Spice farm", kind: "weird", costPaise: 80000, tags: ["nature", "bogus", 5], optionId: "" },
    ],
    travel: [{ city: "Delhi", paise: 650000 }, { city: "Pune", paise: -1 }],
  };
  const raw = {
    candidates: [
      good,
      { ...good, stayOptionId: "beach" }, // not a stay
      { ...good, stops: [{ ...good.stops[0], optionId: "nope" }] }, // unknown option
      { ...good, stops: [{ ...good.stops[1], day: 4 }] }, // past the last day
      { ...good, stops: [{ ...good.stops[1], costPaise: 1.5 }] }, // non-integer paise
    ],
  };
  const cs = parseAiCandidates(raw, 3, options, [locked]);
  assert.equal(cs.length, 1);
  const [c] = cs;
  assert.equal(c.stayOptionId, "stay-b");
  assert.deepEqual(c.travelPaiseByCity, { Delhi: 650000 });
  const beach = c.stops.find((s) => s.optionId === "beach")!;
  assert.equal(beach.costPaise, 0);
  assert.deepEqual(beach.tags, ["beach"]);
  const farm = c.stops.find((s) => s.title === "Spice farm")!;
  assert.deepEqual([farm.kind, farm.startsAt, farm.tags], ["activity", null, ["nature"]]);
  assert.ok(c.stops.some((s) => s.title === "Dudhsagar" && s.locked));
  assert.deepEqual(parseAiCandidates("nonsense", 3, options, []), []);
  assert.deepEqual(parseAiCandidates({ candidates: "x" }, 3, options, []), []);
});

test("deterministic: cheapest stay outside the top 3 by popularity still gets a lean candidate", () => {
  const liked = { "stay-a": { likes: 1, roses: 0 }, "stay-b": { likes: 1, roses: 0 }, "stay-c": { likes: 1, roses: 0 } };
  const cs = deterministicCandidates(2, options, liked, []);
  assert.ok(cs.some((c) => c.stayOptionId === "stay-d"));
});

test("parseAiCandidates: drops repeats of locked stops and the model's stay when a stay is locked", () => {
  const lockedStay: PlanStop = { day: 1, position: 0, startsAt: "15:00", title: "Check in: stay-a", kind: "stay", costPaise: 900000, tags: [], optionId: "stay-a" };
  const lockedFort: PlanStop = { day: 2, position: 0, startsAt: "10:00", title: "fort", kind: "activity", costPaise: 20000, tags: ["culture"], optionId: "fort" };
  const raw = {
    candidates: [{
      stayOptionId: "stay-b",
      stops: [
        { day: 1, startsAt: "15:00", title: "Check in", kind: "stay", costPaise: 0, tags: [], optionId: "stay-b" },
        { day: 2, startsAt: "10:00", title: "Fort again", kind: "activity", costPaise: 0, tags: [], optionId: "fort" },
        { day: 1, startsAt: "10:00", title: "Beach", kind: "activity", costPaise: 0, tags: [], optionId: "beach" },
      ],
      travel: [],
    }],
  };
  const [c] = parseAiCandidates(raw, 3, options, [lockedStay, lockedFort]);
  assert.equal(c.stayOptionId, "stay-a");
  assert.deepEqual(c.stops.map((s) => s.optionId).sort(), ["beach", "fort", "stay-a"]);
});
