import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { TAGS } from "./tags.ts";
import { deterministicCandidates, parseAiCandidates, STOP_KINDS, type Candidate, type PlanOption, type PlanStop, type ReactionCounts } from "./plan-candidates.ts";

/** Only aggregates: no names, budgets or per-member answers ever reach Claude. */
export type PlanInput = {
  destination: string | null;
  days: number;
  options: PlanOption[];
  reactions: ReactionCounts;
  locked: PlanStop[];
  memberCount: number;
  groupPrefs: Record<string, number>; // sum of prefs over members, per tag
  homeCities: string[];
};

const str = { type: "string" };
const int = { type: "integer" };
const obj = (properties: Record<string, unknown>) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });
const SCHEMA = obj({
  candidates: {
    type: "array",
    items: obj({
      stayOptionId: str,
      stops: {
        type: "array",
        items: obj({ day: int, startsAt: str, title: str, kind: { type: "string", enum: [...STOP_KINDS] }, costPaise: int, tags: { type: "array", items: str }, optionId: str }),
      },
      travel: { type: "array", items: obj({ city: str, paise: int }) },
    }),
  },
});

const SYSTEM = `You plan group trips in India for friend groups. Propose 3 to 5 genuinely different candidate itineraries as JSON.
Rules:
- Prefer the group's options (use their exact id in optionId); you may add a few well-known local stops with optionId "".
- stayOptionId is the id of one option of kind "stay", or "" for none. Add its check-in as a "stay" stop on day 1 with that optionId.
- day is 1..days. startsAt is "HH:MM" (24h). Two or three stops a day, meals around 13:00.
- costPaise is the total for the WHOLE group in paise (₹1 = 100 paise). tags use only the given tag ids.
- Locked stops are fixed and added automatically: plan around them and do not repeat them.
- travel: estimated return travel cost per person in paise from each home city to the destination (e.g. train or budget flight).
- Range from a lean, budget-friendly plan to a fuller one, so at least one fits a tight budget.`;

/** Claude's 3–5 candidates plus the deterministic ones, or only the deterministic generator when there is no key, DEMO_MODE=1, or anything goes wrong. */
export async function generateCandidates(input: PlanInput): Promise<Candidate[]> {
  const fallback = () => deterministicCandidates(input.days, input.options, input.reactions, input.locked);
  if (!process.env.ANTHROPIC_API_KEY || process.env.DEMO_MODE === "1") return fallback();
  try {
    const response = await new Anthropic().beta.messages.create(
      {
        model: process.env.CLAUDE_MODEL || "claude-opus-5-5",
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: JSON.stringify({
              destination: input.destination ?? "somewhere in India",
              days: input.days,
              people: input.memberCount,
              options: input.options,
              likesAndRoses: input.reactions,
              groupTagPreferences: input.groupPrefs, // sum over members: 1 = love, -1 = rather not
              lockedStops: input.locked.map(({ day, startsAt, title, kind, costPaise }) => ({ day, startsAt, title, kind, costPaise })),
              homeCities: input.homeCities,
              tagIds: TAGS.map((t) => t.id),
            }),
          },
        ],
      },
      { timeout: 15_000, maxRetries: 0 }, // keeps the whole request under the 20 s target; slower → deterministic fallback
    );
    if (response.stop_reason !== "end_turn") throw new Error(`Claude stopped: ${response.stop_reason}`);
    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    const candidates = parseAiCandidates(JSON.parse(text), input.days, input.options, input.locked);
    if (!candidates.length) throw new Error("Claude returned no valid candidates");
    // Also score our own plans (incl. the lean one) so "fits everyone" never hinges on the model's pricing.
    // Travel to the destination doesn't depend on the plan: reuse Claude's highest estimate per city.
    const travel: Record<string, number> = {};
    for (const c of candidates) for (const [city, p] of Object.entries(c.travelPaiseByCity)) travel[city] = Math.max(travel[city] ?? 0, p);
    return [...candidates, ...fallback().map((c) => ({ ...c, travelPaiseByCity: travel }))];
  } catch (err) {
    console.error("AI plan failed, using deterministic candidates:", err);
    return fallback();
  }
}
