import { FairPlanCard } from "@/components/fair-plan/fair-plan-card";
import { MakeFairPlan } from "@/components/fair-plan/make-fair-plan";
import { STOP_COLUMNS } from "@/components/itinerary/days";
import { Itinerary, type Rating, type Stop } from "@/components/itinerary/itinerary";
import { TripDetails } from "@/components/itinerary/trip-details";
import { BestDates } from "@/components/plan-extras/best-dates";
import { MeetMiddle } from "@/components/plan-extras/meet-middle";
import { PreviousTrip } from "@/components/plan-extras/previous-trip";
import { todayInIndia } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { tagLabel } from "@/lib/tags";
import { lovedTags, tasteWeights } from "@/lib/taste";

const DEFAULT_TRIP_DAYS = 4;

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: trip }, { data: members }, { data: auth }, { data: busy }, { data: ratings }, { data: otherTrips }] = await Promise.all([
    supabase.from("trips").select("id, destination, start_date, end_date, active_plan_id, previous_trip_id").eq("id", id).single(),
    supabase.from("members").select("id, user_id, role, status, home_city").eq("trip_id", id),
    supabase.auth.getUser(),
    supabase.from("availability").select("member_id, busy_on").eq("trip_id", id),
    supabase.from("stop_ratings").select("stop_id, member_id, rating").eq("trip_id", id),
    supabase.from("trips").select("id, name").neq("id", id).order("created_at", { ascending: false }), // RLS: only the viewer's trips
  ]);
  if (!trip) return null; // layout already 404s for non-members

  const me = members?.find((m) => m.user_id === auth.user?.id);
  const active = (members ?? []).filter((m) => m.status !== "dropped");
  const activeMembers = active.length;
  const [{ data: stops, error }, { data: plan }, { data: previousRatings }] = await Promise.all([
    trip.active_plan_id
      ? supabase.from("stops").select(STOP_COLUMNS).eq("plan_id", trip.active_plan_id)
      : Promise.resolve({ data: [], error: null }),
    trip.active_plan_id
      ? supabase.from("plans").select("generated_by").eq("id", trip.active_plan_id).maybeSingle()
      : Promise.resolve({ data: null }),
    // RLS: readable only if the viewer was on that trip too; otherwise no taste line is shown.
    trip.previous_trip_id
      ? supabase.from("stop_ratings").select("rating, stops(tags)").eq("trip_id", trip.previous_trip_id)
      : Promise.resolve({ data: [] }),
  ]);
  const loved = lovedTags(
    tasteWeights(((previousRatings ?? []) as unknown as { rating: number; stops: { tags: string[] } | null }[]).map((r) => ({ rating: r.rating, tags: r.stops?.tags ?? [] }))),
  ).map(tagLabel);

  const today = todayInIndia();
  const tripLength = trip.start_date && trip.end_date
    ? Math.min(14, Math.max(1, Math.round((Date.parse(trip.end_date) - Date.parse(trip.start_date)) / 86_400_000) + 1))
    : DEFAULT_TRIP_DAYS;
  const isOrganizer = me?.role === "organizer";
  const isActive = !!me && me.status !== "dropped";

  return (
    <>
      <FairPlanCard tripId={trip.id} planId={trip.active_plan_id} />

      <section className="mt-2 grid gap-3" aria-labelledby="itinerary">
        <div>
          <h2 id="itinerary" className="text-[17px] leading-snug font-bold">Itinerary</h2>
          <p className="text-[13px] text-muted-foreground">Anyone in the trip can add, edit, reorder and rate stops.</p>
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
            myMemberId={isActive ? me.id : null}
            initialRatings={(ratings ?? []) as Rating[]}
          />
        )}
      </section>

      <section className="mt-2 grid gap-2" aria-labelledby="trip-details">
        <div>
          <h2 id="trip-details" className="text-[17px] leading-snug font-bold">Trip details</h2>
          <p className="text-[13px] text-muted-foreground">Where and when.</p>
        </div>
        <TripDetails trip={trip} isOrganizer={isOrganizer} />
      </section>

      {isActive && (
        <>
          <div className="mt-2">
            <MeetMiddle myMemberId={me.id} myCity={me.home_city} otherCities={active.filter((m) => m.id !== me.id).map((m) => m.home_city)} />
          </div>
          <div className="mt-2">
            <BestDates
              tripId={trip.id}
              myMemberId={me.id}
              memberIds={active.map((m) => m.id)}
              isOrganizer={isOrganizer}
              today={today}
              length={tripLength}
              current={{ start: trip.start_date, end: trip.end_date }}
              initial={busy ?? []}
            />
          </div>
        </>
      )}

      <div className="mt-2 empty:hidden">
        <PreviousTrip tripId={trip.id} isOrganizer={isOrganizer} previousTripId={trip.previous_trip_id} trips={otherTrips ?? []} loved={loved} />
      </div>

      <MakeFairPlan tripId={trip.id} again={plan?.generated_by === "ai"} />
    </>
  );
}
