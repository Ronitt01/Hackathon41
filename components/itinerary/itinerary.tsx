"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, BedDouble, Bus, Compass, MapPin, MoreHorizontal, Pencil, Pin, Plus, Trash2, Users, Utensils, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inr } from "@/lib/money";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/supabase/auth";
import { byPosition, dayCount, dayLabel, positionUpdates, STOP_COLUMNS } from "./days";
import { KINDS, StopForm, type StopFields } from "./stop-form";

const KIND_ICONS = { activity: Compass, food: Utensils, travel: Bus, stay: BedDouble, meetup: Users } as const;

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
  const [open, setOpen] = useState<string | null>(null); // the one stop whose controls are showing
  // Delete confirm for the open stop: null = not asked, true = asking, false = just cancelled (refocus the trash button).
  const [confirming, setConfirming] = useState<boolean | null>(null);

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
  const perPerson = activeMembers > 0 ? Math.round(total / activeMembers) : total;

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
    setOpen(null);
    act(async (supabase) => {
      const res = await supabase.from("stops").delete().eq("id", stop.id);
      if (res.error) return [res];
      return savePositions(supabase, stopsOn(stop.day).filter((s) => s.id !== stop.id));
    });
  }

  return (
    <div className="grid gap-5">
      <p className="text-[13px] text-muted-foreground">
        Plan total <strong className="tabular font-semibold text-ink">{inr(total)}</strong>
        {activeMembers > 1 && perPerson !== total && <> · about <strong className="tabular font-semibold text-ink">{inr(perPerson)}</strong> per person</>}
      </p>
      {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}

      {Array.from({ length: days }, (_, i) => i + 1).map((day) => {
        const dayStops = stopsOn(day);
        return (
          <section key={day} className="grid" aria-labelledby={`day-${day}`}>
            <h3 id={`day-${day}`} className="mb-1 text-[15px] leading-snug font-bold">{dayLabel(day, startDate, true)}</h3>
            {dayStops.length === 0 && <p className="border-t py-2 text-[13px] text-muted-foreground">Nothing planned yet. Add the first stop.</p>}
            <ol className="grid">
              {dayStops.map((s, i) => {
                const Kind = KIND_ICONS[s.kind as keyof typeof KIND_ICONS] ?? MapPin;
                return editing === s.id ? (
                  <li key={s.id} className="border-t py-2">
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
                  <li key={s.id} className="grid grid-cols-[48px_1fr_auto_auto] items-start gap-x-2.5 border-t py-2">
                    <span className="tabular font-semibold">{s.starts_at?.slice(0, 5)}</span>
                    <div className="min-w-0">
                      <p className="leading-snug font-semibold break-words">{s.title}</p>
                      {(s.location_name || s.cost_paise > 0 || s.locked) && (
                        <p className="flex gap-1 text-[13px] text-muted-foreground">
                          {s.locked && (
                            <span className="flex shrink-0 items-center gap-0.5 font-semibold text-truck-green-ink">
                              <Pin aria-hidden strokeWidth={1.8} className="size-3.5" />
                              Kept
                            </span>
                          )}
                          <span className="truncate">
                            {s.locked && (s.location_name || s.cost_paise > 0) && "· "}
                            {[s.location_name, s.cost_paise > 0 && `${inr(s.cost_paise)} for the group`].filter(Boolean).join(" · ")}
                          </span>
                        </p>
                      )}
                    </div>
                    <span className="flex items-center gap-1 rounded-full border border-ink bg-card px-2.5 text-[13px] leading-5 font-semibold">
                      <Kind aria-hidden strokeWidth={1.8} className="size-4" />
                      {KINDS[s.kind as keyof typeof KINDS] ?? s.kind}
                    </span>
                    {/* 44px target; negative margin keeps the row as compact as the sketch. */}
                    <IconButton
                      label={`Edit ${s.title}`}
                      aria-expanded={open === s.id}
                      aria-controls={`controls-${s.id}`}
                      onClick={() => {
                        setOpen(open === s.id ? null : s.id);
                        setConfirming(null);
                      }}
                      icon={MoreHorizontal}
                      className="-my-2 -mr-2"
                    />
                    {open === s.id && (
                      <div id={`controls-${s.id}`} className="col-span-3 col-start-2 -ml-3 flex flex-wrap items-center pt-1">
                        <IconButton label={`Move ${s.title} up`} disabled={i === 0} onClick={() => move(day, i, -1)} icon={ArrowUp} />
                        <IconButton label={`Move ${s.title} down`} disabled={i === dayStops.length - 1} onClick={() => move(day, i, 1)} icon={ArrowDown} />
                        <IconButton label={`Change details of ${s.title}`} onClick={() => setEditing(s.id)} icon={Pencil} />
                        {confirming ? (
                          <>
                            <Button className="bg-destructive px-3 text-[13px] text-white hover:bg-destructive/90" onClick={() => remove(s)}>
                              Delete<span className="sr-only"> {s.title}</span>
                            </Button>
                            <Button variant="ghost" autoFocus className="px-3 text-[13px]" onClick={() => setConfirming(false)}>
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <IconButton
                            label={`Delete ${s.title}`}
                            autoFocus={confirming === false}
                            onClick={() => setConfirming(true)}
                            icon={Trash2}
                            className="text-ink"
                          />
                        )}
                        <Button
                          variant="ghost"
                          aria-pressed={s.locked}
                          onClick={() => act((supabase) => Promise.all([supabase.from("stops").update({ locked: !s.locked }).eq("id", s.id)]))}
                          className={`ml-auto px-3 text-[13px] ${s.locked ? "bg-truck-green-ink text-white hover:bg-truck-green-ink/90 hover:text-white" : "text-muted-foreground"}`}
                        >
                          <Pin aria-hidden strokeWidth={1.8} className="size-4" />
                          Keep<span className="sr-only"> {s.title}</span> when AI re-plans
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
            <div className="border-t pt-2">
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
                <Button variant="outline" className="w-full bg-card" onClick={() => setEditing(`add-${day}`)}>
                  <Plus aria-hidden strokeWidth={1.8} className="size-[18px]" />
                  Add stop
                </Button>
              )}
            </div>
          </section>
        );
      })}

      <Button variant="outline" className="bg-card" onClick={() => setMinDays(days + 1)}>
        <Plus aria-hidden strokeWidth={1.8} className="size-[18px]" />
        Add day
      </Button>
    </div>
  );
}

/** Compact 44px icon action for a stop row. */
function IconButton({
  label,
  icon: Icon,
  className = "",
  ...props
}: {
  label: string;
  icon: LucideIcon;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  "aria-expanded"?: boolean;
  "aria-controls"?: string;
  onClick: () => void;
}) {
  return (
    <Button variant="ghost" aria-label={label} className={`size-11 px-0 text-muted-foreground ${className}`} {...props}>
      <Icon aria-hidden strokeWidth={1.8} className="size-[18px]" />
    </Button>
  );
}
