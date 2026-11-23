// T-1 live re-planning: which stops are "the rest of today", deterministic fallback rules,
// and validation of Claude's proposal. Pure: no I/O.
import { STOP_KINDS, type StopKind } from "./plan-candidates.ts";
import { TAGS } from "./tags.ts";

export const TRIGGERS = ["rain", "tired", "delay"] as const;
export type Trigger = (typeof TRIGGERS)[number];

/** branch: A-3 split days ("A"/"B" = that half of the group; null = whole group). */
export type ReplanStop = { startsAt: string | null; title: string; kind: StopKind; costPaise: number; tags: string[]; locationName: string | null; branch: "A" | "B" | null };

const DAY_MS = 86_400_000;
const LAST_START = 23 * 60; // nothing new starts after 23:00

const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const fromMin = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const isTime = (v: unknown): v is string => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

/** The party is in India: "today" and "now" in IST, as "YYYY-MM-DD" and "HH:MM". */
export function istNow(at = new Date()): { today: string; time: string } {
  const today = at.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const time = at.toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false });
  return { today, time };
}

/** Which trip day is today. `live` = we're actually on the trip, so stops already past are left alone; otherwise Day 1 in full. */
export function todayDay(start: string | null, end: string | null, today: string): { day: number; live: boolean } {
  if (!start) return { day: 1, live: false };
  const day = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / DAY_MS) + 1;
  if (day < 1 || (end && today > end)) return { day: 1, live: false };
  return { day, live: true };
}

/** Stops still ahead today (untimed ones count as ahead). */
export function isAhead(startsAt: string | null, now: string, live: boolean): boolean {
  return !live || !startsAt || startsAt.slice(0, 5) >= now;
}

/** Keeps order, makes every timed stop start at or after `from` and at least an hour after the previous; drops what runs past 23:00. */
function sequenceFrom(stops: ReplanStop[], from: number): { kept: ReplanStop[]; dropped: number } {
  let cursor = from;
  const kept: ReplanStop[] = [];
  for (const s of stops) {
    if (!s.startsAt) {
      kept.push(s);
      continue;
    }
    const t = Math.max(toMin(s.startsAt), cursor);
    if (t > LAST_START) continue;
    kept.push({ ...s, startsAt: fromMin(t) });
    cursor = t + 60;
  }
  return { kept, dropped: stops.length - kept.length };
}

const OUTDOOR = new Set(["beach", "nature", "adventure"]);
const INDOOR: Omit<ReplanStop, "startsAt" | "branch">[] = [
  { title: "Café hop (indoors)", kind: "food", costPaise: 0, tags: ["cafes", "relaxed"], locationName: null },
  { title: "Museum or covered market", kind: "activity", costPaise: 0, tags: ["culture", "shopping"], locationName: null },
  { title: "Board games at the stay", kind: "activity", costPaise: 0, tags: ["relaxed"], locationName: null },
];
const REST: Omit<ReplanStop, "startsAt"> = { title: "Rest at the stay", kind: "stay", costPaise: 0, tags: ["relaxed"], locationName: null, branch: null };

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Deterministic re-plan used without Claude: rain → swap outdoor stops for indoor ones; tired → rest first, fewer stops; delay → shift later. */
export function fallbackReplan(stops: ReplanStop[], trigger: Trigger, minutes: number, now: string): { stops: ReplanStop[]; note: string } {
  if (trigger === "delay") {
    const shifted = stops.map((s) => (s.startsAt ? { ...s, startsAt: toMin(s.startsAt) + minutes } : { ...s, startsAt: null }));
    const kept = shifted.filter((s) => s.startsAt === null || s.startsAt <= LAST_START).map((s) => ({ ...s, startsAt: s.startsAt === null ? null : fromMin(s.startsAt) }));
    const dropped = stops.length - kept.length;
    return { stops: kept, note: `Everything moved ${minutes} min later${dropped ? `; ${plural(dropped, "stop")} no longer fit today` : ""}.` };
  }
  if (trigger === "rain") {
    let swapped = 0;
    const next = stops.map((s) => (s.kind === "activity" && s.tags.some((t) => OUTDOOR.has(t)) ? { ...INDOOR[swapped++ % INDOOR.length], startsAt: s.startsAt, branch: s.branch } : s));
    return { stops: next, note: swapped ? `Swapped ${plural(swapped, "outdoor stop")} for indoor ones.` : "Nothing outdoors left today, so the plan already works in the rain." };
  }
  // tired: keep meals and fixed travel/stay, keep one activity (prefer a relaxed one), rest first
  const activities = stops.filter((s) => s.kind === "activity" || s.kind === "meetup");
  const keepActivity = activities.find((s) => s.tags.includes("relaxed")) ?? activities[0];
  const lighter = stops.filter((s) => (s.kind !== "activity" && s.kind !== "meetup") || s === keepActivity);
  const restAt = Math.min(Math.ceil(toMin(now) / 30) * 30, LAST_START);
  const { kept, dropped } = sequenceFrom(lighter, restAt + 90);
  const cut = stops.length - lighter.length + dropped;
  return { stops: [{ ...REST, startsAt: fromMin(restAt) }, ...kept], note: `A 90-minute rest first${cut ? `, and ${plural(cut, "stop")} fewer` : ""}.` };
}

