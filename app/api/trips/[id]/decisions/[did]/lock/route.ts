import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { fallbackCompromise, leaders, rankOptions } from "@/lib/decisions";
import { createAdminClient, MISSING_SECRET_KEY } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });
const STUCK_MS = 60_000; // a lock claimed this long ago without an outcome crashed mid-way; let it be retried

type OptionRow = { id: string; title: string; kind: string; tags: string[]; vetoed_at: string | null };

/**
 * D-5: lock a decision on its leading option (likes + 3×Roses). Anyone may lock once the deadline has passed;
 * only organizers may lock early. A tie becomes a compromise option (Claude's one-liner, or a fallback) that locks.
 */
export async function POST(_request: Request, ctx: RouteContext<"/api/trips/[id]/decisions/[did]/lock">) {
  const { id: tripId, did } = await ctx.params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail(401, "Please sign in first.");
  const { data: me } = await supabase.from("members").select("id, role").eq("trip_id", tripId).eq("user_id", auth.user.id).neq("status", "dropped").maybeSingle();
  if (!me) return fail(404, "Trip not found.");

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return fail(503, MISSING_SECRET_KEY);
  }

  const { data: decision } = await admin.from("decisions").select("id, question, deadline, locked_at, locked_option_id").eq("id", did).eq("trip_id", tripId).maybeSingle();
  if (!decision) return fail(404, "Decision not found.");
  if (decision.locked_option_id) return NextResponse.json({ status: "locked" });
  const due = decision.deadline && Date.parse(decision.deadline) <= Date.now();
  if (!due && me.role !== "organizer") return fail(403, "Only the organizer can lock this before the deadline.");

  const [options, reactions] = await Promise.all([
    admin.from("options").select("id, title, kind, tags, vetoed_at").eq("decision_id", did).order("created_at"),
    admin.from("reactions").select("option_id, aspect_id, kind").eq("trip_id", tripId),
  ]);
  if (options.error || reactions.error) {
    console.error("lock: load failed", options.error ?? reactions.error);
    return fail(500, "Couldn't load the decision. Please try again.");
  }
  const rows = options.data as OptionRow[];
  const top = leaders(rankOptions(rows, reactions.data));
  if (!top.length) return fail(409, "Add at least one option (not vetoed) to this decision first.");
  // A 0–0 tie isn't a deadlock to break with a compromise; a lone option with no votes may still lock.
  if (top.length > 1 && top[0].score === 0) return fail(409, "Nobody has voted yet, so nothing can lock.");

  // Claim the lock first so simultaneous page loads don't both ask Claude or add two compromises.
  const now = new Date().toISOString();
  const { data: claimed, error: claimError } = await admin
    .from("decisions")
    .update({ locked_at: now })
    .eq("id", did)
    .is("locked_option_id", null)
    .or(`locked_at.is.null,locked_at.lt."${new Date(Date.now() - STUCK_MS).toISOString()}"`)
    .select("id");
  if (claimError) {
    console.error("lock: claim failed", claimError);
    return fail(500, "Couldn't lock the decision. Please try again.");
  }
  if (!claimed.length) return NextResponse.json({ status: "locking" }); // someone else is locking it; realtime shows the result

  let lockedId = top[0].id;
  let compromiseId: string | null = null;
  if (top.length > 1) {
    const tied = top.map((t) => rows.find((r) => r.id === t.id)!);
    const title = await compromise(decision.question, tied.map((t) => t.title));
    const { data: added, error } = await admin
      .from("options")
      .insert({
        trip_id: tripId,
        decision_id: did,
        kind: tied[0].kind,
        title,
        description: `Compromise between ${tied.map((t) => t.title).join(", ")} (it was a tie).`,
        tags: [...new Set(tied.flatMap((t) => t.tags))].slice(0, 6),
        source: "ai",
      })
      .select("id")
      .single();
    if (error || !added) {
      console.error("lock: compromise insert failed", error);
      await admin.from("decisions").update({ locked_at: null }).eq("id", did);
      return fail(500, "Couldn't lock the decision. Please try again.");
    }
    lockedId = compromiseId = added.id;
  }

  const { error } = await admin.from("decisions").update({ locked_option_id: lockedId, locked_at: now }).eq("id", did);
  if (error) {
    console.error("lock: save failed", error);
    if (compromiseId) await admin.from("options").delete().eq("id", compromiseId);
    await admin.from("decisions").update({ locked_at: null }).eq("id", did);
    return fail(500, "Couldn't lock the decision. Please try again.");
  }
  return NextResponse.json({ status: "locked", optionId: lockedId, tie: top.length > 1 });
}

/** One-line compromise between tied options. Only the question and option titles reach Claude. */
async function compromise(question: string, titles: string[]): Promise<string> {
  const fallback = fallbackCompromise(titles);
  if (!process.env.ANTHROPIC_API_KEY || process.env.DEMO_MODE === "1") return fallback;
  try {
    const response = await new Anthropic().beta.messages.create(
      {
        model: process.env.CLAUDE_MODEL || "claude-opus-5-5",
        max_tokens: 2000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: {
          effort: "low",
          format: {
            type: "json_schema",
            schema: { type: "object", properties: { suggestion: { type: "string" } }, required: ["suggestion"], additionalProperties: false },
          },
        },
        system:
          "A group of friends planning a trip in India is tied between options. Suggest ONE short, concrete compromise that gives everyone a bit of what they wanted, under 100 characters, e.g. \"Gokarna for 2 nights, then a day trip to South Goa\". No preamble.",
        messages: [{ role: "user", content: JSON.stringify({ question, tiedOptions: titles }) }],
      },
      { timeout: 15_000, maxRetries: 0 },
    );
    if (response.stop_reason !== "end_turn") throw new Error(`Claude stopped: ${response.stop_reason}`);
    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    const suggestion = (JSON.parse(text) as { suggestion?: unknown }).suggestion;
    if (typeof suggestion !== "string" || !suggestion.trim()) throw new Error("Claude returned no suggestion");
    return suggestion.trim().slice(0, 120);
  } catch (err) {
    console.error("lock: compromise failed, using fallback:", err);
    return fallback;
  }
}
