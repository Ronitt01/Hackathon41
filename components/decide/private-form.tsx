"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toPaise } from "@/lib/money";
import { errorMessage } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";
import { TAGS, type Prefs } from "@/lib/tags";

const CHOICES = [
  { value: 1, label: "Love it" },
  { value: 0, label: "Don't mind" },
  { value: -1, label: "Rather not" },
] as const;

/** D-3: upserts the member's own member_private row. */
export function PrivateForm({ tripId, memberId, budgetPaise, prefs }: { tripId: string; memberId: string; budgetPaise: number | null; prefs: Prefs }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const budgetText = String(form.get("budget") ?? "").trim();
    const budget = budgetText ? toPaise(budgetText) : null;
    if (budgetText && !budget) {
      setError("Enter your max budget in ₹, like 15000.");
      return;
    }
    const answers = Object.fromEntries(TAGS.map((t) => [t.id, Number(form.get(t.id) ?? 0)]));
    setPending(true);
    setError(null);
    const { error } = await createClient()
      .from("member_private")
      .upsert(
        { member_id: memberId, trip_id: tripId, budget_paise: budget, prefs: answers, updated_at: new Date().toISOString() },
        { onConflict: "member_id" },
      );
    if (error) {
      setError(errorMessage(error));
      setPending(false);
      return;
    }
    router.push(`/trips/${tripId}/decide`);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="budget">Max budget per person (₹)</Label>
        <Input
          id="budget"
          name="budget"
          inputMode="decimal"
          placeholder="15000"
          defaultValue={budgetPaise ? String(budgetPaise / 100) : ""}
          className="h-11"
        />
      </div>
      {TAGS.map((t) => (
        <fieldset key={t.id} className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">{t.label}</legend>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
            {CHOICES.map((c) => (
              <Label
                key={c.value}
                className="h-11 cursor-pointer justify-center rounded-md text-center text-xs text-muted-foreground has-checked:bg-background has-checked:text-foreground has-checked:shadow-sm has-focus-visible:ring-2 has-focus-visible:ring-ring"
              >
                <input type="radio" name={t.id} value={c.value} defaultChecked={(prefs[t.id] ?? 0) === c.value} className="sr-only" />
                {c.label}
              </Label>
            ))}
          </div>
        </fieldset>
      ))}
      <Button type="submit" disabled={pending} className="h-11">
        {pending ? "Saving…" : "Save privately"}
      </Button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
