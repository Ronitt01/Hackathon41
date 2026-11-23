// A-1 candidate plans: a deterministic generator (no API key / demo) and validation of Claude's JSON.
// Pure: no I/O, so lib/fairness can score either source the same way.
import { TAGS } from "./tags.ts";

export const STOP_KINDS = ["activity", "food", "travel", "stay", "meetup"] as const;
export type StopKind = (typeof STOP_KINDS)[number];

export type PlanStop = {
  day: number;
  position: number;
  startsAt: string | null; // "HH:MM"
  title: string;
  kind: StopKind;
  costPaise: number; // for the whole group
  tags: string[];
  optionId: string | null;
  locationName?: string | null;
  locked?: boolean;
};

export type Candidate = { stayOptionId: string | null; stops: PlanStop[]; travelPaiseByCity: Record<string, number> };

export type PlanOption = { id: string; kind: string; title: string; pricePaise: number | null; tags: string[] };
export type ReactionCounts = Record<string, { likes: number; roses: number }>;

const DAY_MS = 86_400_000;

/** Trip length in days from "YYYY-MM-DD" dates: 3 when unknown, capped at 7. */
export function tripDays(start: string | null, end: string | null): number {
  if (!start || !end) return 3;
  const days = Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / DAY_MS) + 1;
  return Math.min(Math.max(days || 3, 1), 7);
}

/** Within each day: sort by time (untimed last) and number positions 0..n-1. */
function withPositions(stops: PlanStop[]): PlanStop[] {
  const sorted = [...stops].sort((a, b) => a.day - b.day || (a.startsAt ?? "99").localeCompare(b.startsAt ?? "99"));
  const next: Record<number, number> = {};
  return sorted.map((s) => ({ ...s, position: (next[s.day] = (next[s.day] ?? -1) + 1) }));
}

const SLOTS = ["10:00", "13:00", "17:00"];
const popularity = (o: PlanOption, r: ReactionCounts) => (r[o.id]?.likes ?? 0) + 3 * (r[o.id]?.roses ?? 0);
const price = (o: PlanOption) => o.pricePaise ?? 0;

/** Greedy pick that prefers options bringing tags not yet covered. */
function byVariety(options: PlanOption[], r: ReactionCounts): PlanOption[] {
  const left = [...options].sort((a, b) => popularity(b, r) - popularity(a, r));
  const seen = new Set<string>();
  const out: PlanOption[] = [];
  while (left.length) {
    let best = 0;
    left.forEach((o, i) => {
      if (o.tags.filter((t) => !seen.has(t)).length > left[best].tags.filter((t) => !seen.has(t)).length) best = i;
    });
    const [o] = left.splice(best, 1);
    o.tags.forEach((t) => seen.add(t));
    out.push(o);
  }
  return out;
}

const STRATEGIES: { order: (o: PlanOption[], r: ReactionCounts) => PlanOption[]; perDay: number }[] = [
  { order: (o, r) => [...o].sort((a, b) => popularity(b, r) - popularity(a, r) || price(a) - price(b)), perDay: 2 },
  { order: (o) => [...o].sort((a, b) => price(a) - price(b)), perDay: 1 }, // lean plan: keeps "no fit" rare
  { order: byVariety, perDay: 2 },
];

function buildPlan(days: number, stay: PlanOption | null, picked: PlanOption[], locked: PlanStop[], lockedStayId: string | null): Candidate {
  const stops: PlanStop[] = locked.map((s) => ({ ...s, locked: true }));
  if (stay) stops.push({ day: 1, position: 0, startsAt: "15:00", title: `Check in: ${stay.title}`, kind: "stay", costPaise: price(stay), tags: stay.tags, optionId: stay.id });
  const food = picked.filter((o) => o.kind === "food");
  const fun = picked.filter((o) => o.kind !== "food");
  for (let day = 1; day <= days; day++) {
    for (const time of SLOTS) {
      if (stops.some((s) => s.day === day && s.startsAt === time)) continue;
      const o = (time === "13:00" ? food.shift() ?? fun.shift() : fun.shift() ?? food.shift());
      if (o) stops.push({ day, position: 0, startsAt: time, title: o.title, kind: o.kind === "food" ? "food" : "activity", costPaise: price(o), tags: o.tags, optionId: o.id });
    }
  }
  return { stayOptionId: stay?.id ?? lockedStayId, stops: withPositions(stops), travelPaiseByCity: {} };
}

