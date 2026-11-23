import { FairPlanCard } from "@/components/fair-plan/fair-plan-card";
import { STOP_COLUMNS } from "@/components/itinerary/days";
import { Itinerary, type Stop } from "@/components/itinerary/itinerary";
import { TripDetails } from "@/components/itinerary/trip-details";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const { data: stops, error } = trip.active_plan_id
    ? await supabase.from("stops").select(STOP_COLUMNS).eq("plan_id", trip.active_plan_id)
    : { data: [], error: null };

  return (
    <>
      <FairPlanCard tripId={trip.id} planId={trip.active_plan_id} />
      <Card>
        <CardHeader>
          <CardTitle>Trip details</CardTitle>
          <CardDescription>Where and when.</CardDescription>
        </CardHeader>
        <CardContent>
          <TripDetails trip={trip} isOrganizer={me?.role === "organizer"} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Itinerary</CardTitle>
          <CardDescription>Anyone in the trip can add, edit and reorder stops.</CardDescription>
        </CardHeader>
        <CardContent>
          {!trip.active_plan_id ? (
            <p className="text-sm text-muted-foreground">No plan picked yet. Once the group chooses one, it shows up here.</p>
          ) : error ? (
            <p role="alert" className="text-sm text-destructive">Couldn&apos;t load the plan: {error.message}</p>
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
        </CardContent>
      </Card>
    </>
  );
}
