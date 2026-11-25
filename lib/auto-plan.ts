import "server-only";
import { AUTO_PLAN_RETRY_MS, autoPlanDecision, type AutoPlanState } from "@/lib/auto-plan-rules";
import { makeFairPlan } from "@/lib/make-plan";
import { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;
export type AutoPlanView = { state: AutoPlanState; decision: ReturnType<typeof autoPlanDecision>; autoPlanAt: string | null };

/**
 * Where the trip stands for the automatic plan. Counts only: which members have budgets never leaves this function.
 * null when it can't tell (no server key, or migration 0003 not run yet): the app then just waits for the button.
 */
export async function loadAutoPlan(tripId: string, admin?: Admin): Promise<AutoPlanView | null> {
  try {
    admin ??= createAdminClient();
  } catch {
    return null;
  }
  const { data: trip, error } = await admin.from("trips").select("plan_by, auto_plan_at, active_plan_id").eq("id", tripId).maybeSingle();
  if (error || !trip) return null; // e.g. column plan_by doesn't exist before 0003
  const [members, privates, plan] = await Promise.all([
    admin.from("members").select("id, role, status").eq("trip_id", tripId).neq("status", "dropped"),
    admin.from("member_private").select("member_id, updated_at").eq("trip_id", tripId),
    trip.active_plan_id ? admin.from("plans").select("generated_by, created_at").eq("id", trip.active_plan_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  if (members.error || privates.error || plan.error) return null;
  const active = new Set(members.data.map((m) => m.id));
  const budgets = privates.data.filter((p) => active.has(p.member_id));
  const fair = plan.data?.generated_by === "ai";
  const state: AutoPlanState = {
    fair,
    people: active.size,
    budgets: budgets.length,
    planBy: trip.plan_by,
    lateBudget: fair && budgets.some((b) => Date.parse(b.updated_at) > Date.parse(plan.data!.created_at)),
    pledged: members.data.some((m) => m.role !== "organizer" && m.status === "confirmed"),
    now: Date.now(),
  };
  return { state, decision: autoPlanDecision(state), autoPlanAt: trip.auto_plan_at };
}

/**
 * Called after any trip page is sent (layout `after()`), so whoever opens the trip next moves it along.
 * Claims the trip first, so two page views can't both make a plan and a plan that can't be made isn't retried for 30 min.
 */
export async function maybeAutoPlan(tripId: string): Promise<void> {
  let admin: Admin;
  try {
    admin = createAdminClient();
  } catch {
    return;
  }
  const view = await loadAutoPlan(tripId, admin);
  if (view?.decision !== "make") return;
  const stale = new Date(Date.now() - AUTO_PLAN_RETRY_MS).toISOString();
  const { data: claimed } = await admin
    .from("trips")
    .update({ auto_plan_at: new Date().toISOString() })
    .eq("id", tripId)
    .or(`auto_plan_at.is.null,auto_plan_at.lt.${stale}`)
    .select("id");
  if (!claimed?.length) return; // someone else is on it, or it was tried recently
  const result = await makeFairPlan(admin, tripId);
  if (result.status !== "ok") console.error("auto plan: not made", tripId, result.status); // no options / no fit: retried after 30 min
}
