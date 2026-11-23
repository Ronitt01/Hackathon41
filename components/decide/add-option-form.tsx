"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toPaise } from "@/lib/money";
import { errorMessage } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";
import { TAGS } from "@/lib/tags";
import { KIND_LABEL } from "./option-card";

const FIELD = "h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base md:text-sm";

/** D-1: add an option card with 2–4 aspects people can like one by one. */
export function AddOptionForm({ tripId, meId, onAdded }: { tripId: string; meId: string; onAdded: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const text = (k: string) => String(form.get(k) ?? "").trim();
    const priceText = text("price");
    const price = priceText ? toPaise(priceText) : null;
    if (!text("title")) return setError("Give the option a title.");
    if (priceText && price === null) return setError("Enter the total price in ₹, like 24000.");
    const aspects = [0, 1, 2, 3]
      .map((i) => ({ label: text(`aspect${i}`), value: text(`value${i}`) || null }))
      .filter((a) => a.label);
    if (aspects.length < 2) return setError("Add at least 2 things to like, e.g. “Pool” and “Location”.");

    setPending(true);
    setError(null);
    const supabase = createClient();
    const { data: option, error } = await supabase
      .from("options")
      .insert({
        trip_id: tripId,
        kind: text("kind"),
        title: text("title"),
        description: text("description") || null,
        price_paise: price,
        image_url: text("image") || null,
        tags: form.getAll("tags").map(String),
        created_by: meId,
      })
      .select("id")
      .single();
    const { error: aspectError } = option
      ? await supabase.from("option_aspects").insert(
          aspects.map((a, position) => ({ ...a, trip_id: tripId, option_id: option.id, kind: "other", position })),
        )
      : { error: null };
    if (option && aspectError) await supabase.from("options").delete().eq("id", option.id); // no half-made cards
    if (error || aspectError) {
      setError(errorMessage(error ?? aspectError));
      setPending(false);
      return;
    }
    onAdded();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add an option</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="kind">What is it?</Label>
            <select id="kind" name="kind" defaultValue="stay" className={FIELD}>
              {Object.entries(KIND_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required maxLength={120} placeholder="Sea-view villa in Anjuna" className="h-11" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description (optional)</Label>
            <textarea id="description" name="description" rows={2} maxLength={1000} className={`${FIELD} h-auto py-2`} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="price">Total price in ₹ (optional)</Label>
            <Input id="price" name="price" inputMode="decimal" placeholder="24000" className="h-11" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="image">Image link (optional)</Label>
            <Input id="image" name="image" type="url" placeholder="https://…" className="h-11" />
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">Tags</legend>
            <div className="grid grid-cols-2 gap-1">
              {TAGS.map((t) => (
                <Label key={t.id} className="h-11 font-normal">
                  <input type="checkbox" name="tags" value={t.id} className="size-4" />
                  {t.label}
                </Label>
              ))}
            </div>
          </fieldset>
          <fieldset className="grid gap-3">
            <legend className="mb-1 text-sm font-medium">Things to like (2–4)</legend>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <Label htmlFor={`aspect${i}`} className="text-xs text-muted-foreground">Aspect {i + 1}{i < 2 ? "" : " (optional)"}</Label>
                  <Input id={`aspect${i}`} name={`aspect${i}`} maxLength={40} placeholder={["Pool", "Location", "Vibe", "Food"][i]} className="h-11" />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor={`value${i}`} className="text-xs text-muted-foreground">Detail</Label>
                  <Input id={`value${i}`} name={`value${i}`} maxLength={80} placeholder={["Infinity pool", "5 min to beach", "Chill", "Goan thali"][i]} className="h-11" />
                </div>
              </div>
            ))}
          </fieldset>
          <Button type="submit" disabled={pending} className="h-11">{pending ? "Adding…" : "Add option"}</Button>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
