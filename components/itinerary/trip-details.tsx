"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/supabase/auth";

type Details = { id: string; destination: string | null; start_date: string | null; end_date: string | null };

const longDate = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const show = (date: string | null) => (date ? longDate.format(new Date(`${date}T00:00:00Z`)) : "Not set");

/** Destination and dates: organizers edit, everyone else reads. */
export function TripDetails({ trip, isOrganizer }: { trip: Details; isOrganizer: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const destination = String(form.get("destination") ?? "").trim() || null;
    const start_date = String(form.get("start") ?? "") || null;
    const end_date = String(form.get("end") ?? "") || null;
    if (start_date && end_date && end_date < start_date) return setError("The trip can't end before it starts.");
    setPending(true);
    setError(null);
    const { error } = await createClient().from("trips").update({ destination, start_date, end_date }).eq("id", trip.id);
    setPending(false);
    if (error) return setError(errorMessage(error));
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="grid gap-3">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Where</dt>
          <dd>{trip.destination || "Not set"}</dd>
          <dt className="text-muted-foreground">From</dt>
          <dd>{show(trip.start_date)}</dd>
          <dt className="text-muted-foreground">To</dt>
          <dd>{show(trip.end_date)}</dd>
        </dl>
        {isOrganizer && (
          <Button variant="outline" className="h-11" onClick={() => setEditing(true)}>Edit trip details</Button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <div className="grid gap-2">
        <Label htmlFor="destination">Destination</Label>
        <Input id="destination" name="destination" maxLength={80} defaultValue={trip.destination ?? ""} placeholder="Goa" className="h-11" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="start">Start date</Label>
          <Input id="start" name="start" type="date" defaultValue={trip.start_date ?? ""} className="h-11" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="end">End date</Label>
          <Input id="end" name="end" type="date" defaultValue={trip.end_date ?? ""} className="h-11" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="h-11 flex-1">{pending ? "Saving…" : "Save"}</Button>
        <Button type="button" variant="outline" onClick={() => setEditing(false)} className="h-11">Cancel</Button>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
