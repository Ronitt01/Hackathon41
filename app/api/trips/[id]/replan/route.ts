import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { STOP_KINDS } from "@/lib/plan-candidates";
import { checkProposal, fallbackReplan, isAhead, istNow, pairWithExisting, parseReplanStops, rainChance, todayDay, TRIGGERS, type ReplanStop, type Trigger } from "@/lib/replan";
import { TAGS } from "@/lib/tags";
import { createClient } from "@/lib/supabase/server";

// Stops are member-writable under RLS and nothing private is read here, so the user's own client is enough (no service role).
type StopRow = {
  id: string; day: number; position: number; starts_at: string | null; title: string; kind: ReplanStop["kind"];
  location_name: string | null; cost_paise: number | string; tags: string[]; locked: boolean; branch: ReplanStop["branch"];
};

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

const toReplan = (s: StopRow): ReplanStop => ({
  startsAt: s.starts_at?.slice(0, 5) ?? null,
  title: s.title,
  kind: s.kind,
  costPaise: Number(s.cost_paise),
  tags: s.tags,
  locationName: s.location_name,
  branch: s.branch,
});

/** Session → membership → trip → today's stops of the active plan. */
async function loadToday(tripId: string) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail(401, "Please sign in first.");
  const { data: me } = await supabase.from("members").select("id").eq("trip_id", tripId).eq("user_id", auth.user.id).neq("status", "dropped").maybeSingle();
  if (!me) return fail(404, "Trip not found.");
  const { data: trip } = await supabase.from("trips").select("destination, start_date, end_date, active_plan_id").eq("id", tripId).single();
  if (!trip) return fail(404, "Trip not found.");
  if (!trip.active_plan_id) return NextResponse.json({ status: "no_plan" });
  const { today, time } = istNow();
  const { day, live } = todayDay(trip.start_date, trip.end_date, today);
  const { data: rows, error } = await supabase.from("stops").select("*").eq("plan_id", trip.active_plan_id).eq("day", day).order("position");
  if (error) return fail(500, "Couldn't load today's plan. Please try again.");
  const stops = (rows as StopRow[]).sort((a, b) => (a.starts_at ?? "99").localeCompare(b.starts_at ?? "99") || a.position - b.position);
  return { supabase, trip, planId: trip.active_plan_id as string, day, live, today, now: time, stops };
}

/** Open-Meteo: geocode the destination, then the highest rain chance for the rest of today. Null on any failure. */
async function rainForecast(destination: string | null, today: string, now: string): Promise<number | null> {
  if (!destination) return null;
  try {
    const signal = AbortSignal.timeout(3_000);
    const geo = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1`, { signal })).json();
    const place = geo?.results?.[0];
    if (typeof place?.latitude !== "number" || typeof place?.longitude !== "number") return null;
    const wx = await (
      await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&hourly=precipitation_probability&timezone=Asia%2FKolkata&forecast_days=1`, { signal })
    ).json();
    return rainChance(wx?.hourly?.time ?? [], wx?.hourly?.precipitation_probability ?? [], today, now);
  } catch {
    return null;
  }
}

const str = { type: "string" };
const obj = (properties: Record<string, unknown>) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });
const SCHEMA = obj({
  note: str,
  stops: { type: "array", items: obj({ startsAt: str, title: str, kind: { type: "string", enum: [...STOP_KINDS] }, costPaise: { type: "integer" }, tags: { type: "array", items: str }, locationName: str, branch: { type: "string", enum: ["A", "B", ""] } }) },
});
const SYSTEM = `You re-plan the rest of today for a friend group on a trip in India. Return the revised remaining stops as JSON.
Rules:
- trigger "rain": replace outdoor stops with indoor alternatives near the destination; keep meals and indoor stops.
- trigger "tired": fewer stops, closer together, relaxed; start with a rest; keep meals.
- trigger "delay": keep the same stops shifted later by delayMinutes; drop what no longer fits before 23:00.
- startsAt is "HH:MM" (24h), none earlier than "now" when given, or "" if untimed. 1 to 8 stops, in time order.
- Fixed stops stay as they are: plan around them and do not repeat them.
- costPaise is the total for the WHOLE group in paise (₹1 = 100 paise); 0 if unknown. tags use only the given tag ids. locationName may be "".
- branch: on a split day "A" or "B" is a stop only that half of the group does; keep each stop's branch, use "" for the whole group.
- note: one short, friendly sentence saying what changed.`;

