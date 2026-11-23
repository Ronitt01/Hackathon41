// D-6 chat-to-plan: WhatsApp export → plain message lines (no timestamps, names, mentions or phone numbers),
// a keyword extractor for when Claude isn't available, and validation of Claude's proposals. Pure, no I/O.
import { inr } from "./money.ts";
import { TAGS, type TagId } from "./tags.ts";

export const MAX_CHAT_CHARS = 200_000;
export const OPTION_KINDS = ["destination", "stay", "activity", "food", "transport", "other"] as const;
export type Proposal = { kind: (typeof OPTION_KINDS)[number]; title: string; tags: TagId[] };

// "23/11/26, 10:15 pm - " (Android), "[23/11/26, 10:15:32 PM] " (iOS) or "[10:15 pm, 23/11/2026] " (copied messages);
// \s also covers WhatsApp's narrow no-break space.
const TIME = String.raw`\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\s*(?:[ap]\.?\s?m\.?)?`;
const STAMP = new RegExp(
  String.raw`^(?:\[?\d{1,2}[./-]\d{1,2}[./-]\d{2,4},?\s+${TIME}\]?|\[${TIME},\s*\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?\])\s*(?:[-–]\s*)?`,
  "i",
);
const SENDER = /^[^:]{1,60}:\s?/;
// Pasted text has no stamp to anchor on, so only 1–4 digit-free words count as a name ("go at 10:30" stays text).
// shortcut: a digit-free label like "Budget: 10k" is dropped as if it were a name; privacy beats keeping the label.
const PASTED_SENDER = /^(?:[^\s:\d]+ ){0,3}[^\s:\d]+:\s?/;
const MEDIA = /^<?(?:media|image|video|audio|sticker|gif|document) omitted>?$|^(?:this message was deleted|you deleted this message|<this message was edited>|null)$/i;

/** Message text only, one entry per line. Lines without a sender (joins, "added", encryption notice) are dropped. */
export function parseChat(raw: string): string[] {
  const lines = raw.slice(0, MAX_CHAT_CHARS).replace(/[‎‏]/g, "").split(/\r?\n/);
  const stamped = lines.some((l) => STAMP.test(l));
  const out: string[] = [];
  let inMessage = false;
  for (const line of lines) {
    let text: string;
    if (stamped && STAMP.test(line)) {
      const rest = line.replace(STAMP, "");
      inMessage = SENDER.test(rest);
      if (!inMessage) continue; // system line
      text = rest.replace(SENDER, "");
    } else if (stamped) {
      if (!inMessage) continue;
      text = line; // continuation of a multi-line message
    } else {
      text = line.replace(/^\[[^\]]*\]\s*/, "").replace(PASTED_SENDER, ""); // pasted text: drop a "[stamp]" and "Name:" prefix
    }
    text = scrub(text);
    if (text && !MEDIA.test(text)) out.push(text);
  }
  return out;
}

