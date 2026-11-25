import { NextResponse } from "next/server";
import { makeFairPlan } from "@/lib/make-plan";
import { createAdminClient, MISSING_SECRET_KEY } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/** "Make the fair plan" (and "Make it now"): any member may run it. The work is in lib/make-plan. */
export async function POST(_request: Request, ctx: RouteContext<"/api/trips/[id]/plan">) {
  const { id: tripId } = await ctx.params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail(401, "Please sign in first.");
  const { data: me } = await supabase.from("members").select("id").eq("trip_id", tripId).eq("user_id", auth.user.id).neq("status", "dropped").maybeSingle();
  if (!me) return fail(404, "Trip not found.");

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return fail(503, MISSING_SECRET_KEY);
  }
  // Hold off the automatic plan while this one runs, so they don't race (fails quietly before migration 0003).
  await admin.from("trips").update({ auto_plan_at: new Date().toISOString() }).eq("id", tripId);
  const result = await makeFairPlan(admin, tripId);
  return result.status === "error" ? fail(500, result.message) : NextResponse.json(result);
}
