"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inr, toPaise } from "@/lib/money";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/supabase/auth";

/** M-2: the organiser sees the pledge amount and can change it (trips.pledge_paise is organiser-updatable). */
export function PledgeEditor({ tripId, pledgePaise, onSaved }: { tripId: string; pledgePaise: number; onSaved: (paise: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="text-[15px]">
          Pledge to confirm: <strong className="tabular">{inr(pledgePaise)}</strong>
        </p>
        <Button type="button" variant="outline" className="h-11" onClick={() => { setValue(String(pledgePaise / 100)); setEditing(true); }}>
          Change
        </Button>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const paise = toPaise(value);
    if (paise === null) return setError("Enter an amount in rupees, like 500.");
    setPending(true);
    setError(null);
    const { error } = await createClient().from("trips").update({ pledge_paise: paise }).eq("id", tripId);
    setPending(false);
    if (error) return setError(errorMessage(error));
    onSaved(paise);
    setEditing(false);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-2">
      <Label htmlFor="pledge-amount">Pledge amount (₹)</Label>
      <div className="flex gap-2">
        <Input
          id="pledge-amount"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={error ? true : undefined}
          className="h-11"
          autoFocus
        />
        <Button type="submit" className="h-11" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
        <Button type="button" variant="ghost" className="h-11" onClick={() => { setEditing(false); setError(null); }}>Cancel</Button>
      </div>
      <p className="text-[13px] text-muted-foreground">Set 0 to let people confirm without a pledge.</p>
      {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
    </form>
  );
}
