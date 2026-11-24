import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { tripDays } from "@/lib/plan-candidates";
import { fallbackSuggestions, kindsFor, MAX_AI_OPTIONS, parseSuggestions, type SuggestInput, type Suggestion } from "@/lib/suggest";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { TAGS } from "@/lib/tags";

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/**
 * Kafila suggests options so nobody has to research from scratch. Body { auto?: boolean }: `auto` (the Decide tab
 * opening) only fills a trip that has no suggestions of the current kind yet; "Suggest more" always adds a few.
 * Inserted as the caller, so the normal options RLS applies. Claude sees only aggregates.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/trips/[id]/suggest">) {
  const { id: tripId } = await ctx.params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail(401, "Please sign in first.");
  const { data: me } = await supabase.from("members").select("id").eq("trip_id", tripId).eq("user_id", auth.user.id).neq("status", "dropped").maybeSingle();
  if (!me) return fail(404, "Trip not found.");
  const body = (await request.json().catch(() => ({}))) as { auto?: unknown };
  const auto = body.auto === true;

  const [trip, options, members] = await Promise.all([
    supabase.from("trips").select("destination, start_date, end_date").eq("id", tripId).single(),
    supabase.from("options").select("title, kind, source").eq("trip_id", tripId),
    supabase.from("members").select("id", { count: "exact", head: true }).eq("trip_id", tripId).neq("status", "dropped"),
  ]);
  if (trip.error || options.error || members.error) return fail(500, "Couldn't load the trip. Please try again.");

  const destination = trip.data.destination?.trim() || null;
  const kinds = kindsFor(destination);
  const existing = options.data as { title: string; kind: string; source: string }[];
  const ai = existing.filter((o) => o.source === "ai");
  // shortcut: two people opening Decide in the same second can both auto-fill; a unique index would stop it if that shows up.
  if (auto && ai.some((o) => (kinds as string[]).includes(o.kind))) return NextResponse.json({ added: 0 });
  if (ai.length >= MAX_AI_OPTIONS) return fail(429, "That's plenty of ideas. Vote on these, or add your own.");

  const input: SuggestInput = {
    destination,
    days: tripDays(trip.data.start_date, trip.data.end_date),
    people: members.count ?? 1,
    groupPrefs: await groupPrefs(tripId),
    existingTitles: existing.map((o) => o.title),
  };
  const count = Math.min(auto ? (destination ? 9 : 5) : 6, MAX_AI_OPTIONS - ai.length);
  const fromAi = await fromClaude(input, count);
  const suggestions = fromAi ?? fallbackSuggestions(input, count);
  if (!suggestions.length) return NextResponse.json({ added: 0 });

  const { error } = await supabase.from("options").insert(
    suggestions.map((s) => ({ trip_id: tripId, kind: s.kind, title: s.title, description: s.description || null, price_paise: s.pricePaise, tags: s.tags, source: "ai", created_by: me.id })),
  );
  if (error) return fail(500, "Couldn't add the suggestions. Please try again.");
  return NextResponse.json({ added: suggestions.length, source: fromAi ? "ai" : "builtin" });
}

/** Sum of everyone's likes per tag. Reads other members' private rows, so it needs the service role; only the sum leaves. */
async function groupPrefs(tripId: string): Promise<Record<string, number>> {
  try {
    const { data } = await createAdminClient().from("member_private").select("prefs").eq("trip_id", tripId);
    const sum: Record<string, number> = {};
    for (const row of data ?? []) for (const [tag, v] of Object.entries((row.prefs ?? {}) as Record<string, number>)) sum[tag] = (sum[tag] ?? 0) + Number(v || 0);
    return sum;
  } catch {
    return {}; // no secret key: suggest without the group's likes
  }
}

const SYSTEM = `You suggest options for a friend group's trip in India, as JSON. The group will vote on them.
- Only real, well-known places or kinds of places. Never invent addresses, phone numbers, ratings or opening hours.
- pricePerPersonInr is a realistic 2026 estimate in rupees for ONE person: stays per night when sharing rooms, food per meal, activities per person, destinations per day there (not counting travel to get there).
- Mix cheap, mid-range and one splurge, so someone on a tight budget still has choices.
- Lean towards what the group likes (groupTagPreferences: positive = liked, negative = rather not).
- Titles under 60 characters, description one short sentence. tags only from the given tag ids. Never repeat an existing title.`;

async function fromClaude(input: SuggestInput, count: number): Promise<Suggestion[] | null> {
  if (!process.env.ANTHROPIC_API_KEY || process.env.DEMO_MODE === "1") return null;
  const kinds = kindsFor(input.destination);
  try {
    const response = await new Anthropic().beta.messages.create(
      {
        model: process.env.CLAUDE_MODEL || "claude-opus-5-5",
        max_tokens: 4000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: {
          effort: "low",
          format: {
            type: "json_schema",
            schema: {
              type: "object",
              properties: {
                suggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      kind: { type: "string", enum: kinds },
                      title: { type: "string" },
                      description: { type: "string" },
                      pricePerPersonInr: { type: "integer" },
                      tags: { type: "array", items: { type: "string", enum: TAGS.map((t) => t.id) } },
                    },
                    required: ["kind", "title", "description", "pricePerPersonInr", "tags"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["suggestions"],
              additionalProperties: false,
            },
          },
        },
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: JSON.stringify({
              want: input.destination ? `${count} options spread across ${kinds.join(", ")} in ${input.destination}` : `${count} destinations in India for this group`,
              days: input.days,
              people: input.people,
              groupTagPreferences: input.groupPrefs,
              existingTitles: input.existingTitles,
              tagIds: TAGS.map((t) => t.id),
            }),
          },
        ],
      },
      { timeout: 15_000, maxRetries: 0 },
    );
    if (response.stop_reason !== "end_turn") throw new Error(`Claude stopped: ${response.stop_reason}`);
    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    const out = parseSuggestions(JSON.parse(text), input, count);
    return out.length ? out : null;
  } catch (err) {
    console.error("suggest: Claude failed, using built-in suggestions:", err instanceof Error ? err.message : "unknown");
    return null;
  }
}