/** Claude's rest-of-day, or null (no key, DEMO_MODE, slow, refused, or invalid) so the caller uses the rules. Sends no names or private data. */
async function aiReplan(input: { destination: string | null; trigger: Trigger; minutes: number; now: string | null; rain: number | null; stops: ReplanStop[]; fixed: ReplanStop[] }) {
  if (!process.env.ANTHROPIC_API_KEY || process.env.DEMO_MODE === "1") return null;
  try {
    const response = await new Anthropic().beta.messages.create(
      {
        model: process.env.CLAUDE_MODEL || "claude-opus-5-5",
        max_tokens: 8000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: JSON.stringify({
              destination: input.destination ?? "somewhere in India",
              trigger: input.trigger,
              delayMinutes: input.minutes,
              now: input.now,
              rainChancePercent: input.rain,
              remainingStops: input.stops,
              fixedStops: input.fixed,
              tagIds: TAGS.map((t) => t.id),
            }),
          },
        ],
      },
      { timeout: 15_000, maxRetries: 0 },
    );
    if (response.stop_reason !== "end_turn") throw new Error(`Claude stopped: ${response.stop_reason}`);
    const json = JSON.parse(response.content.find((b) => b.type === "text")?.text ?? "");
    const stops = parseReplanStops(json?.stops);
    if (!stops) throw new Error("Claude returned no valid stops");
    return { stops, note: typeof json.note === "string" && json.note.trim() ? json.note.trim().slice(0, 200) : "Here's a new plan for the rest of today." };
  } catch (err) {
    console.error("AI re-plan failed, using rules:", err);
    return null;
  }
}

/** T-1 propose: body { trigger: "rain" | "tired" | "delay", minutes? } → current vs proposed rest of today. Saves nothing. */
export async function POST(request: Request, ctx: RouteContext<"/api/trips/[id]/replan">) {
  const { id: tripId } = await ctx.params;
  const body = await request.json().catch(() => null);
  const trigger = body?.trigger as Trigger;
  if (!TRIGGERS.includes(trigger)) return fail(400, "Pick what changed: rain, tired or running late.");
  const minutes = trigger === "delay" ? Math.round(Number(body?.minutes)) : 0;
  if (trigger === "delay" && !(minutes >= 5 && minutes <= 600)) return fail(400, "Enter how late you're running, between 5 and 600 minutes.");

  const loaded = await loadToday(tripId);
  if (loaded instanceof NextResponse) return loaded;
  const { trip, day, live, today, now, stops } = loaded;
  const ahead = stops.filter((s) => !s.locked && isAhead(s.starts_at, now, live));
  if (!ahead.length) return NextResponse.json({ status: "empty", day });

  const current = ahead.map(toReplan);
  const fixed = stops.filter((s) => s.locked && isAhead(s.starts_at, now, live)).map(toReplan);
  // The forecast is for today's date, so it only means something on a live day.
  const rain = live ? await rainForecast(trip.destination, today, now) : null;
  const ai = await aiReplan({ destination: trip.destination, trigger, minutes, now: live ? now : null, rain, stops: current, fixed });
  // Claude may still time stops in the past or repeat a locked one; if nothing usable is left, use the rules.
  const aiStops = ai ? checkProposal(ai.stops, stops.filter((s) => s.locked), live ? now : null) : [];
  const proposal = ai && aiStops.length ? { stops: aiStops, note: ai.note } : fallbackReplan(current, trigger, minutes, live ? now : (current[0].startsAt ?? "10:00"));
  if (!proposal.stops.length) return NextResponse.json({ status: "empty", day });

  return NextResponse.json({
    status: "ok",
    day,
    live,
    rain,
    source: ai && aiStops.length ? "ai" : "rules",
    note: proposal.note,
    replaceIds: ahead.map((s) => s.id),
    current,
    proposal: proposal.stops,
  });
}

