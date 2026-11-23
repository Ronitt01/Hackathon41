"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { errorMessage } from "@/lib/supabase/auth";

export type SplitFields = { a: string; b: string; start: string; place: string; meet: string };

/** A-3: two parallel plans for one afternoon, then a regroup point. `onSave` throws on failure. */
export function SplitForm({ idPrefix, onSave, onCancel }: { idPrefix: string; onSave: (f: SplitFields) => Promise<void>; onCancel: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = (name: string) => `${idPrefix}-${name}`;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const get = (name: string) => String(form.get(name) ?? "").trim();
    const f: SplitFields = { a: get("a"), b: get("b"), start: get("start"), place: get("place"), meet: get("meet") };
    if (!f.a || !f.b) return setError("Give both groups something to do.");
    if (!f.place) return setError("Say where everyone meets again.");
    if (!f.start || !f.meet) return setError("Set when the groups split and when they meet.");
    if (f.meet <= f.start) return setError("The meet-up has to be after the split starts.");
    setPending(true);
    setError(null);
    try {
      await onSave(f);
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-xl border bg-card p-3.5">
      <div className="grid gap-2">
        <Label htmlFor={id("a")}>Group A does</Label>
        <Input id={id("a")} name="a" required maxLength={120} placeholder="Paragliding at Bir" className="h-11" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={id("b")}>Group B does</Label>
        <Input id={id("b")} name="b" required maxLength={120} placeholder="Cafe hopping in Old Manali" className="h-11" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={id("start")}>Split at</Label>
        <Input id={id("start")} name="start" type="time" required defaultValue="14:00" className="h-11" />
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div className="grid gap-2">
          <Label htmlFor={id("place")}>Meet again at</Label>
          <Input id={id("place")} name="place" required maxLength={120} placeholder="Mall Road" className="h-11" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={id("meet")}>Time</Label>
          <Input id={id("meet")} name="meet" type="time" required defaultValue="18:00" className="h-11" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="flex-1">{pending ? "Saving…" : "Split the afternoon"}</Button>
        <Button type="button" variant="outline" onClick={onCancel} className="bg-card">Cancel</Button>
      </div>
      {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
    </form>
  );
}
