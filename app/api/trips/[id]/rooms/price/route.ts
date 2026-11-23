import { NextResponse } from "next/server";
import { saveRoomPrices } from "@/lib/rooms";
import { createAdminClient, MISSING_SECRET_KEY } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/** M-4: organizer splits the total rent. Assignment + envy-free prices from PRIVATE valuations; returns none of them. */
export async function POST(request: Request, ctx: RouteContext<"/api/trips/[id]/rooms/price">) {
  const { id: tripId } = await ctx.params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail(401, "Please sign in first.");
  const { data: me } = await supabase.from("members").select("role").eq("trip_id", tripId).eq("user_id", auth.user.id).neq("status", "dropped").maybeSingle();
  if (!me) return fail(404, "Trip not found.");
  if (me.role !== "organizer") return fail(403, "Only an organizer can split the rent.");

  const body = (await request.json().catch(() => null)) as { totalPaise?: unknown } | null;
  const totalPaise = body?.totalPaise;
  if (typeof totalPaise !== "number" || !Number.isSafeInteger(totalPaise) || totalPaise <= 0) return fail(400, "Enter the total rent.");

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return fail(503, MISSING_SECRET_KEY);
  }
  const problem = await saveRoomPrices(admin, tripId, totalPaise);
  if (problem) return fail(problem.status, problem.error);
  return NextResponse.json({ status: "ok" });
}
