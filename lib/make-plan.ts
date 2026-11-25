import "server-only";
import { generateCandidates } from "@/lib/ai";
import { pickFairPlan, scoreCandidate, type FairMember } from "@/lib/fairness";
import { applyTaste, tripDays, type PlanStop, type ReactionCounts } from "@/lib/plan-candidates";
import type { createAdminClient } from "@/lib/supabase/admin";
import { tasteWeights } from "@/lib/taste";

type MemberRow = { id: string; user_id: string; role: string; home_city: string | null };
type PrivateRow = { member_id: string; budget_paise: number | null; prefs: Record<string, number> | null };
type OptionRow = { id: string; kind: string; title: string; price_paise: number | null; tags: string[] };
type ReactionRow = { member_id: string; option_id: string; kind: string };
type StopRow = { day: number; position: number; starts_at: string | null; title: string; kind: PlanStop["kind"]; location_name: string | null; cost_paise: number; tags: string[]; option_id: string | null; branch: PlanStop["branch"] };

type Admin = ReturnType<typeof createAdminClient>;
export type PlanResult =
  | { status: "ok"; planId?: string; candidates: number; overBudget: number }
  | { status: "no_fit"; candidates: number; overBudget: number }
  | { status: "no_options" }
  | { status: "error"; message: string };

/**
 * A-1/A-2: generate candidates → keep those inside every private budget → pick the fairest → save.
 * Shared by the "Make the fair plan" button and the automatic plan. Returns no private data.
 */
