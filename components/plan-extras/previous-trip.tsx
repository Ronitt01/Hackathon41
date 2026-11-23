"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/supabase/auth";

/** W-2: the organizer points this trip at an earlier one; the next fair plan leans towards what the group rated 4+ there. */
export function PreviousTrip({
  tripId,
  isOrganizer,
  previousTripId,
  trips,
  loved,
}: {
  tripId: string;
  isOrganizer: boolean;
  previousTripId: string | null;
  trips: { id: string; name: string }[]; // the viewer's other trips
  loved: string[]; // tag labels the group rated highly on the previous trip
}) {
  const router = useRouter();
  const [value, setValue] = useState(previousTripId ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previousName = trips.find((t) => t.id === previousTripId)?.name;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { error } = await createClient().from("trips").update({ previous_trip_id: value || null }).eq("id", tripId);
    setPending(false);
    if (error) return setError(errorMessage(error));
    router.refresh();
  }

  const taste = previousTripId ? (
    <p className="text-[13px] text-muted-foreground">
      {loved.length
        ? <>The next fair plan leans towards <strong className="font-semibold text-ink">{loved.join(", ")}</strong>, which the group rated highly last time.</>
        : previousName // not in the viewer's trips: RLS hides its ratings, so say nothing about them
          ? "No stops rated 4 or more on that trip yet. Rate stops in its itinerary to shape the next plan."
          : "Ratings from that trip shape the next plan."}
    </p>
  ) : null;

  if (!isOrganizer) {
    if (!previousTripId) return null;
    return (
      <section className="grid gap-1" aria-labelledby="previous-trip">
        <h2 id="previous-trip" className="text-[17px] leading-snug font-bold">Group taste</h2>
        <p className="text-[13px]">Based on {previousName ? <strong className="font-semibold">{previousName}</strong> : "an earlier trip"}.</p>
        {taste}
      </section>
    );
  }

  return (
    <section className="grid gap-2" aria-labelledby="previous-trip">
      <div>
        <h2 id="previous-trip" className="text-[17px] leading-snug font-bold">Group taste</h2>
        <p className="text-[13px] text-muted-foreground">Been away together before? Stops you all rated highly shape the next fair plan.</p>
      </div>
      {trips.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">Your other trips show up here once you have one.</p>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-2">
          <Label htmlFor="previous-trip-select">Based on a previous trip</Label>
          <div className="flex gap-2">
            <select
              id="previous-trip-select"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-card px-2.5"
            >
              <option value="">None</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <Button type="submit" variant="outline" className="bg-card" disabled={pending || value === (previousTripId ?? "")}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      )}
      {taste}
      {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
    </section>
  );
}
