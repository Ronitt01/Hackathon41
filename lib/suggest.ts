// Kafila's own option suggestions on the Decide tab: validates Claude's list, prices it for the group,
// and a built-in list for when Claude isn't available. Pure, no I/O.
import { TAGS, type TagId } from "./tags.ts";

export const SUGGEST_KINDS = ["destination", "stay", "food", "activity"] as const;
export type SuggestKind = (typeof SUGGEST_KINDS)[number];
export type Suggestion = { kind: SuggestKind; title: string; description: string; pricePaise: number; tags: TagId[] };
/** Only aggregates: never a name, a budget or one person's answers. */
export type SuggestInput = {
  destination: string | null;
  days: number;
  people: number;
  groupPrefs: Record<string, number>; // sum of prefs over members, per tag
  existingTitles: string[];
};

/** A trip stops getting suggestions after this many, so "Suggest more" can't flood the board. */
export const MAX_AI_OPTIONS = 40;
const MAX_PER_PERSON_INR = 100_000;

/** No destination yet: suggest where to go. Otherwise: where to stay, eat and what to do there. */
export const kindsFor = (destination: string | null): SuggestKind[] => (destination ? ["stay", "food", "activity"] : ["destination"]);

/** Group total in paise from a per-person rupee estimate. Stays are per night; destinations per day (travel there not included). */
export function groupTotalPaise(kind: SuggestKind, perPersonInr: number, people: number, days: number): number {
  const times = kind === "stay" ? Math.max(1, days - 1) : kind === "destination" ? days : 1;
  return Math.round(perPersonInr) * 100 * Math.max(1, people) * times;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
const TAG_IDS = new Set<string>(TAGS.map((t) => t.id));

/** Claude's JSON → clean suggestions: known kinds for this trip, sane prices, known tags, no repeats of what's on the board. */
export function parseSuggestions(raw: unknown, input: SuggestInput, max = 12): Suggestion[] {
  const list = (raw as { suggestions?: unknown })?.suggestions;
  if (!Array.isArray(list)) return [];
  const kinds = kindsFor(input.destination);
  const seen = new Set(input.existingTitles.map(norm));
  const out: Suggestion[] = [];
  for (const item of list) {
    const s = item as Record<string, unknown>;
    const kind = s.kind as SuggestKind;
    const title = typeof s.title === "string" ? s.title.trim().replace(/\s+/g, " ") : "";
    const price = Number(s.pricePerPersonInr);
    if (!kinds.includes(kind) || title.length < 3 || title.length > 80 || seen.has(norm(title))) continue;
    if (!Number.isFinite(price) || price < 0 || price > MAX_PER_PERSON_INR) continue;
    seen.add(norm(title));
    out.push({
      kind,
      title,
      description: typeof s.description === "string" ? s.description.trim().slice(0, 200) : "",
      pricePaise: groupTotalPaise(kind, price, input.people, input.days),
      tags: [...new Set((Array.isArray(s.tags) ? s.tags : []).filter((t): t is TagId => typeof t === "string" && TAG_IDS.has(t)))],
    });
    if (out.length >= max) break;
  }
  return out;
}

type Template = { kind: SuggestKind; title: (d: string) => string; description: string; perPersonInr: number; tags: TagId[] };

// shortcut: a fixed list with rough 2026 prices, only used when Claude is unavailable; Claude's estimates replace it otherwise.
const PLACES: Template[] = [
  { kind: "destination", title: () => "Goa", description: "Beaches, shacks and nightlife.", perPersonInr: 2200, tags: ["beach", "nightlife"] },
  { kind: "destination", title: () => "Gokarna", description: "Quieter beaches and cliff walks.", perPersonInr: 1500, tags: ["beach", "relaxed"] },
  { kind: "destination", title: () => "Rishikesh", description: "Rafting, cafés by the Ganga and short hikes.", perPersonInr: 1400, tags: ["adventure", "nature"] },
  { kind: "destination", title: () => "Udaipur", description: "Lakes, palaces and rooftop dinners.", perPersonInr: 2000, tags: ["culture"] },
  { kind: "destination", title: () => "Pondicherry", description: "French quarter cafés and the promenade.", perPersonInr: 1800, tags: ["beach", "cafes"] },
  { kind: "destination", title: () => "Coorg", description: "Coffee estates, waterfalls and slow days.", perPersonInr: 2000, tags: ["nature", "relaxed"] },
  { kind: "destination", title: () => "Manali", description: "Mountains, snow points and Old Manali cafés.", perPersonInr: 1800, tags: ["nature", "adventure"] },
  { kind: "destination", title: () => "Jaipur", description: "Forts, bazaars and food walks.", perPersonInr: 1800, tags: ["culture", "shopping"] },
];
const THERE: Template[] = [
  { kind: "stay", title: (d) => `Budget guesthouse in ${d}`, description: "Simple shared rooms close to the action.", perPersonInr: 900, tags: ["relaxed"] },
  { kind: "food", title: () => "Local thali lunch", description: "Unlimited meals at a busy local place.", perPersonInr: 300, tags: ["veg"] },
  { kind: "activity", title: (d) => `Old town walk in ${d}`, description: "A morning on foot through the old quarter.", perPersonInr: 400, tags: ["culture"] },
  { kind: "stay", title: (d) => `Mid-range hotel in ${d}`, description: "Private rooms with breakfast included.", perPersonInr: 1800, tags: [] },
  { kind: "food", title: () => "Café-hopping morning", description: "Breakfast and coffee across two or three cafés.", perPersonInr: 500, tags: ["cafes"] },
  { kind: "activity", title: () => "Sunrise viewpoint", description: "An early start for the best light of the day.", perPersonInr: 150, tags: ["nature", "early"] },
  { kind: "stay", title: () => "Villa or homestay for the group", description: "One big place, everyone under one roof.", perPersonInr: 3200, tags: ["relaxed"] },
  { kind: "food", title: () => "Group dinner at a popular local spot", description: "A long table and the house specials.", perPersonInr: 800, tags: ["nightlife"] },
  { kind: "activity", title: (d) => `Day trip outside ${d}`, description: "A nearby waterfall, fort or lake for the day.", perPersonInr: 1500, tags: ["nature", "adventure"] },
  { kind: "food", title: () => "Street-food evening", description: "The stalls the locals queue at.", perPersonInr: 300, tags: [] },
  { kind: "activity", title: () => "Free afternoon, no plans", description: "Time off to nap, swim or wander.", perPersonInr: 0, tags: ["relaxed"] },
];

/** Built-in suggestions, best match for the group's likes first, skipping anything already on the board. */
export function fallbackSuggestions(input: SuggestInput, count: number): Suggestion[] {
  const seen = new Set(input.existingTitles.map(norm));
  const d = input.destination?.trim() ?? "";
  const fit = (t: Template) => t.tags.reduce((sum, tag) => sum + (input.groupPrefs[tag] ?? 0), 0);
  // Destinations rank by the group's likes; the THERE list is already ordered to mix stays, food and activities.
  const pool = d ? THERE : [...PLACES].sort((a, b) => fit(b) - fit(a));
  return pool
    .map((t) => ({ kind: t.kind, title: t.title(d), description: t.description, pricePaise: groupTotalPaise(t.kind, t.perPersonInr, input.people, input.days), tags: t.tags }))
    .filter((s) => !seen.has(norm(s.title)))
    .slice(0, count);
}
