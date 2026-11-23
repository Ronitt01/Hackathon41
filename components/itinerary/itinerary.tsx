"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { inr } from "@/lib/money";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/supabase/auth";
import { byPosition, dayCount, dayLabel, positionUpdates, STOP_COLUMNS } from "./days";
import { KINDS, StopForm, type StopFields } from "./stop-form";

export type Stop = StopFields & { id: string; day: number; position: number; locked: boolean };

/** C-2: the active plan's stops, day by day, editable by every member and kept live with Realtime. */
export function Itinerary({
  tripId,
  planId,
  startDate,
  endDate,
  activeMembers,
  initial,
}: {
  tripId: string;
  planId: string;
  startDate: string | null;
  endDate: string | null;
  activeMembers: number;
  initial: Stop[];
}) {
  const [stops, setStops] = useState(initial);
  const [minDays, setMinDays] = useState(1);
  const [editing, setEditing] = useState<string | null>(null); // stop id, or "add-<day>"
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const refresh = async () => {
      const { data } = await supabase.from("stops").select(STOP_COLUMNS).eq("plan_id", planId);
      if (data) setStops(data as Stop[]);
    };
    const channel = supabase
      .channel(`trip:${tripId}:stops`)
      .on("postgres_changes", { event: "*", schema: "public", table: "stops", filter: `trip_id=eq.${tripId}` }, refresh)
      // Realtime can't filter DELETEs (old row carries only the id), so listen unfiltered; refresh is plan-scoped.
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "stops" }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, planId]);

  const days = Math.max(dayCount(startDate, endDate, stops.map((s) => s.day)), minDays);
  const stopsOn = (day: number) => stops.filter((s) => s.day === day).sort(byPosition);
  const total = stops.reduce((sum, s) => sum + s.cost_paise, 0);

  // Each action re-reads the stops itself so this phone updates even if Realtime is slow.
  async function run(action: (supabase: ReturnType<typeof createClient>) => Promise<{ error: unknown }[]>) {
    setError(null);
    const supabase = createClient();
    const failed = (await action(supabase)).find((r) => r.error)?.error;
    const { data } = await supabase.from("stops").select(STOP_COLUMNS).eq("plan_id", planId);
    if (data) setStops(data as Stop[]);
    if (failed) throw failed;
  }

  const savePositions = (supabase: ReturnType<typeof createClient>, ordered: Stop[]) =>
    Promise.all(positionUpdates(ordered).map((u) => supabase.from("stops").update({ position: u.position }).eq("id", u.id)));

  const act = (action: Parameters<typeof run>[0]) => run(action).catch((err) => setError(errorMessage(err)));

  function move(day: number, index: number, dir: -1 | 1) {
    const ordered = stopsOn(day);
    [ordered[index], ordered[index + dir]] = [ordered[index + dir], ordered[index]];
    act((supabase) => savePositions(supabase, ordered));
  }

  function remove(stop: Stop) {
    if (!confirm(`Remove "${stop.title}" from the plan?`)) return;
    act(async (supabase) => {
      const res = await supabase.from("stops").delete().eq("id", stop.id);
      if (res.error) return [res];
      return savePositions(supabase, stopsOn(stop.day).filter((s) => s.id !== stop.id));
    });
  }

  return (
    <div className="grid gap-6">
      <p className="text-sm">
        Plan total <strong>{inr(total)}</strong>
        {activeMembers > 0 && <> · about <strong>{inr(Math.round(total / activeMembers))}</strong> per person</>}
      </p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      {Array.from({ length: days }, (_, i) => i + 1).map((day) => {
        const dayStops = stopsOn(day);
        return (
          <section key={day} className="grid gap-3" aria-labelledby={`day-${day}`}>
            <h3 id={`day-${day}`} className="font-semibold">{dayLabel(day, startDate)}</h3>
            {dayStops.length === 0 && <p className="text-sm text-muted-foreground">Nothing planned yet. Add the first stop.</p>}
            <ol className="grid gap-2">
              {dayStops.map((s, i) =>
                editing === s.id ? (
                  <li key={s.id}>
                    <StopForm
                      idPrefix={`edit-${s.id}`}
                      initial={s}
                      submitLabel="Save"
                      onCancel={() => setEditing(null)}
                      onSave={async (fields) => {
                        await run((supabase) => Promise.all([supabase.from("stops").update(fields).eq("id", s.id)]));
                        setEditing(null);
                      }}
                    />
                  </li>
                ) : (
                  <li key={s.id} className="grid gap-2 rounded-lg border px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid gap-0.5">
                        <span className="font-medium">
                          {s.starts_at && <span className="mr-2 tabular-nums text-muted-foreground">{s.starts_at.slice(0, 5)}</span>}
                          {s.title}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {KINDS[s.kind as keyof typeof KINDS] ?? s.kind}
                          {s.location_name && ` · ${s.location_name}`}
                          {s.locked && " · 📌 kept"}
                        </span>
                      </div>
                      {s.cost_paise > 0 && <span className="text-sm tabular-nums">{inr(s.cost_paise)}</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <Button variant="ghost" className="h-11 w-11" aria-label={`Move ${s.title} up`} disabled={i === 0} onClick={() => move(day, i, -1)}>↑</Button>
                      <Button variant="ghost" className="h-11 w-11" aria-label={`Move ${s.title} down`} disabled={i === dayStops.length - 1} onClick={() => move(day, i, 1)}>↓</Button>
                      <Button variant="ghost" className="h-11" onClick={() => setEditing(s.id)}>Edit</Button>
                      <Button variant="ghost" className="h-11 text-destructive" onClick={() => remove(s)}>Delete</Button>
                      <label className="ml-auto flex h-11 items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={s.locked}
                          onChange={(e) => act((supabase) => Promise.all([supabase.from("stops").update({ locked: e.target.checked }).eq("id", s.id)]))}
                          className="size-4"
                        />
                        Keep when AI re-plans
                      </label>
                    </div>
                  </li>
                ),
              )}
            </ol>
            {editing === `add-${day}` ? (
              <StopForm
                idPrefix={`add-${day}`}
                submitLabel="Add stop"
                onCancel={() => setEditing(null)}
                onSave={async (fields) => {
                  const row = { ...fields, trip_id: tripId, plan_id: planId, day, position: dayStops.length };
                  await run((supabase) => Promise.all([supabase.from("stops").insert(row)]));
                  setEditing(null);
                }}
              />
            ) : (
              <Button variant="outline" className="h-11" onClick={() => setEditing(`add-${day}`)}>+ Add stop</Button>
            )}
          </section>
        );
      })}

      <Button variant="secondary" className="h-11" onClick={() => setMinDays(days + 1)}>+ Add day</Button>
    </div>
  );
}
