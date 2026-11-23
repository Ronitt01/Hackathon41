import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalCity, DESTINATIONS, fairestDestinations, HOME_CITIES, TRAVEL_PAISE } from "./meet-middle.ts";

test("fare table: every city × destination, whole rupees, plausible", () => {
  assert.equal(HOME_CITIES.length, 15);
  assert.equal(DESTINATIONS.length, 15);
  for (const c of HOME_CITIES)
    for (const d of DESTINATIONS) {
      const p = TRAVEL_PAISE[c.name][d.name];
      assert.ok(Number.isSafeInteger(p) && p % 100 === 0);
      assert.ok(c.name === d.name ? p === 0 : p >= 20000 && p <= 600000, `${c.name}→${d.name} ₹${p / 100}`);
    }
  assert.ok(TRAVEL_PAISE.Bengaluru.Coorg < TRAVEL_PAISE.Delhi.Coorg);
  assert.ok(TRAVEL_PAISE.Delhi.Kasol > TRAVEL_PAISE.Delhi.Rishikesh, "hill-station last mile counts");
});

test("canonicalCity: aliases, case, unknown", () => {
  assert.equal(canonicalCity(" bangalore "), "Bengaluru");
  assert.equal(canonicalCity("MUMBAI"), "Mumbai");
  assert.equal(canonicalCity("Gurugram"), "Delhi");
  assert.equal(canonicalCity("Atlantis"), null);
  assert.equal(canonicalCity(null), null);
});

test("fairestDestinations: smallest gap first, then lowest average; for 3 cities", () => {
  const top = fairestDestinations(["Delhi", "Mumbai", "Bengaluru"]);
  assert.equal(top.length, 3);
  for (let i = 1; i < top.length; i++) {
    assert.ok(top[i - 1].spreadPaise < top[i].spreadPaise || (top[i - 1].spreadPaise === top[i].spreadPaise && top[i - 1].meanPaise <= top[i].meanPaise));
  }
  const all = fairestDestinations(["Delhi", "Mumbai", "Bengaluru"], 99);
  assert.equal(all.length, 15);
  assert.ok(all.every((d) => d.spreadPaise >= top[0].spreadPaise));
  const goa = all.find((d) => d.destination === "Goa")!;
  const fares = [TRAVEL_PAISE.Delhi.Goa, TRAVEL_PAISE.Mumbai.Goa, TRAVEL_PAISE.Bengaluru.Goa];
  assert.equal(goa.spreadPaise, Math.max(...fares) - Math.min(...fares));
  assert.equal(goa.minPaise, Math.min(...fares));
});

test("fairestDestinations: same city → zero gap, ranked by cheapest; unknown ignored; none → []", () => {
  const top = fairestDestinations(["Pune", "pune", "Atlantis", null]);
  assert.ok(top.every((d) => d.spreadPaise === 0));
  assert.equal(top[0].meanPaise, Math.min(...DESTINATIONS.map((d) => TRAVEL_PAISE.Pune[d.name])));
  assert.deepEqual(fairestDestinations(["Atlantis", null]), []);
});
