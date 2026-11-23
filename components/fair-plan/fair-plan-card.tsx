import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { inr } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { MakeFairPlan } from "./make-fair-plan";

const pct = (s: number) => Math.round(s * 100);

/** A-1/A-2 on the Plan tab. Only aggregates (anonymous bars) and the viewer's own plan_members row reach the browser. */
export async function FairPlanCard({ tripId, planId }: { tripId: string; planId: string | null }) {
  const supabase = await createClient();
  const [{ count }, bars, mine] = await Promise.all([
    supabase.from("options").select("id", { count: "exact", head: true }).eq("trip_id", tripId).is("vetoed_at", null),
    planId ? supabase.rpc("fairness_bars", { p_plan: planId }) : { data: null },
    // RLS: plan_members returns only the viewer's own row.
    planId ? supabase.from("plan_members").select("total_paise, why").eq("plan_id", planId).maybeSingle() : { data: null },
  ]);
  const scores = ((bars.data ?? []) as (number | string)[]).map(Number);
  const own = mine.data as { total_paise: number; why: string | null } | null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fair plan</CardTitle>
        <CardDescription>Budgets stay private. We pick the plan where the least happy person is as happy as possible.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        {scores.length > 0 && (
          <section className="grid gap-2" aria-labelledby="fair-meter">
            <h3 id="fair-meter" className="text-sm font-medium">How well it fits everyone (lowest first)</h3>
            <ul className="grid gap-1.5">
              {scores.map((s, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct(s)}%` }} />
                  </div>
                  <span className="w-10 text-right text-sm tabular-nums">{pct(s)}%</span>
                </li>
              ))}
            </ul>
            <p className="text-sm">
              Group minimum <strong className="tabular-nums">{pct(scores[0])}%</strong>
            </p>
          </section>
        )}
        {own && (
          <section className="grid gap-2 rounded-lg bg-muted p-3" aria-labelledby="fair-why">
            <h3 id="fair-why" className="text-sm font-medium">Why this works for you</h3>
            <ul className="grid gap-1 text-sm">
              {(own.why ?? "").split("\n").filter(Boolean).map((line) => (
                <li key={line}>✓ {line}</li>
              ))}
            </ul>
            <p className="text-sm">
              Your estimated cost <strong>{inr(own.total_paise)}</strong>
            </p>
          </section>
        )}
        {(count ?? 0) < 2 && (
          <p className="text-sm text-muted-foreground">
            Plans with fewer than 2 options use what&apos;s in Decide —{" "}
            <Link href={`/trips/${tripId}/decide`} className="underline">add options there first</Link>.
          </p>
        )}
        <MakeFairPlan tripId={tripId} />
      </CardContent>
    </Card>
  );
}
