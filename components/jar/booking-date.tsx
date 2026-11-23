"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { shortDate } from "@/components/money/data";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/supabase/auth";

/** Booking day = the Jar deadline. Organisers set it; everyone else reads it. */
export function BookingDate({ tripId, bookingDate, isOrganizer }: { tripId: string; bookingDate: string | null; isOrganizer: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(bookingDate ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOrganizer) {
    return bookingDate ? (
      <p>Booking day is <strong>{shortDate(bookingDate)}</strong>.</p>
    ) : (
      <p className="text-muted-foreground">Ask the organiser to set a booking date.</p>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { error } = await createClient().from("trips").update({ booking_date: value || null }).eq("id", tripId);
    setPending(false);
    if (error) return setError(errorMessage(error));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-2">
      <Label htmlFor="booking-date">Booking date</Label>
      <div className="flex gap-2">
        <Input id="booking-date" type="date" value={value} onChange={(e) => setValue(e.target.value)} className="h-11" />
        <Button type="submit" className="h-11" disabled={pending || value === (bookingDate ?? "")}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
      {!bookingDate && <p className="text-[13px] text-muted-foreground">Set it so everyone&apos;s Jar knows the deadline.</p>}
      {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
    </form>
  );
}
