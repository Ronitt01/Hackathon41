// M-4 fair room pricing: max-welfare bed assignment + envy-free rent division. Money in integer paise.
import type { SupabaseClient } from "@supabase/supabase-js";

export const MAX_ROOM_MEMBERS = 12; // the assignment DP is 2^members; trips cap at 12

/**
 * Who sleeps where so the group's total value is as high as possible.
 * beds[r] = beds in room r; values[i][r] = what member i would pay for one bed in room r.
 * Returns the room index for each member. Extra beds stay empty.
 */
export function assignBeds(beds: number[], values: number[][]): number[] {
  const n = values.length;
  if (n > MAX_ROOM_MEMBERS) throw new RangeError(`Room pricing works for up to ${MAX_ROOM_MEMBERS} people.`);
  // A room never holds more than n people, so extra beds can't change the optimum: cap them to bound the DP.
  const bedRoom = beds.flatMap((b, r) => Array<number>(Math.min(b, n)).fill(r));
  if (bedRoom.length < n) throw new RangeError(`Add ${n - bedRoom.length} more ${n - bedRoom.length === 1 ? "bed" : "beds"}: everyone needs one.`);

  // Exact DP over beds × set of members already placed (≤ 4096 sets).
  const full = (1 << n) - 1;
  let best = new Float64Array(full + 1).fill(-Infinity);
  best[0] = 0;
  const took: Int8Array[] = []; // took[bed][set] = member who took this bed to reach set; -1 = bed left empty
  for (const r of bedRoom) {
    const next = Float64Array.from(best);
    const choice = new Int8Array(full + 1).fill(-1);
    for (let set = 0; set <= full; set++) {
      if (best[set] === -Infinity) continue;
      for (let i = 0; i < n; i++) {
        if (set & (1 << i)) continue;
        const to = set | (1 << i);
        const v = best[set] + values[i][r];
        if (v > next[to]) {
          next[to] = v;
          choice[to] = i;
        }
      }
    }
    took.push(choice);
    best = next;
  }

  const room = Array<number>(n).fill(-1);
  let set = full;
  for (let b = bedRoom.length - 1; b >= 0; b--) {
    const i = took[b][set];
    if (i >= 0) {
      room[i] = bedRoom[b];
      set &= ~(1 << i);
    }
  }
  return room;
}

/**
 * Envy-free prices for an assignment from assignBeds: nobody would rather pay someone else's price for their bed.
 * Constraint per pair: price_i − price_j ≤ values[i][room_i] − values[i][room_j], i.e. shortest-path potentials.
 * Prices sum exactly to totalPaise, rounded to whole rupees when the total is whole rupees. Each price is within one
 * rounding unit (₹1, or 1 paisa) of an exact envy-free price, and roommates pay the same whenever the rounding allows.
 * Throws RangeError only if no envy-free split exists without someone going below ₹0.
 */
export function envyFreePrices(room: number[], values: number[][], totalPaise: number): number[] {
  const n = room.length;
  if (n === 0) return [];
  // d[j][i] = tightest bound on price_i − price_j (Floyd–Warshall over the n×n constraint graph)
  const d = room.map((_, j) => room.map((ri, i) => (i === j ? 0 : values[i][ri] - values[i][room[j]])));
  for (let k = 0; k < n; k++) for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) d[a][b] = Math.min(d[a][b], d[a][k] + d[k][b]);
  if (d.some((row, i) => row[i] < 0)) throw new Error("envyFreePrices: assignment is not welfare-maximising");

  const toTotal = (c: number[]) => {
    const shift = (totalPaise - c.reduce((a, b) => a + b, 0)) / n;
    return c.map((x) => x + shift);
  };
  // Centred: the average of every row d[k] and negated column −d[·][k]; spreads the surplus instead of handing it to one person.
  const centred = toTotal(room.map((_, i) => d.reduce((s, row, k) => s + row[i] - d[i][k], 0) / (2 * n)));
  // Cheapest envy-free prices with nobody below ₹0 (price_i ≥ −d[i][j] for every j); every valid split is ≥ this.
  const lowest = toTotal(d.map((row) => Math.max(...row.map((x) => -x))));
  if (lowest.some((p) => p < -1e-6)) throw new RangeError("The rent is too low for these ratings. Check the total rent.");
  if (totalPaise === 0) return room.map(() => 0);
  // A blend of two envy-free splits is envy-free: keep as much of the centred one as stays at ₹0 or more.
  const keep = Math.max(0, Math.min(1, ...centred.map((c, i) => (c < 0 ? lowest[i] / (lowest[i] - c) : 1))));
  return roundByRoom(room, centred.map((c, i) => Math.max(0, keep * c + (1 - keep) * lowest[i])), totalPaise);
}

