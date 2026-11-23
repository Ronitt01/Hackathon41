import Link from "next/link";
import { Check } from "lucide-react";
import { PaintedBoard } from "@/components/kafila/painted-board";
import { ReflectorBar } from "@/components/kafila/reflector-bar";
import { inr } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

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
  const scores = ((bars.data ?? []) as (number | string)[]).map(Number).sort((a, b) => a - b);
  const own = mine.data as { total_paise: number; why: string | null } | null;

  return (
    <>
      {scores.length > 0 ? ( // scores exist only once a fair plan was computed; a trip's starter plan has none
        // Keyed by plan so a new fair plan re-stamps the board; MakeFairPlan bursts confetti from #fair-board.
        <div id="fair-board" key={planId}>
          <PaintedBoard>Fits everyone&apos;s budget</PaintedBoard>
        </div>
      ) : (
        <section className="grid gap-1" aria-labelledby="fair-plan">
          <h2 id="fair-plan" className="text-[17px] leading-snug font-bold">Fair plan</h2>
          <p className="text-muted-foreground">
            Budgets stay private. We pick the plan where the least happy person is as happy as possible.
          </p>
        </section>
      )}

      {scores.length > 0 && (
        <section key={planId} className="grid gap-2" aria-labelledby="fair-meter">
          <h2 id="fair-meter" className="text-[15px] leading-snug font-bold">How well it fits everyone</h2>
          <ul className="grid grid-cols-[104px_1fr_40px] items-center gap-x-2 gap-y-1.5">
            {scores.map((s, i) => (
              <li key={i} className="col-span-3 grid grid-cols-subgrid items-center">
                <span className="text-[13px] font-bold">{i === 0 && "Group minimum"}</span>
                <ReflectorBar value={pct(s)} index={i} label={i === 0 ? "Group minimum" : `Friend ${i + 1} of ${scores.length}`} />
                <span className="tabular text-right text-[13px] font-semibold">{pct(s)}%</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {own && (
        <section className="rounded-xl border bg-card px-3.5 py-3" aria-labelledby="fair-why">
          <h2 id="fair-why" className="mb-2 text-[15px] leading-snug font-bold">Why this works for you</h2>
          <ul className="grid gap-1">
            {(own.why ?? "").split("\n").filter(Boolean).map((line) => (
              <li key={line} className="flex items-start gap-2">
                <Check aria-hidden strokeWidth={1.8} className="mt-0.5 size-4 shrink-0 text-truck-green-ink" />
                {line}
              </li>
            ))}
          </ul>
          <p className="mt-2.5 flex items-baseline justify-between border-t pt-2">
            <span className="text-muted-foreground">Your share</span>
            <strong className="tabular text-[22px] font-bold">{inr(own.total_paise)}</strong>
          </p>
        </section>
      )}

      {(count ?? 0) < 2 && (
        <p className="text-[13px] text-muted-foreground">
          Plans with fewer than 2 options use what&apos;s in Decide —{" "}
          <Link href={`/trips/${tripId}/decide`} className="font-semibold text-ink underline">add options there first</Link>.
        </p>
      )}
    </>
  );
}