/** 3–4 candidates: stay i × strategy i, plus cheapest stay × lean plan. Locked stops are always kept on their days. */
export function deterministicCandidates(days: number, options: PlanOption[], reactions: ReactionCounts, locked: PlanStop[]): Candidate[] {
  const lockedIds = new Set(locked.map((s) => s.optionId));
  const lockedStay = locked.find((s) => s.kind === "stay");
  const stays = lockedStay
    ? []
    : options.filter((o) => o.kind === "stay").sort((a, b) => popularity(b, reactions) - popularity(a, reactions) || price(a) - price(b)).slice(0, 3);
  const stayChoices: (PlanOption | null)[] = stays.length ? stays : [null];
  const pool = options.filter((o) => (o.kind === "activity" || o.kind === "food") && !lockedIds.has(o.id));

  const out = STRATEGIES.map((s, i) =>
    buildPlan(days, stayChoices[i % stayChoices.length], s.order(pool, reactions).slice(0, days * s.perDay), locked, lockedStay?.optionId ?? null),
  );
  // From every stay, not just the top 3 by popularity: an unpopular cheap stay may be the only one that fits.
  const cheapestStay = options.filter((o) => o.kind === "stay").sort((a, b) => price(a) - price(b))[0];
  if (!lockedStay && cheapestStay && cheapestStay !== stayChoices[1 % stayChoices.length]) {
    out.push(buildPlan(days, cheapestStay, STRATEGIES[1].order(pool, reactions).slice(0, days), locked, null));
  }
  return out;
}

const TAG_IDS = new Set<string>(TAGS.map((t) => t.id));
const isInt = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;

/**
 * Validates Claude's structured output (see lib/ai.ts schema) into Candidates.
 * A candidate naming an unknown option or stay is dropped; locked stops are appended by us, not trusted from the model.
 */
export function parseAiCandidates(raw: unknown, days: number, options: PlanOption[], locked: PlanStop[]): Candidate[] {
  const byId = new Map(options.map((o) => [o.id, o]));
  const list = (raw as { candidates?: unknown })?.candidates;
  if (!Array.isArray(list)) return [];
  const lockedIds = new Set(locked.map((s) => s.optionId).filter(Boolean));
  const lockedStay = locked.find((s) => s.kind === "stay");
  const out: Candidate[] = [];
  for (const c of list.slice(0, 5)) {
    // A locked stay wins over the model's pick, so a plan never pays for two stays.
    const stayId = lockedStay ? lockedStay.optionId : typeof c?.stayOptionId === "string" && c.stayOptionId ? c.stayOptionId : null;
    if (!lockedStay && stayId && byId.get(stayId)?.kind !== "stay") continue;
    if (!Array.isArray(c?.stops)) continue;
    const stops: PlanStop[] = [];
    let ok = true;
    for (const s of c.stops) {
      const optionId = typeof s?.optionId === "string" && s.optionId ? s.optionId : null;
      const option = optionId ? byId.get(optionId) : null;
      const title = typeof s?.title === "string" ? s.title.trim().slice(0, 80) : "";
      if ((optionId && !option) || !title || !Number.isInteger(s?.day) || s.day < 1 || s.day > days || (!option && !isInt(s?.costPaise))) {
        ok = false;
        break;
      }
      // Locked stops are appended below; drop the model's repeats and its own stay when one is locked.
      if ((optionId && lockedIds.has(optionId)) || (lockedStay && (s.kind === "stay" || option?.kind === "stay"))) continue;
      stops.push({
        day: s.day,
        position: 0,
        startsAt: typeof s.startsAt === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s.startsAt) ? s.startsAt : null,
        title,
        kind: STOP_KINDS.includes(s.kind) ? s.kind : "activity",
        costPaise: option ? price(option) : s.costPaise, // known options: trust our price, not the model's
        tags: option ? option.tags : Array.isArray(s.tags) ? s.tags.filter((t: unknown) => typeof t === "string" && TAG_IDS.has(t)) : [],
        optionId,
      });
    }
    if (!ok) continue;
    const travel: Record<string, number> = {};
    for (const t of Array.isArray(c.travel) ? c.travel : []) {
      if (typeof t?.city === "string" && isInt(t.paise)) travel[t.city] = t.paise;
    }
    out.push({ stayOptionId: stayId, stops: withPositions([...stops, ...locked.map((s) => ({ ...s, locked: true }))]), travelPaiseByCity: travel });
  }
  return out;
}
