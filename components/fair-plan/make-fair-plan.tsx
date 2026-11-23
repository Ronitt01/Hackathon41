"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const STEPS = ["Checking everyone's budget…", "Balancing preferences…", "Picking the fairest plan…"];
const NO_FIT = "No plan fits everyone's budget yet. Try fewer days or a cheaper stay, then make a fair plan again.";
const NO_OPTIONS = "Add a few places, food spots or stays in Decide first, then make a fair plan.";

/** A-1: the "Make a fair plan" button. Also refreshes this phone when anyone saves a new plan. */
export function MakeFairPlan({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [step, setStep] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = pending || refreshing;

  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 1800);
    return () => clearInterval(timer);
  }, [pending]);

  // A new plan sets trips.active_plan_id, so every phone re-renders the Plan tab.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`trip:${tripId}:fair-plan`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "trips", filter: `id=eq.${tripId}` }, () => router.refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, router]);

  async function onClick() {
    setPending(true);
    setStep(0);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch(`/api/trips/${tripId}/plan`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setError(typeof body.error === "string" ? body.error : "Something went wrong. Please try again.");
      else if (body.status === "no_fit") setNotice(NO_FIT);
      else if (body.status === "no_options") setNotice(NO_OPTIONS);
      else startTransition(() => router.refresh());
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    }
    setPending(false);
  }

  return (
    <div className="grid gap-2">
      <Button type="button" onClick={onClick} disabled={busy} className="h-11">
        {busy ? "Working on it…" : "✨ Make a fair plan"}
      </Button>
      <p role="status" className="min-h-5 text-center text-sm text-muted-foreground">
        {pending ? STEPS[step] : refreshing ? "Loading your plan…" : notice}
      </p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
