import { NextResponse } from "next/server";
import { vetoAllowance } from "@/lib/decisions";
import { createAdminClient, MISSING_SECRET_KEY } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/** D-4: spend one of my vetoes on an option. Who vetoed stays in `vetoes` (owner-readable only). */
export async function POST(request: Request, ctx: RouteContext<"/api/trips/[id]/options/[oid]/veto">) {
  const { id: tripId, oid } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as { showName?: unknown };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail(401, "Please sign in first.");
  const { data: me } = await supabase.from("members").select("id, display_name").eq("trip_id", tripId).eq("user_id", auth.user.id).neq("status", "dropped").maybeSingle();
  if (!me) return fail(404, "Trip not found.");

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return fail(503, MISSING_SECRET_KEY);
  }

  const [{ data: trip }, { data: option }, { count }, { count: lockedOn }] = await Promise.all([
    admin.from("trips").select("start_date, end_date").eq("id", tripId).single(),
    admin.from("options").select("id, vetoed_at").eq("id", oid).eq("trip_id", tripId).maybeSingle(),
    admin.from("vetoes").select("id", { count: "exact", head: true }).eq("trip_id", tripId).eq("member_id", me.id),
    admin.from("decisions").select("id", { count: "exact", head: true }).eq("trip_id", tripId).eq("locked_option_id", oid),
  ]);
  if (!trip || !option) return fail(404, "Option not found.");
  if (option.vetoed_at) return fail(409, "Someone already vetoed this one.");
  if ((lockedOn ?? 0) > 0) return fail(409, "This one was already decided.");
  const allowance = vetoAllowance(trip.start_date, trip.end_date);
  if ((count ?? 0) >= allowance) return fail(409, `You've used all ${allowance} of your vetoes.`);

  const showName = body.showName === true;
  const { data: veto, error: vetoError } = await admin
    .from("vetoes")
    .insert({ trip_id: tripId, option_id: oid, member_id: me.id, show_name: showName })
    .select("id")
    .single();
  if (vetoError || !veto) {
    console.error("veto: insert failed", vetoError);
    return fail(500, "Couldn't use your veto. Please try again.");
  }
  const undo = () => admin.from("vetoes").delete().eq("id", veto.id);
  // Two taps at once could both pass the count above: recount, and give the token back if over.
  const { count: after } = await admin.from("vetoes").select("id", { count: "exact", head: true }).eq("trip_id", tripId).eq("member_id", me.id);
  if ((after ?? 0) > allowance) {
    await undo();
    return fail(409, `You've used all ${allowance} of your vetoes.`);
  }
  // Compare-and-swap so a second veto of the same option can't overwrite the first (and doesn't cost a token).
  const { data: updated, error } = await admin
    .from("options")
    .update({ vetoed_at: new Date().toISOString(), vetoed_by_name: showName ? me.display_name : null })
    .eq("id", oid)
    .is("vetoed_at", null)
    .select("id");
  if (error || !updated?.length) {
    await undo();
    if (error) console.error("veto: update failed", error);
    return error ? fail(500, "Couldn't use your veto. Please try again.") : fail(409, "Someone already vetoed this one.");
  }
  // "Disappears from the plan": the plan route skips vetoed options, so the next (re-)plan drops it.
  // Stops are not deleted here: that would leave plan totals and fairness stale and cascade to stop ratings.

  return NextResponse.json({ status: "ok", left: allowance - (after ?? allowance) });
}
