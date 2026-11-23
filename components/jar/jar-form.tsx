"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/kafila/toast";
import { tap } from "@/lib/haptics";
import { suggestedWeekly } from "@/lib/jar";
import { inr, toPaise } from "@/lib/money";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/supabase/auth";

const rupees = (paise: number | null) => (paise ? String(paise / 100) : "");

type Props = {
  tripId: string;
  meId: string;
  saved: number;
  weeks: number | null;
  goal: number | null; // current goal, or my share of the chosen plan
  weekly: number | null; // null = start from the suggestion
  onDone?: () => void;
};

/** Set up or edit my Jar (upsert on member_id). Weekly left blank = the suggested amount. */
export function JarForm({ tripId, meId, saved, weeks, goal, weekly, onDone }: Props) {
  const router = useRouter();
  const [goalText, setGoalText] = useState(rupees(goal));
  const [weeklyText, setWeeklyText] = useState(rupees(weekly));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const goalPaise = toPaise(goalText);
  const suggestion = goalPaise && weeks ? suggestedWeekly(goalPaise, saved, weeks) : 0;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!goalPaise) return setError("Enter how much you need for the trip, like 7500.");
    const weeklyPaise = weeklyText.trim() ? toPaise(weeklyText) : suggestion;
    if (!weeklyPaise) return setError("Enter how much you'll save each week, like 1250.");
    setPending(true);
    setError(null);
    const { error } = await createClient()
      .from("jars")
      .upsert({ member_id: meId, trip_id: tripId, goal_paise: goalPaise, weekly_paise: weeklyPaise }, { onConflict: "member_id" });
    setPending(false);
    if (error) return setError(errorMessage(error));
    tap();
    toast(weekly ? "Plan updated." : "Jar's open. Chalo!", { tone: "success" });
    onDone?.();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <div className="grid gap-2">
        <Label htmlFor="jar-goal">Goal (₹)</Label>
        <Input id="jar-goal" inputMode="decimal" value={goalText} onChange={(e) => setGoalText(e.target.value)} placeholder="7500" className="h-11" />
        {goal !== null && weekly === null && <p className="text-[13px] text-muted-foreground">Your share of the chosen plan.</p>}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="jar-weekly">Save each week (₹)</Label>
        <Input
          id="jar-weekly"
          inputMode="decimal"
          value={weeklyText}
          onChange={(e) => setWeeklyText(e.target.value)}
          placeholder={suggestion ? rupees(suggestion) : "1250"}
          className="h-11"
        />
        {suggestion > 0 && (
          <p className="text-[13px] text-muted-foreground">
            Suggested: {inr(suggestion)}/week for {weeks} {weeks === 1 ? "week" : "weeks"}. Leave blank to use it.
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="h-11 flex-1">{pending ? "Saving…" : weekly ? "Save" : "Start my Jar"}</Button>
        {onDone && (
          <Button type="button" variant="outline" onClick={onDone} className="h-11">Cancel</Button>
        )}
      </div>
      {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
    </form>
  );
}
