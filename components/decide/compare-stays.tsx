"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CircleAlert, CircleCheck } from "lucide-react";
import { inr, splitEqually } from "@/lib/money";
import { errorMessage } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { reactionsOn, type DecideData, type Option } from "./data";
import { SURFACE } from "./option-card";

/** C-3: stays side by side; "Add to plan" puts one on day 1 of the active plan. */
export function CompareStays({ tripId, data, activeCount, refresh }: { tripId: string; data: DecideData; activeCount: number; refresh: () => void }) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stays = data.options.filter((o) => o.kind === "stay" && !o.vetoed_at);

  async function addToPlan(o: Option) {
    setPending(o.id);
    setError(null);
    const { error } = await createClient().from("stops").insert({
      trip_id: tripId, plan_id: data.planId, option_id: o.id, day: 1, position: 0,
      kind: "stay", title: o.title, cost_paise: o.price_paise ?? 0, tags: o.tags,
    });
    if (error) setError(errorMessage(error));
    setPending(null);
    refresh();
  }

  const fitText = (o: Option) => {
    if (!data.fit || o.price_paise == null) return "—";
    const f = data.fit[o.id];
    if (f === true)
      return <span className="inline-flex items-center gap-1 font-semibold text-truck-green-ink"><CircleCheck aria-hidden className="size-4" strokeWidth={1.8} />Fits</span>;
    if (f === false)
      return <span className="inline-flex items-center gap-1 font-semibold text-truck-red"><CircleAlert aria-hidden className="size-4" strokeWidth={1.8} />Over</span>;
    return <span className="text-muted-foreground">Add budgets</span>;
  };
  type Row = [string, (o: Option) => React.ReactNode];
  const scores = data.scores;
  const rows = ([
    ["Total", (o) => (o.price_paise != null ? inr(o.price_paise) : "—")],
    ["Per head", (o) => (o.price_paise != null ? inr(splitEqually(o.price_paise, activeCount)[0]) : "—")],
    scores && ["Group fit", (o) => (scores[o.id] != null ? `${scores[o.id]}/100` : "—")],
    data.fit && ["Budget", fitText],
    ["Likes", (o) => reactionsOn(data.reactions, o.id, null, "like").length],
    ["Roses", (o) => reactionsOn(data.reactions, o.id, null, "rose").length],
  ] as (Row | null)[]).filter((r): r is Row => r !== null);
  const cellClass = "border-t border-border px-2 py-2 align-top";

  return (
    <section className={cn(SURFACE, "grid gap-3 p-4")} aria-labelledby="compare-stays-title">
      <div className="grid gap-0.5">
        <h2 id="compare-stays-title" className="text-[17px] font-bold">Compare stays</h2>
        <p className="text-[13px] text-muted-foreground">Pick one together and add it to the plan.</p>
      </div>
      {stays.length === 0 ? (
        <p className="text-[15px] text-muted-foreground">No stays yet. Add a few options of kind “Stay” to compare them here.</p>
      ) : (
        <div className="-mx-2 overflow-x-auto">
          <table className="tabular w-full border-collapse text-[15px]">
            <thead>
              <tr>
                <th scope="col" className="sr-only">Detail</th>
                {stays.map((o) => <th key={o.id} scope="col" className="min-w-32 px-2 pb-2 text-left align-bottom font-bold leading-snug">{o.title}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, cell]) => (
                <tr key={label}>
                  <th scope="row" className={cn(cellClass, "text-left text-[13px] font-normal whitespace-nowrap text-muted-foreground")}>{label}</th>
                  {stays.map((o) => <td key={o.id} className={cellClass}>{cell(o)}</td>)}
                </tr>
              ))}
              {data.planId && (
                <tr>
                  <td className="border-t border-border" />
                  {stays.map((o) => (
                    <td key={o.id} className={cn(cellClass, "pt-3")}>
                      {data.plannedOptionIds.includes(o.id) ? (
                        <span className="inline-flex h-11 items-center gap-1.5 font-semibold text-truck-green-ink">
                          <CircleCheck aria-hidden className="size-[18px]" strokeWidth={1.8} />Added to plan
                        </span>
                      ) : (
                        <Button variant="outline" className="w-full border-input bg-card" disabled={pending === o.id} onClick={() => addToPlan(o)}>
                          {pending === o.id ? "Adding…" : "Add to plan"}
                        </Button>
                      )}
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {stays.length > 0 && !data.planId && (
        <p className="text-[13px] text-muted-foreground">No plan yet. Once the group has a plan, you can add a stay to it here.</p>
      )}
      {error && <p role="alert" className="text-[15px] text-destructive">{error}</p>}
    </section>
  );
}
