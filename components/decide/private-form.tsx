"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock, LockOpen } from "lucide-react";
import { useToast } from "@/components/kafila/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { success } from "@/lib/haptics";
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
  const [saved, setSaved] = useState(false);
  const toast = useToast();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saved) return; // already saved and navigating
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
    setPending(false);
    if (error) {
      setError(errorMessage(error));
      return;
    }
    setSaved(true);
    success();
    toast("Locked in. Only you can see it.", { tone: "success" });
    router.push(`/trips/${tripId}/decide`);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6">
      <div className="grid gap-2">
        <Label htmlFor="budget" className="text-[15px] font-semibold">Max budget per person (₹)</Label>
        <div className="relative">
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-2xl font-bold text-muted-foreground">₹</span>
          <Input
            id="budget"
            name="budget"
            inputMode="decimal"
            placeholder="15000"
            defaultValue={budgetPaise ? String(budgetPaise / 100) : ""}
            className="tabular h-14 rounded-xl bg-card pl-10 text-2xl font-bold md:text-2xl"
          />
        </div>
      </div>
      <div className="grid gap-1">
        <h2 className="text-[17px] font-bold">What you love</h2>
        <div className="divide-y divide-border border-y border-border">
          {TAGS.map((t) => (
            <fieldset key={t.id} className="grid gap-2 py-3">
              <legend className="mb-2 text-[15px] font-semibold">{t.label}</legend>
              <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-ink bg-card">
                {CHOICES.map((c) => (
                  <Label
                    key={c.value}
                    className="press h-11 cursor-pointer justify-center border-l border-ink text-center text-[13px] font-semibold first:border-l-0 hover:bg-muted has-checked:bg-truck-green-ink has-checked:text-white has-focus-visible:outline-2 has-focus-visible:-outline-offset-4 has-focus-visible:outline-white"
                  >
                    <input type="radio" name={t.id} value={c.value} defaultChecked={(prefs[t.id] ?? 0) === c.value} className="sr-only" />
                    {c.label}
                  </Label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {/* The padlock clicks shut (one .pop) when the save lands. */}
        {saved ? <Lock aria-hidden className="pop size-[18px]" strokeWidth={1.8} /> : <LockOpen aria-hidden className="size-[18px]" strokeWidth={1.8} />}
        {pending ? "Saving…" : saved ? "Locked in" : "Save privately"}
      </Button>
      {error && <p role="alert" className="text-[15px] text-destructive">{error}</p>}
    </form>
  );
}