/** Whole units summing to totalPaise: each price is its exact value's floor or floor + 1, and the +1s go to whole rooms. */
function roundByRoom(room: number[], raw: number[], totalPaise: number): number[] {
  const unit = totalPaise % 100 === 0 ? 100 : 1;
  // Roommates' exact prices are equal (envy-free both ways); averaging removes float noise between them.
  const groups = [...new Set(room)].map((r) => {
    const who = room.flatMap((x, i) => (x === r ? [i] : []));
    const each = who.reduce((s, i) => s + raw[i], 0) / who.length / unit;
    const base = Math.floor(each + 1e-9);
    return { who, base, frac: each - base };
  });
  const price = Array<number>(room.length);
  for (const g of groups) for (const i of g.who) price[i] = g.base;
  const left = totalPaise / unit - price.reduce((a, b) => a + b, 0);

  // Rooms ≤ people ≤ 12, so try every set of rooms to take the +1s, favouring the biggest fractions.
  let best = -1;
  let bestScore = -Infinity;
  for (let mask = 0; mask < 1 << groups.length; mask++) {
    let size = 0;
    let score = 0;
    groups.forEach((g, k) => {
      if (mask & (1 << k)) {
        size += g.who.length;
        score += g.who.length * g.frac;
      }
    });
    if (size === left && score > bestScore) [best, bestScore] = [mask, score];
  }
  if (best >= 0) groups.forEach((g, k) => (best & (1 << k) ? g.who.forEach((i) => price[i]++) : undefined));
  else {
    // No set of rooms adds up (e.g. one double and an odd number of units): largest fractions first, roommates together.
    for (const i of groups.sort((a, b) => b.frac - a.frac).flatMap((g) => g.who).slice(0, left)) price[i]++;
  }
  return price.map((u) => u * unit);
}

/** Assignment + prices in one go. */
export function priceRooms(beds: number[], values: number[][], totalPaise: number) {
  const room = assignBeds(beds, values);
  return { room, price: envyFreePrices(room, values, totalPaise) };
}

type RoomRow = { id: string; beds: number };
type ValuationRow = { room_id: string; member_id: string; value_paise: number };

/**
 * Server only: pass the service-role client, after checking the caller. Loads the trip's rooms, active members and
 * PRIVATE valuations (missing = ₹0), prices beds and saves bed_assignments. Never returns anyone's valuations.
 */
export async function saveRoomPrices(admin: SupabaseClient, tripId: string, totalPaise: number): Promise<{ error: string; status: number } | null> {
  const [rooms, members, vals] = await Promise.all([
    admin.from("rooms").select("id, beds").eq("trip_id", tripId).order("name"),
    admin.from("members").select("id").eq("trip_id", tripId).neq("status", "dropped").order("joined_at"),
    admin.from("room_valuations").select("room_id, member_id, value_paise").eq("trip_id", tripId),
  ]);
  const loadError = rooms.error ?? members.error ?? vals.error;
  if (loadError) {
    console.error("rooms: load failed", loadError.message); // never log rows: valuations are private
    return { error: "Couldn't load the rooms. Please try again.", status: 500 };
  }
  const roomRows = rooms.data as RoomRow[];
  const memberIds = (members.data as { id: string }[]).map((m) => m.id);
  if (roomRows.length === 0) return { error: "Add a room first.", status: 400 };

  const value = new Map((vals.data as ValuationRow[]).map((v) => [`${v.member_id}:${v.room_id}`, Number(v.value_paise)]));
  const values = memberIds.map((m) => roomRows.map((r) => value.get(`${m}:${r.id}`) ?? 0));
  let result: { room: number[]; price: number[] };
  try {
    result = priceRooms(roomRows.map((r) => r.beds), values, totalPaise);
  } catch (err) {
    if (err instanceof RangeError) return { error: err.message, status: 400 };
    throw err;
  }

  // Upsert first, then drop rows for people no longer placed, so a failed write never leaves the trip with no split.
  const { error: upsertError } = await admin.from("bed_assignments").upsert(
    memberIds.map((member_id, i) => ({ trip_id: tripId, member_id, room_id: roomRows[result.room[i]].id, price_paise: result.price[i], accepted: false })),
    { onConflict: "trip_id,member_id" },
  );
  if (upsertError) {
    console.error("rooms: save failed", upsertError.message);
    return { error: "Couldn't save the room split. Please try again.", status: 500 };
  }
  const { error: cleanError } = await admin.from("bed_assignments").delete().eq("trip_id", tripId).not("member_id", "in", `(${memberIds.join(",")})`);
  if (cleanError) console.error("rooms: stale cleanup failed", cleanError.message);
  return null;
}
