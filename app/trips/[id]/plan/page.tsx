import { FairPlanCard } from "@/components/fair-plan/fair-plan-card";
import { MakeFairPlan } from "@/components/fair-plan/make-fair-plan";
import { STOP_COLUMNS } from "@/components/itinerary/days";
import { Itinerary, type Stop } from "@/components/itinerary/itinerary";
import { TripDetails } from "@/components/itinerary/trip-details";
import { createClient } from "@/lib/supabase/server";

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: trip }, { data: members }, { data: auth }] = await Promise.all([
    supabase.from("trips").select("id, destination, start_date, end_date, active_plan_id").eq("id", id).single(),
    supabase.from("members").select("user_id, role, status").eq("trip_id", id),
    supabase.auth.getUser(),
  ]);
  if (!trip) return null; // layout already 404s for non-members

  const me = members?.find((m) => m.user_id === auth.user?.id);
  const activeMembers = (members ?? []).filter((m) => m.status !== "dropped").length;
  const [{ data: stops, error }, { data: plan }] = trip.active_plan_id
    ? await Promise.all([
        supabase.from("stops").select(STOP_COLUMNS).eq("plan_id", trip.active_plan_id),
        supabase.from("plans").select("generated_by").eq("id", trip.active_plan_id).maybeSingle(),
      ])
    : [{ data: [], error: null }, { data: null }];

  return (
    <>
      <FairPlanCard tripId={trip.id} planId={trip.active_plan_id} />

      <section className="mt-2 grid gap-3" aria-labelledby="itinerary">
        <div>
          <h2 id="itinerary" className="text-[17px] leading-snug font-bold">Itinerary</h2>
          <p className="text-[13px] text-muted-foreground">Anyone in the trip can add, edit and reorder stops.</p>
        </div>
        {!trip.active_plan_id ? (
          <p className="text-muted-foreground">No plan picked yet. Once the group chooses one, it shows up here.</p>
        ) : error ? (
          <p role="alert" className="text-destructive">Couldn&apos;t load the plan: {error.message}</p>
        ) : (
          <Itinerary
            key={trip.active_plan_id} // new fair plan → fresh stops state
            tripId={trip.id}
            planId={trip.active_plan_id}
            startDate={trip.start_date}
            endDate={trip.end_date}
            activeMembers={activeMembers}
            initial={(stops ?? []) as Stop[]}
          />
        )}
      </section>

      <section className="mt-2 grid gap-2" aria-labelledby="trip-details">
        <div>
          <h2 id="trip-details" className="text-[17px] leading-snug font-bold">Trip details</h2>
          <p className="text-[13px] text-muted-foreground">Where and when.</p>
        </div>
        <TripDetails trip={trip} isOrganizer={me?.role === "organizer"} />
      </section>

      <MakeFairPlan tripId={trip.id} again={plan?.generated_by === "ai"} />
    </>
  );
}
