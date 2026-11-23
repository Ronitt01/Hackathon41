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
    setPending(true);
    setError(null);
    try {
      const supabase = await ensureSignedIn(name);
      const { data: tripId, error } =
        props.mode === "create"
          ? await supabase.rpc("create_trip", { p_name: String(form.get("tripName") ?? "").trim(), p_display_name: name })
          : await supabase.rpc("join_trip", { p_code: props.code, p_display_name: name });
      if (error) throw error;
      success();
      toast(props.mode === "create" ? "Chalo! Trip created" : "Chalo! You're in", { tone: "success" });
      router.push(`/trips/${tripId}`);
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {props.mode === "create" && (
        <div className="grid gap-2">
          <Label htmlFor="tripName" className="text-[15px] font-semibold">Trip name</Label>
          <Input id="tripName" name="tripName" required maxLength={80} placeholder="Goa with friends" className="h-11 bg-card" />
        </div>
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
