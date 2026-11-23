import { test } from "node:test";
import assert from "node:assert/strict";
import { assignBeds, envyFreePrices, priceRooms } from "./rooms.ts";

/** Every member weakly prefers their own bed at their price to anyone else's, within one rounding unit. */
function assertEnvyFree(room: number[], price: number[], values: number[][], unit: number) {
  for (let i = 0; i < room.length; i++)
    for (let j = 0; j < room.length; j++) {
      const mine = values[i][room[i]] - price[i];
      const theirs = values[i][room[j]] - price[j];
      assert.ok(mine >= theirs - unit, `member ${i} envies member ${j}: ${mine} < ${theirs}`);
    }
}

function welfare(room: number[], values: number[][]) {
  return room.reduce((s, r, i) => s + values[i][r], 0);
}

/** Brute force: best welfare over every way to put members into beds. */
function bruteBest(beds: number[], values: number[][]): number {
  const left = [...beds];
  const go = (i: number): number => {
    if (i === values.length) return 0;
    let best = -Infinity;
    for (let r = 0; r < left.length; r++) {
      if (!left[r]) continue;
      left[r]--;
      best = Math.max(best, values[i][r] + go(i + 1));
      left[r]++;
    }
    return best;
  };
  return go(0);
}

function rng(seed: number) {
  return () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
}

test("3-room demo: nobody would rather swap, and prices add up to the rent", () => {
  // rooms: sea-view double, garden double, small single; 5 people, ₹10,500 rent
  const beds = [2, 2, 1];
  const values = [
    [300000, 200000, 150000],
    [280000, 210000, 120000],
    [200000, 220000, 100000],
    [150000, 150000, 250000],
    [260000, 180000, 90000],
  ];
  const total = 1050000;
  const { room, price } = priceRooms(beds, values, total);
  assert.equal(welfare(room, values), bruteBest(beds, values));
  assert.equal(price.reduce((a, b) => a + b, 0), total);
  for (const p of price) assert.ok(Number.isSafeInteger(p) && p >= 0 && p % 100 === 0);
  assertEnvyFree(room, price, values, 100);
  // capacity respected
  for (let r = 0; r < beds.length; r++) assert.ok(room.filter((x) => x === r).length <= beds[r]);
});

test("the better room costs more, and the surplus is shared", () => {
  // A is worth ₹200 more to member 0, the same to member 1: price gap lands inside [0, 200], centred.
  const { room, price } = priceRooms([1, 1], [[60000, 40000], [50000, 50000]], 100000);
  assert.deepEqual(room, [0, 1]);
  assert.deepEqual(price, [55000, 45000]);
});

test("people in the same room pay the same (when the total divides)", () => {
  const values = [[500, 100], [400, 300], [450, 120]];
  const { room, price } = priceRooms([2, 1], values, 90000);
  const shared = room.map((r, i) => [r, price[i]] as const).filter(([r]) => r === room[0]);
  assert.ok(shared.every(([, p]) => p === shared[0][1]));
});

test("no ratings at all → equal split", () => {
  const { price } = priceRooms([2, 2], [[0, 0], [0, 0], [0, 0], [0, 0]], 800000);
  assert.deepEqual(price, [200000, 200000, 200000, 200000]);
});

test("odd paise total: exact sum, envy-free within 1 paisa", () => {
  const values = [[1000, 0], [0, 1000], [500, 500]];
  const { room, price } = priceRooms([2, 1], values, 100001);
  assert.equal(price.reduce((a, b) => a + b, 0), 100001);
  assertEnvyFree(room, price, values, 1);
});

test("extra beds stay empty; too few beds is a clear error", () => {
  const room = assignBeds([3, 3], [[10, 0], [0, 10]]);
  assert.deepEqual(room, [0, 1]);
  assert.throws(() => assignBeds([1], [[1], [1]]), /Add 1 more bed/);
  assert.throws(() => assignBeds([20], Array(13).fill([1])), RangeError);
});

test("rent too low to price without going below ₹0 → RangeError", () => {
  assert.throws(() => envyFreePrices([0, 1], [[200000, 0], [100000, 0]], 1000), RangeError);
});

test("low rent that still has a valid split doesn't throw (centred split would go below ₹0)", () => {
  // Only valid split: ₹172 / ₹0. The centred and row/column splits all dip below ₹0 here.
  const values = [[450000, 200000], [0, 60000]];
  const { room, price } = priceRooms([2, 1], values, 17200);
  assert.deepEqual(price, [17200, 0]);
  assertEnvyFree(room, price, values, 100);
});

test("roommates pay exactly the same when the rent allows it", () => {
  const rand = rng(3);
  for (let t = 0; t < 200; t++) {
    const values = Array.from({ length: 6 }, () => Array.from({ length: 4 }, () => Math.floor(rand() * 50) * 100 * 100));
    const { room, price } = priceRooms([3, 1, 3, 1], values, (12000 + Math.floor(rand() * 6000)) * 100);
    const sizes = [...new Set(room)].map((r) => room.filter((x) => x === r).length);
    if (sizes.some((s) => s === 1)) // a single room can absorb any leftover rupee
      for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) if (room[i] === room[j]) assert.equal(price[i], price[j]);
  }
});

test("a huge room doesn't blow up the assignment", () => {
  const start = performance.now();
  assert.deepEqual(assignBeds([32767, 32767], [[10, 0], [0, 10]]), [0, 1]);
  assert.ok(performance.now() - start < 200);
});

test("random trips: optimal assignment, exact sum, envy-free", () => {
  const rand = rng(42);
  for (let t = 0; t < 200; t++) {
    const rooms = 1 + Math.floor(rand() * 4);
    const beds = Array.from({ length: rooms }, () => 1 + Math.floor(rand() * 3));
    const n = 1 + Math.floor(rand() * Math.min(7, beds.reduce((a, b) => a + b, 0)));
    const values = Array.from({ length: n }, () => Array.from({ length: rooms }, () => Math.floor(rand() * 5000) * 100));
    const total = (n * 3000 + Math.floor(rand() * 3000)) * 100;
    const { room, price } = priceRooms(beds, values, total);
    assert.equal(welfare(room, values), bruteBest(beds, values));
    assert.equal(price.reduce((a, b) => a + b, 0), total);
    assert.ok(price.every((p) => p >= 0));
    assertEnvyFree(room, price, values, 100);
  }
});

test("12 people runs fast", () => {
  const rand = rng(7);
  const values = Array.from({ length: 12 }, () => Array.from({ length: 5 }, () => Math.floor(rand() * 4000) * 100));
  const { room, price } = priceRooms([3, 3, 2, 2, 4], values, 3600000);
  assert.equal(price.reduce((a, b) => a + b, 0), 3600000);
  assertEnvyFree(room, price, values, 100);
});
