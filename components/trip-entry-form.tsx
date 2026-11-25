"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/kafila/toast";
import { success } from "@/lib/haptics";
import { ensureSignedIn, errorMessage } from "@/lib/supabase/auth";

type Props = { mode: "create" } | { mode: "join"; code: string };

/** C-1: create a trip, or join one from an invite link. Signs in as a guest first if needed. */
export function TripEntryForm(props: Props & { defaultName: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const destination = String(form.get("destination") ?? "").trim() || null;
    const start_date = String(form.get("start") ?? "") || null;
    const end_date = String(form.get("end") ?? "") || null;
    if (start_date && end_date && end_date < start_date) return setError("The trip can't end before it starts.");
    setPending(true);
    setError(null);
    try {
      const supabase = await ensureSignedIn(name);
      const { data: tripId, error } =
        props.mode === "create"
          ? await supabase.rpc("create_trip", { p_name: destination ? `${destination} trip` : "Our trip", p_display_name: name })
          : await supabase.rpc("join_trip", { p_code: props.code, p_display_name: name });
      if (error) throw error;
      if (props.mode === "create" && (destination || start_date || end_date)) {
        // Blank is fine: Decide suggests places, and Plan's Best dates finds days that suit everyone.
        // The trip already exists, so never block on this (a retry would create a second trip); Plan → Trip details can fix it.
        const { error: detailsError } = await supabase.from("trips").update({ destination, start_date, end_date }).eq("id", tripId);
        if (detailsError) console.error("trip details not saved:", detailsError.message);
      }
      success();
      toast(props.mode === "create" ? "Chalo! Trip created" : "Chalo! You're in", { tone: "success" });
      // A new friend goes straight to the one thing only they can do: their private budget.
      router.push(props.mode === "create" ? `/trips/${tripId}` : `/trips/${tripId}/decide/me`);
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {props.mode === "create" && (
        <>
          <div className="grid gap-2">
            <Label htmlFor="destination" className="text-[15px] font-semibold">Where to?</Label>
            <Input id="destination" name="destination" maxLength={80} placeholder="Goa" aria-describedby="destination-hint" className="h-11 bg-card" />
            <p id="destination-hint" className="text-[13px] text-muted-foreground">Not sure yet? Leave it blank and Kafila suggests places.</p>
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-[15px] font-semibold">When?</legend>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1">
                <Label htmlFor="start" className="text-[13px] text-muted-foreground">From</Label>
                <Input id="start" name="start" type="date" className="h-11 bg-card" />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="end" className="text-[13px] text-muted-foreground">To</Label>
                <Input id="end" name="end" type="date" className="h-11 bg-card" />
              </div>
            </div>
            <p className="text-[13px] text-muted-foreground">Leave blank and Kafila finds days that suit everyone.</p>
          </fieldset>
        </>
      )}
      <div className="grid gap-2">
        <Label htmlFor="name" className="text-[15px] font-semibold">Your name</Label>
        <Input id="name" name="name" required maxLength={40} defaultValue={props.defaultName} placeholder="Aarav" className="h-11 bg-card" />
      </div>
      <Button type="submit" disabled={pending} aria-busy={pending} className="h-11 w-full">
        {pending ? "One sec…" : props.mode === "create" ? "Create trip" : "Join trip"}
      </Button>
      {error && <p role="alert" className="text-[15px] text-destructive">{error}</p>}
    </form>
  );
}
