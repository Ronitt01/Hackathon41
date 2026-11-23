"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inr, toPaise } from "@/lib/money";
import { errorMessage } from "@/lib/supabase/auth";
import { TAGS } from "@/lib/tags";

export const KINDS = { activity: "🎯 Activity", food: "🍽️ Food", travel: "🚌 Travel", stay: "🏨 Stay", meetup: "👋 Meetup" } as const;

export type StopFields = {
  title: string;
  starts_at: string | null;
  kind: string;
  location_name: string | null;
  cost_paise: number;
  tags: string[];
};

/** Add/edit form for one stop. `onSave` throws on failure; the error is shown inline. */
export function StopForm({
  idPrefix,
  initial,
  submitLabel,
  onSave,
  onCancel,
}: {
  idPrefix: string;
  initial?: StopFields;
  submitLabel: string;
  onSave: (fields: StopFields) => Promise<void>;
  onCancel: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = (name: string) => `${idPrefix}-${name}`;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    if (!title) return setError("Give the stop a name.");
    const costInput = String(form.get("cost") ?? "").trim();
    const cost = costInput ? toPaise(costInput) : 0;
    if (cost === null) return setError("Cost should be an amount like 450 or 1,250.50.");
    setPending(true);
    setError(null);
    try {
      await onSave({
        title,
        starts_at: String(form.get("time") ?? "") || null,
        kind: String(form.get("kind") ?? "activity"),
        location_name: String(form.get("location") ?? "").trim() || null,
        cost_paise: cost,
        tags: form.getAll("tags").map(String),
      });
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-lg border p-3">
      <div className="grid gap-2">
        <Label htmlFor={id("title")}>What</Label>
        <Input id={id("title")} name="title" required maxLength={120} defaultValue={initial?.title} placeholder="Sunset at Vagator" className="h-11" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor={id("time")}>Time</Label>
          <Input id={id("time")} name="time" type="time" defaultValue={initial?.starts_at?.slice(0, 5)} className="h-11" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={id("kind")}>Kind</Label>
          <select
            id={id("kind")}
            name="kind"
            defaultValue={initial?.kind ?? "activity"}
            className="h-11 rounded-lg border border-input bg-transparent px-2.5 text-base md:text-sm dark:bg-input/30"
          >
            {Object.entries(KINDS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={id("location")}>Where (optional)</Label>
        <Input id={id("location")} name="location" maxLength={120} defaultValue={initial?.location_name ?? ""} placeholder="Anjuna" className="h-11" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={id("cost")}>Cost for the group in ₹ (optional)</Label>
        <Input
          id={id("cost")}
          name="cost"
          inputMode="decimal"
          defaultValue={initial?.cost_paise ? inr(initial.cost_paise) : ""}
          placeholder="1,200"
          className="h-11"
        />
      </div>
      <fieldset className="grid gap-1">
        <legend className="mb-1 text-sm font-medium">Tags (optional)</legend>
        <div className="grid grid-cols-2 gap-x-3">
          {TAGS.map((t) => (
            <label key={t.id} className="flex h-11 items-center gap-2 text-sm">
              <input type="checkbox" name="tags" value={t.id} defaultChecked={initial?.tags.includes(t.id)} className="size-4" />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="h-11 flex-1">{pending ? "Saving…" : submitLabel}</Button>
        <Button type="button" variant="outline" onClick={onCancel} className="h-11">Cancel</Button>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
