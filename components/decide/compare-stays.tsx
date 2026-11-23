"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { inr, splitEqually } from "@/lib/money";
import { errorMessage } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";
import { reactionsOn, type DecideData, type Option } from "./data";

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
    return f === true ? "Fits ✓" : f === false ? "Over ✗" : "Add budgets";
  };
  type Row = [string, (o: Option) => React.ReactNode];
  const scores = data.scores;
  const rows = ([
    ["Total", (o) => (o.price_paise != null ? inr(o.price_paise) : "—")],
    ["Per head", (o) => (o.price_paise != null ? inr(splitEqually(o.price_paise, activeCount)[0]) : "—")],
    scores && ["Group fit", (o) => (scores[o.id] != null ? `${scores[o.id]}/100` : "—")],
    data.fit && ["Budget", fitText],
    ["♥ Likes", (o) => reactionsOn(data.reactions, o.id, null, "like").length],
    ["🌹 Roses", (o) => reactionsOn(data.reactions, o.id, null, "rose").length],
  ] as (Row | null)[]).filter((r): r is Row => r !== null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compare stays</CardTitle>
        <CardDescription>Pick one together and add it to the plan.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {stays.length === 0 ? (
          <p className="text-sm text-muted-foreground">No stays yet. Add a few options of kind “Stay” to compare them here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-x-2 text-sm">
              <thead>
                <tr>
                  <th scope="col" className="sr-only">Detail</th>
                  {stays.map((o) => <th key={o.id} scope="col" className="min-w-28 pb-2 text-left align-bottom font-medium">{o.title}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, cell]) => (
                  <tr key={label}>
                    <th scope="row" className="py-1.5 text-left font-normal whitespace-nowrap text-muted-foreground">{label}</th>
                    {stays.map((o) => <td key={o.id} className="py-1.5">{cell(o)}</td>)}
                  </tr>
                ))}
                {data.planId && (
                  <tr>
                    <td />
                    {stays.map((o) => (
                      <td key={o.id} className="pt-2">
                        {data.plannedOptionIds.includes(o.id) ? (
                          <span className="text-sm font-medium">Added to plan ✓</span>
                        ) : (
                          <Button variant="outline" className="h-11 w-full" disabled={pending === o.id} onClick={() => addToPlan(o)}>
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
          <p className="text-sm text-muted-foreground">No plan yet. Once the group has a plan, you can add a stay to it here.</p>
        )}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