const TAG_IDS = new Set<string>(TAGS.map((t) => t.id));

/** Validates a proposed rest-of-day (from Claude or the browser): 1–8 stops, sane values, sorted by time. Null if unusable. */
export function parseReplanStops(raw: unknown): ReplanStop[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 8) return null;
  const out: ReplanStop[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") return null;
    const { title, kind, startsAt, costPaise, tags, locationName, branch } = r as Record<string, unknown>;
    if (typeof title !== "string" || !title.trim() || title.length > 120) return null;
    if (!STOP_KINDS.includes(kind as StopKind)) return null;
    const cost = Number(costPaise ?? 0);
    out.push({
      title: title.trim(),
      kind: kind as StopKind,
      startsAt: isTime(startsAt) ? startsAt : null,
      costPaise: Number.isSafeInteger(cost) && cost >= 0 ? cost : 0,
      tags: Array.isArray(tags) ? tags.filter((t): t is string => typeof t === "string" && TAG_IDS.has(t)) : [],
      locationName: typeof locationName === "string" && locationName.trim() ? locationName.trim().slice(0, 120) : null,
      branch: branch === "A" || branch === "B" ? branch : null,
    });
  }
  return out.sort((a, b) => (a.startsAt ?? "99").localeCompare(b.startsAt ?? "99"));
}

const sameStop = (a: { title: string; kind: string }, b: { title: string; kind: string }) =>
  a.kind === b.kind && a.title.trim().toLowerCase() === b.title.trim().toLowerCase();

/** Guards a proposal against "now" and the fixed (locked) stops: drops repeats of a fixed stop, moves past start times up to `now` (live only). */
export function checkProposal(stops: ReplanStop[], fixed: { title: string; kind: string }[], now: string | null): ReplanStop[] {
  return stops
    .filter((s) => !fixed.some((f) => sameStop(s, f)))
    .map((s) => (now && s.startsAt && s.startsAt < now ? { ...s, startsAt: now } : s))
    .sort((a, b) => (a.startsAt ?? "99").localeCompare(b.startsAt ?? "99"));
}

/** For each proposed stop, the replaced stop it is (same title and kind, each used once), or null when it's new. Lets accept keep that row. */
export function pairWithExisting<T extends { title: string; kind: string }>(proposal: ReplanStop[], existing: T[]): (T | null)[] {
  const pool = [...existing];
  return proposal.map((p) => {
    const i = pool.findIndex((e) => sameStop(p, e));
    return i < 0 ? null : pool.splice(i, 1)[0];
  });
}

/** Highest Open-Meteo precipitation probability (%) for the hours left today; null when there's no data. */
export function rainChance(times: string[], probs: (number | null)[], today: string, now: string): number | null {
  const hour = `${today}T${now.slice(0, 2)}:00`;
  const ahead = times.flatMap((t, i) => (t.startsWith(today) && t >= hour && typeof probs[i] === "number" ? [probs[i] as number] : []));
  return ahead.length ? Math.max(...ahead) : null;
}