/** T-1 accept: body { replaceIds, stops } → those stops of today are replaced by the proposal in the active plan. */
export async function PUT(request: Request, ctx: RouteContext<"/api/trips/[id]/replan">) {
  const { id: tripId } = await ctx.params;
  const body = await request.json().catch(() => null);
  const replaceIds: unknown = body?.replaceIds;
  const parsed = parseReplanStops(body?.stops);
  if (!Array.isArray(replaceIds) || !replaceIds.length || replaceIds.length > 20 || !replaceIds.every((x) => typeof x === "string") || !parsed) {
    return fail(400, "That proposal isn't valid any more. Re-plan again.");
  }

  const loaded = await loadToday(tripId);
  if (loaded instanceof NextResponse) return loaded;
  const { supabase, planId, day, live, now, stops } = loaded;
  const ids = new Set(replaceIds as string[]);
  const old = stops.filter((s) => ids.has(s.id) && !s.locked);
  if (old.length !== ids.size) return fail(409, "Today's plan changed meanwhile. Re-plan again to see the latest.");
  const kept = stops.filter((s) => !ids.has(s.id));
  const proposal = checkProposal(parsed, kept.filter((s) => s.locked), live ? now : null);
  if (!proposal.length) return fail(400, "That proposal isn't valid any more. Re-plan again.");

  // A proposed stop that is a replaced one keeps its row (option, map pin, our price, ratings); only its time and position change.
  const pairs = pairWithExisting(proposal, old);
  const removed = old.filter((s) => !pairs.includes(s));
  // Whole day re-numbered by time: kept stops + the proposal.
  const merged = [
    ...kept.map((s) => ({ startsAt: s.starts_at?.slice(0, 5) ?? null, keep: s })),
    ...proposal.map((p, i) => ({ startsAt: p.startsAt, add: p, row: pairs[i] })),
  ].sort((a, b) => (a.startsAt ?? "99").localeCompare(b.startsAt ?? "99"));

  const failed = () => fail(500, "Couldn't update the plan. Please try again.");
  // Insert first, then delete: a failed accept never empties the day.
  const inserts = merged.flatMap((m, position) =>
    "add" in m && !m.row
      ? [{ trip_id: tripId, plan_id: planId, day, position, starts_at: m.add.startsAt, title: m.add.title, kind: m.add.kind, location_name: m.add.locationName, cost_paise: m.add.costPaise, tags: m.add.tags, branch: m.add.branch }]
      : [],
  );
  const { data: added, error: insertError } = inserts.length ? await supabase.from("stops").insert(inserts).select("id") : { data: [], error: null };
  if (insertError) {
    console.error("replan: insert failed", insertError);
    return failed();
  }
  if (removed.length) {
    const { error: deleteError } = await supabase.from("stops").delete().in("id", removed.map((s) => s.id)).eq("plan_id", planId);
    if (deleteError) {
      if (added?.length) await supabase.from("stops").delete().in("id", added.map((s) => s.id));
      console.error("replan: delete failed", deleteError);
      return failed();
    }
  }
  const updates = await Promise.all(
    merged.flatMap((m, position) => {
      if ("keep" in m) return m.keep.position !== position ? [supabase.from("stops").update({ position }).eq("id", m.keep.id)] : [];
      return m.row ? [supabase.from("stops").update({ position, starts_at: m.add.startsAt }).eq("id", m.row.id)] : [];
    }),
  );
  const updateError = updates.find((r) => r.error)?.error;
  if (updateError) {
    console.error("replan: update failed", updateError);
    return failed();
  }
  return NextResponse.json({ status: "ok" });
}
