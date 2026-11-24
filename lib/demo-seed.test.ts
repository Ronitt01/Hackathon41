import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDemoSeed, fridayAtLeast, SAMPLE_FRIENDS } from "./demo-seed.ts";

const photos = [
  { subject: "villa", file: "/photos/villa.jpg" },
  { subject: "fontainhas", file: "/photos/fontainhas.jpg" },
];
const seed = buildDemoSeed({ today: "2026-11-24", photos });
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

test("trip starts on the first Friday at least 14 days ahead and lasts 4 days", () => {
  assert.equal(fridayAtLeast("2026-11-24"), "2026-12-11"); // Tue + 14 = Tue 8 Dec → Fri 11 Dec
  assert.equal(fridayAtLeast("2026-11-13"), "2026-11-27"); // Fri + 14 is already a Friday
  assert.equal(fridayAtLeast("2026-11-14"), "2026-12-04"); // Sat + 14 = Sat 28 Nov → Fri 4 Dec
  assert.equal(new Date(`${seed.trip.startDate}T00:00:00Z`).getUTCDay(), 5);
  assert.deepEqual([seed.trip.startDate, seed.trip.endDate], ["2026-12-11", "2026-12-14"]);
  assert.equal(seed.decision.deadline, "2026-11-25T19:00:00+05:30");
});

test("Meera has the lowest budget; the others sit between ₹10,000 and ₹16,000", () => {
  const meera = SAMPLE_FRIENDS.find((f) => f.key === "meera")!;
  assert.equal(meera.budgetPaise, 800_000);
  for (const f of SAMPLE_FRIENDS.filter((f) => f !== meera)) {
    assert.ok(f.budgetPaise > meera.budgetPaise);
    assert.ok(f.budgetPaise >= 1_000_000 && f.budgetPaise <= 1_600_000);
  }
  assert.equal(new Set(SAMPLE_FRIENDS.map((f) => f.userId)).size, 5);
});

// Return fares (₹) the live AI estimated for Goa in Nov 2026 for its lean plans; Delhi came back ₹9–10k.
const RETURN_FARE_RUPEES: Record<string, number> = { Delhi: 9_000, Mumbai: 4_000, Pune: 3_000, Bengaluru: 5_000 };

test("the cheapest plan fits every friend's budget after travel, Meera's included", () => {
  // Mirrors lib/fairness + the lean candidate: cheapest stay + one cheapest stop a day, shared by everyone incl. the caller and Kabir.
  const days = 4;
  const people = SAMPLE_FRIENDS.length + 1;
  const stay = Math.min(...seed.options.filter((o) => o.kind === "stay").map((o) => o.pricePaise));
  const stops = sum(seed.options.filter((o) => o.kind !== "stay").map((o) => o.pricePaise).sort((a, b) => a - b).slice(0, days));
  const share = Math.round((stay + stops) / people);
  for (const f of SAMPLE_FRIENDS) {
    const fare = RETURN_FARE_RUPEES[f.homeCity];
    assert.ok(fare, `no fare for ${f.homeCity}`);
    assert.ok(share + fare * 100 <= f.budgetPaise, `${f.name}: ₹${(share + fare * 100) / 100} > ₹${f.budgetPaise / 100}`);
  }
});

test("every expense's shares add up exactly; only Aarav and Rohan pay for the drinks", () => {
  for (const e of seed.expenses) {
    assert.equal(sum(e.shares.map((s) => s.amountPaise)), e.amountPaise, e.title);
    if (e.items.length) assert.equal(sum(e.items.map((i) => i.amountPaise)), e.amountPaise, e.title);
  }
  const [cab, dinner] = seed.expenses;
  assert.equal(cab.shares.length, 5); // confirmed only: Kabir is a maybe
  assert.ok(!cab.shares.some((s) => s.who === "kabir"));
  const share = (who: string) => dinner.shares.find((s) => s.who === who)!.amountPaise;
  assert.ok(share("aarav") > share("meera"));
  assert.equal(share("aarav"), share("rohan"));
  assert.equal(share("meera"), share("me"));
});

test("photos come from the manifest by subject; missing subjects get none", () => {
  const byKey = new Map(seed.options.map((o) => [o.key, o]));
  assert.equal(byKey.get("villa")!.imageUrl, "/photos/villa.jpg");
  assert.equal(byKey.get("cafes")!.imageUrl, "/photos/fontainhas.jpg");
  assert.equal(byKey.get("dudhsagar")!.imageUrl, null);
  assert.equal(byKey.get("guesthouse")!.imageUrl, null); // the Fontainhas photo is the café trail's only
  const images = seed.options.map((o) => o.imageUrl).filter(Boolean);
  assert.equal(new Set(images).size, images.length, "no photo is used twice");
  assert.deepEqual(seed.options.filter((o) => o.inDecision).map((o) => o.pricePaise), [4_200_000, 2_400_000, 1_500_000]);
});

test("reactions and comments point at real options and aspects; one Rose each at most", () => {
  for (const r of [...seed.reactions, ...seed.comments]) {
    const o = seed.options.find((o) => o.key === r.option);
    assert.ok(o, r.option);
    if (r.aspect) assert.ok(o.aspects.some((a) => a.label === r.aspect), `${r.option}/${r.aspect}`);
  }
  const roses = seed.reactions.filter((r) => r.kind === "rose").map((r) => r.who);
  assert.equal(new Set(roses).size, roses.length);
  const keys = seed.reactions.map((r) => `${r.who}|${r.option}|${r.aspect ?? ""}|${r.kind}`);
  assert.equal(new Set(keys).size, keys.length);
  for (const o of seed.options) assert.ok(o.aspects.length >= 2 && o.aspects.length <= 3, o.key);
});
