import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WrappedStories } from "@/components/wrapped/stories";
import { createClient } from "@/lib/supabase/server";
import { errorMessage } from "@/lib/supabase/auth";
import { wrappedCards, wrappedSummary, type WrappedInput } from "@/lib/wrapped";

export default async function WrappedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  // Group-visible tables only; the browser gets the finished cards, never these rows.
  const [trip, members, expenses, options, reactions] = await Promise.all([
    supabase.from("trips").select("name, start_date, end_date, active_plan_id").eq("id", id).single(),
    supabase.from("members").select("id, display_name").eq("trip_id", id).neq("status", "dropped").order("joined_at"),
    supabase.from("expenses").select("title, amount_paise, category, created_by").eq("trip_id", id).order("created_at"),
    supabase.from("options").select("id, title, created_by, vetoed_at").eq("trip_id", id).order("created_at"),
    supabase.from("reactions").select("option_id, kind").eq("trip_id", id).is("aspect_id", null),
  ]);
  const stops = trip.data?.active_plan_id
    ? await supabase.from("stops").select("day").eq("plan_id", trip.data.active_plan_id)
    : { data: [], error: null };
  const error = trip.error ?? members.error ?? expenses.error ?? options.error ?? reactions.error ?? stops.error;
  if (error || !trip.data) return <p role="alert" className="text-sm text-destructive">{errorMessage(error)}</p>;

  const input: WrappedInput = {
    trip: trip.data,
    members: members.data ?? [],
    // bigint can arrive as a string; the maths needs numbers
    expenses: (expenses.data ?? []).map((e) => ({ ...e, amount_paise: Number(e.amount_paise) })),
    stops: stops.data ?? [],
    options: options.data ?? [],
    reactions: reactions.data as WrappedInput["reactions"],
  };

  if (!input.expenses.length && !input.stops.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trip Wrapped</CardTitle>
          <CardDescription>Your Wrapped fills in as you plan and spend. Add stops in Plan and expenses in Money.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const cards = wrappedCards(input);
  return <WrappedStories cards={cards} summary={wrappedSummary(trip.data.name, cards)} />;
}