export async function makeFairPlan(admin: Admin, tripId: string): Promise<PlanResult> {
  const { data: trip, error: tripError } = await admin.from("trips").select("destination, start_date, end_date, active_plan_id, previous_trip_id").eq("id", tripId).single();
  if (tripError || !trip) return { status: "error", message: "Couldn't load the trip. Please try again." };
  const [members, privates, options, reactions, locked] = await Promise.all([
    admin.from("members").select("id, user_id, role, home_city").eq("trip_id", tripId).neq("status", "dropped"),
    admin.from("member_private").select("member_id, budget_paise, prefs").eq("trip_id", tripId),
    admin.from("options").select("id, kind, title, price_paise, tags").eq("trip_id", tripId).is("vetoed_at", null),
    admin.from("reactions").select("member_id, option_id, kind").eq("trip_id", tripId),
    trip.active_plan_id
      ? admin.from("stops").select("day, position, starts_at, title, kind, location_name, cost_paise, tags, option_id, branch").eq("plan_id", trip.active_plan_id).eq("locked", true)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const loadError = members.error ?? privates.error ?? options.error ?? reactions.error ?? locked.error;
  if (loadError) {
    console.error("plan: load failed", loadError);
    return { status: "error", message: "Couldn't load the trip. Please try again." };
  }

  const privateById = new Map((privates.data as PrivateRow[]).map((p) => [p.member_id, p]));
  const fairMembers: FairMember[] = (members.data as MemberRow[]).map((m) => ({
    id: m.id,
    homeCity: m.home_city,
    budgetPaise: privateById.get(m.id)?.budget_paise ?? null,
    prefs: privateById.get(m.id)?.prefs ?? {},
  }));
  const optionRows = options.data as OptionRow[];
  const planOptions = optionRows.map((o) => ({ id: o.id, kind: o.kind, title: o.title, pricePaise: o.price_paise, tags: o.tags }));
  // Nothing to plan with: don't replace the current itinerary (and its unpinned stops) with locked stops only.
  if (!planOptions.some((o) => ["activity", "food", "stay"].includes(o.kind))) return { status: "no_options" };
  const reactionRows = (reactions.data as ReactionRow[]).map((r) => ({ memberId: r.member_id, optionId: r.option_id, kind: r.kind }));
  const reactionCounts: ReactionCounts = {};
  for (const r of reactionRows) {
    const c = (reactionCounts[r.optionId] ??= { likes: 0, roses: 0 });
    if (r.kind === "rose") c.roses++;
    else c.likes++;
  }
  const groupPrefs: Record<string, number> = {};
  for (const m of fairMembers) for (const [tag, v] of Object.entries(m.prefs)) groupPrefs[tag] = (groupPrefs[tag] ?? 0) + (Number(v) || 0);
  // W-2: the group's taste from the previous trip nudges candidates towards tags it rated 4+.
  const organizerUserIds = (members.data as MemberRow[]).filter((m) => m.role === "organizer").map((m) => m.user_id);
  const taste = await previousTripTaste(admin, trip.previous_trip_id, organizerUserIds);
  for (const [tag, w] of Object.entries(taste)) groupPrefs[tag] = (groupPrefs[tag] ?? 0) + w;
  const lockedStops: PlanStop[] = (locked.data as StopRow[]).map((s) => ({
    day: s.day,
    position: s.position,
    startsAt: s.starts_at?.slice(0, 5) ?? null, // Postgres time "10:00:00" → "10:00"
    title: s.title,
    kind: s.kind,
    costPaise: s.cost_paise,
    tags: s.tags,
    optionId: s.option_id,
    locationName: s.location_name,
    branch: s.branch,
  }));

  const candidates = await generateCandidates({
    destination: trip.destination,
    days: tripDays(trip.start_date, trip.end_date),
    options: planOptions,
    reactions: applyTaste(reactionCounts, planOptions, taste), // shortcut: Claude sees the nudge as fractional likes
    locked: lockedStops,
    memberCount: fairMembers.length,
    groupPrefs,
    homeCities: [...new Set(fairMembers.map((m) => m.homeCity).filter((c): c is string => !!c))],
  });
  const best = pickFairPlan(candidates, fairMembers, planOptions, reactionRows);
  // For the reveal: counts only, never which member's budget a candidate broke.
  const counts = {
    candidates: candidates.length,
    overBudget: candidates.filter((c) => !scoreCandidate(c, fairMembers, planOptions, reactionRows).feasible).length,
  };
  if (!best) return { status: "no_fit", ...counts }; // never say whose budget
  const winner = candidates[best.index];

  // Save. If anything after the plan insert fails, delete the new plan (cascades to stops + plan_members).
  const { data: plan, error: planError } = await admin
    .from("plans")
    .insert({
      trip_id: tripId,
      status: "chosen",
      generated_by: "ai",
      stay_option_id: winner.stayOptionId,
      group_cost_paise: best.groupCostPaise,
      min_satisfaction: best.minSatisfaction,
      mean_satisfaction: best.meanSatisfaction,
    })
    .select("id")
    .single();
  if (planError || !plan) {
    console.error("plan: insert plan failed", planError);
    return { status: "error", message: "Couldn't save the plan. Please try again." };
  }
  const writes = [
    () =>
      admin.from("stops").insert(
        winner.stops.map((s) => ({
          trip_id: tripId,
          plan_id: plan.id,
          day: s.day,
          position: s.position,
          starts_at: s.startsAt,
          title: s.title,
          kind: s.kind,
          location_name: s.locationName ?? null,
          cost_paise: s.costPaise,
          tags: s.tags,
          option_id: s.optionId,
          locked: !!s.locked,
          branch: s.branch ?? null,
        })),
      ),
    () =>
      admin.from("plan_members").insert(
        best.members.map((m) => ({
          plan_id: plan.id,
          member_id: m.memberId,
          trip_id: tripId,
          travel_paise: m.travelPaise,
          total_paise: m.totalPaise,
          satisfaction: m.satisfaction,
          why: m.why.join("\n"),
        })),
      ),
    () => {
      // Compare-and-swap: only replace the plan we read, so two simultaneous clicks can't leave two chosen plans.
      const swap = admin.from("trips").update({ active_plan_id: plan.id }).eq("id", tripId);
      return (trip.active_plan_id ? swap.eq("active_plan_id", trip.active_plan_id) : swap.is("active_plan_id", null)).select("id");
    },
  ];
  for (const write of writes) {
    const { data, error } = await write();
    if (error || (data && data.length === 0)) {
      await admin.from("plans").delete().eq("id", plan.id);
      if (!error) return { status: "ok", ...counts }; // someone else's new plan landed first; realtime shows it
      console.error("plan: save failed", error); // server log only: plan_members errors can echo private values
      return { status: "error", message: "Couldn't save the plan. Please try again." };
    }
  }
  if (trip.active_plan_id) await admin.from("plans").update({ status: "discarded" }).eq("id", trip.active_plan_id);

  return { status: "ok", planId: plan.id, ...counts };
}

/**
 * Tag weights from the previous trip's stop ratings (aggregates only, no names). Used only when a current organizer
 * was on that trip (the same rule as the picker, which lists only the organizer's own trips), so nobody can pull
 * taste data from a stranger's trip by its id.
 */
async function previousTripTaste(admin: Admin, previousTripId: string | null, organizerUserIds: string[]): Promise<Record<string, number>> {
  if (!previousTripId || !organizerUserIds.length) return {};
  const { data: shared } = await admin.from("members").select("id").eq("trip_id", previousTripId).in("user_id", organizerUserIds).limit(1);
  if (!shared?.length) return {};
  const { data, error } = await admin.from("stop_ratings").select("rating, stops(tags)").eq("trip_id", previousTripId);
  if (error) {
    console.error("plan: taste load failed", error); // a missing nudge is fine; the plan still works
    return {};
  }
  const rows = data as unknown as { rating: number; stops: { tags: string[] } | null }[];
  return tasteWeights(rows.map((r) => ({ rating: r.rating, tags: r.stops?.tags ?? [] })));
}
