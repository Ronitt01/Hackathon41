import { NextResponse } from "next/server";
import { dropoutImpact } from "@/lib/dropout";
import { saveRoomPrices } from "@/lib/rooms";
import { createAdminClient, MISSING_SECRET_KEY } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/**
 * M-8: organizer removes a member. Re-splits the shared cost and the rooms, re-checks every remaining PRIVATE budget.
 * Returns only aggregates: { oldPerHead, newPerHead, deltaPaise, fitsEveryone, roomsRepriced }. The pledge stays counted.
 */
export async function POST(_request: Request, ctx: RouteContext<"/api/trips/[id]/members/[mid]/drop">) {
  const { id: tripId, mid } = await ctx.params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail(401, "Please sign in first.");
  const { data: me } = await supabase.from("members").select("id, role").eq("trip_id", tripId).eq("user_id", auth.user.id).neq("status", "dropped").maybeSingle();
  if (!me) return fail(404, "Trip not found.");
  if (me.role !== "organizer") return fail(403, "Only an organizer can remove people.");
  if (me.id === mid) return fail(400, "You can't remove yourself.");

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return fail(503, MISSING_SECRET_KEY);
  }

  const [trip, members, privates, beds] = await Promise.all([
    admin.from("trips").select("active_plan_id").eq("id", tripId).single(),
    admin.from("members").select("id").eq("trip_id", tripId).neq("status", "dropped"),
    admin.from("member_private").select("member_id, budget_paise").eq("trip_id", tripId),
    admin.from("bed_assignments").select("price_paise").eq("trip_id", tripId),
  ]);
  const planId = trip.data?.active_plan_id as string | null | undefined;
  const [plan, planMembers] = await Promise.all([
    planId ? admin.from("plans").select("group_cost_paise").eq("id", planId).single() : Promise.resolve({ data: null, error: null }),
    planId ? admin.from("plan_members").select("member_id, travel_paise").eq("plan_id", planId) : Promise.resolve({ data: [], error: null }),
  ]);
  const loadError = trip.error ?? members.error ?? privates.error ?? beds.error ?? plan.error ?? planMembers.error;
  if (loadError) {
    console.error("drop: load failed", loadError.message); // never log rows: budgets are private
    return fail(500, "Couldn't load the trip. Please try again.");
  }
  const activeIds = (members.data as { id: string }[]).map((m) => m.id);
  if (!activeIds.includes(mid)) return fail(404, "That person isn't on the trip any more.");

  // Only flips a still-active row, so two organizers tapping at once can't double-count.
  const { data: dropped, error: dropError } = await admin.from("members").update({ status: "dropped" }).eq("id", mid).eq("trip_id", tripId).neq("status", "dropped").select("id");
  if (dropError) {
    console.error("drop: update failed", dropError.message);
    return fail(500, "Couldn't remove them. Please try again.");
  }
  if (!dropped?.length) return fail(409, "They were already removed.");

  // Free their bed and their fairness bar now, so they leave the rooms and plan even if a re-split below fails.
  const cleanups = await Promise.all([
    admin.from("bed_assignments").delete().eq("trip_id", tripId).eq("member_id", mid),
    planId ? admin.from("plan_members").delete().eq("plan_id", planId).eq("member_id", mid) : Promise.resolve({ error: null }),
  ]);
  const cleanupError = cleanups.find((r) => r.error)?.error;
  if (cleanupError) console.error("drop: cleanup failed", cleanupError.message);

  const rentPaise = (beds.data as { price_paise: number }[]).reduce((s, b) => s + Number(b.price_paise), 0);
  const groupCost = Number((plan.data as { group_cost_paise: number | null } | null)?.group_cost_paise ?? 0);
  const budget = new Map((privates.data as { member_id: string; budget_paise: number | null }[]).map((p) => [p.member_id, p.budget_paise == null ? null : Number(p.budget_paise)]));
  const travel = new Map((planMembers.data as { member_id: string; travel_paise: number }[]).map((p) => [p.member_id, Number(p.travel_paise)]));
  const remaining = activeIds.filter((id) => id !== mid);
  // Shared cost = the plan's group cost; with no costed plan yet, the room rent is what gets re-split.
  const impact = dropoutImpact(groupCost || rentPaise, activeIds.length, remaining.map((id) => ({ travelPaise: travel.get(id) ?? 0, budgetPaise: budget.get(id) ?? null })));

  if (planId && groupCost > 0) {
    const results = await Promise.all(
      remaining.filter((id) => travel.has(id)).map((id) => admin.from("plan_members").update({ total_paise: impact.totals[remaining.indexOf(id)] }).eq("plan_id", planId).eq("member_id", id)),
    );
    const planError = results.find((r) => r.error)?.error;
    if (planError) console.error("drop: plan update failed", planError.message);
  }

  let roomsRepriced = false;
  let roomsProblem: string | null = null;
  if (rentPaise > 0) {
    const problem = await saveRoomPrices(admin, tripId, rentPaise);
    if (problem) console.error("drop: room re-split failed", problem.error);
    roomsRepriced = !problem;
    if (problem) roomsProblem = `Rooms need a new split: ${problem.error}`;
  }

  const { oldPerHead, newPerHead, deltaPaise, fitsEveryone } = impact;
  return NextResponse.json({ oldPerHead, newPerHead, deltaPaise, fitsEveryone, roomsRepriced, roomsProblem });
}