/** Remove @mentions and phone numbers; collapse spaces. */
function scrub(text: string): string {
  return text
    .replace(/@⁨[^⁩]*⁩/g, "") // WhatsApp wraps a mentioned name in isolates: "@⁨Rahul Sharma⁩"
    .replace(/[⁦-⁩]/g, "")
    .replace(/@[\p{L}\p{N}_]+/gu, "")
    .replace(/\+\d[\d\s-]{8,}\d|\b\d{10,}\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// shortcut: fixed keyword lists, upgrade by adding places/activities as demo chats show gaps.
const PLACES: [string, TagId[]][] = [
  ["Goa", ["beach", "nightlife"]], ["Gokarna", ["beach", "relaxed"]], ["Varkala", ["beach", "cafes"]], ["Pondicherry", ["beach", "cafes"]],
  ["Andaman", ["beach", "adventure"]], ["Alibaug", ["beach", "relaxed"]], ["Manali", ["nature", "adventure"]], ["Kasol", ["nature", "relaxed"]],
  ["Rishikesh", ["adventure", "nature"]], ["Shimla", ["nature"]], ["Kasauli", ["nature", "relaxed"]], ["McLeodganj", ["nature", "cafes"]],
  ["Dharamshala", ["nature", "culture"]], ["Leh", ["adventure", "nature"]], ["Ladakh", ["adventure", "nature"]], ["Spiti", ["adventure", "nature"]],
  ["Mussoorie", ["nature"]], ["Nainital", ["nature", "relaxed"]], ["Auli", ["adventure", "nature"]], ["Lansdowne", ["nature", "relaxed"]],
  ["Udaipur", ["culture"]], ["Jaipur", ["culture", "shopping"]], ["Jaisalmer", ["culture", "adventure"]], ["Pushkar", ["culture", "cafes"]],
  ["Mount Abu", ["nature"]], ["Hampi", ["culture", "nature"]], ["Coorg", ["nature", "relaxed"]], ["Chikmagalur", ["nature", "relaxed"]],
  ["Wayanad", ["nature"]], ["Munnar", ["nature", "relaxed"]], ["Alleppey", ["relaxed", "nature"]], ["Ooty", ["nature"]],
  ["Kodaikanal", ["nature"]], ["Lonavala", ["nature"]], ["Mahabaleshwar", ["nature"]], ["Darjeeling", ["nature", "culture"]],
  ["Gangtok", ["nature", "culture"]], ["Shillong", ["nature", "cafes"]], ["Meghalaya", ["nature", "adventure"]], ["Kutch", ["culture"]],
];
const ACTIVITIES: [RegExp, string, Proposal["kind"], TagId[]][] = [
  [/\btrek|\bhike|\bhiking/i, "Trek", "activity", ["nature", "adventure"]],
  [/paraglid/i, "Paragliding", "activity", ["adventure"]],
  [/rafting/i, "River rafting", "activity", ["adventure"]],
  [/scuba|snorkel/i, "Scuba or snorkelling", "activity", ["adventure", "beach"]],
  [/bungee|bungy/i, "Bungee jump", "activity", ["adventure"]],
  [/camping|\bcamp\b/i, "Camping", "activity", ["nature"]],
  [/bonfire/i, "Bonfire night", "activity", ["relaxed"]],
  [/beach/i, "Beach day", "activity", ["beach", "relaxed"]],
  [/sunrise|sunset/i, "Sunset point", "activity", ["nature"]],
  [/\bfort\b|palace|museum|temple/i, "Sightseeing", "activity", ["culture"]],
  [/\bclub|\bparty|\bpub\b|\bbar\b/i, "Night out", "activity", ["nightlife"]],
  [/shopping|market|flea/i, "Market visit", "activity", ["shopping"]],
  [/\bcaf[eé]/i, "Café hopping", "food", ["cafes"]],
  [/seafood|thali|street food|dhaba/i, "Local food trail", "food", []],
];
const MONTH = "(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*";
const ORD = "(?:st|nd|rd|th)?";
const DAY_FIRST = new RegExp(`\\b(\\d{1,2})${ORD}\\s*(?:-|–|to|till)\\s*(\\d{1,2})${ORD}\\s*${MONTH}`, "gi");
const MONTH_FIRST = new RegExp(`\\b${MONTH}\\s+(\\d{1,2})${ORD}\\s*(?:-|–|to|till)\\s*(\\d{1,2})${ORD}`, "gi");
const AMOUNT = /(?:₹|\brs\.?|\binr)\s?(\d[\d,]*(?:\.\d+)?)\s?(k)?\b|\b(\d+(?:\.\d+)?)\s?k\b/gi;

/** Keyword fallback: destinations and activities by mentions, date ranges, one group budget range. */
export function extractKeywords(lines: string[]): Proposal[] {
  const text = lines.join("\n");
  const count = (re: RegExp) => (text.match(new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g")) ?? []).length;
  const byMentions = <T>(items: T[], re: (t: T) => RegExp) =>
    items.map((t) => ({ t, n: count(re(t)) })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n).map((x) => x.t);

  const out: Proposal[] = [
    ...byMentions(PLACES, ([name]) => new RegExp(`\\b${name}\\b`, "i")).slice(0, 5)
      .map(([title, tags]): Proposal => ({ kind: "destination", title, tags })),
    ...byMentions(ACTIVITIES, ([re]) => re).slice(0, 6).map(([, title, kind, tags]): Proposal => ({ kind, title, tags })),
  ];

  const ranges = new Set<string>();
  const cap = (m: string) => m[0].toUpperCase() + m.slice(1, 3).toLowerCase();
  for (const m of text.matchAll(DAY_FIRST)) ranges.add(`${m[1]}–${m[2]} ${cap(m[3])}`);
  for (const m of text.matchAll(MONTH_FIRST)) ranges.add(`${m[2]}–${m[3]} ${cap(m[1])}`);
  for (const r of [...ranges].slice(0, 3)) out.push({ kind: "other", title: `Dates: ${r}`, tags: [] });

  const rupees: number[] = [];
  for (const m of text.matchAll(AMOUNT)) {
    const n = Number((m[1] ?? m[3]).replace(/,/g, "")) * (m[2] || m[3] ? 1000 : 1);
    if (n >= 500 && n <= 1_000_000) rupees.push(n); // ignore chai money and typos
  }
  if (rupees.length) {
    const lo = Math.min(...rupees) * 100, hi = Math.max(...rupees) * 100;
    out.push({ kind: "other", title: lo === hi ? `Budget: around ${inr(lo)}` : `Budget: ${inr(lo)}–${inr(hi)}`, tags: [] });
  }
  return out;
}

const TAG_IDS = new Set<string>(TAGS.map((t) => t.id));

/** Validate Claude's JSON: known kinds, 1–120 char titles, known tags, no duplicate titles, at most 20. */
export function parseProposals(json: unknown): Proposal[] {
  const list = (json as { proposals?: unknown } | null)?.proposals;
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: Proposal[] = [];
  for (const p of list as { kind?: unknown; title?: unknown; tags?: unknown }[]) {
    const title = typeof p?.title === "string" ? p.title.trim().slice(0, 120) : "";
    if (!title || seen.has(title.toLowerCase())) continue;
    seen.add(title.toLowerCase());
    const kind = OPTION_KINDS.find((k) => k === p.kind) ?? "other";
    const tags = Array.isArray(p.tags) ? [...new Set(p.tags.filter((t): t is TagId => typeof t === "string" && TAG_IDS.has(t)))] : [];
    out.push({ kind, title, tags });
    if (out.length === 20) break;
  }
  return out;
}
