"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";
import { AddOptionForm } from "./add-option-form";
import { CompareStays } from "./compare-stays";
import { loadDecide, type DecideData } from "./data";
import { OptionCard } from "./option-card";

const FILTERS = [
  { label: "All", kinds: null },
  { label: "Stays", kinds: ["stay"] },
  { label: "Activities", kinds: ["activity"] },
  { label: "Food", kinds: ["food"] },
  { label: "Destinations", kinds: ["destination"] },
  { label: "Other", kinds: ["transport", "other"] },
];
const LIVE_TABLES = ["options", "option_aspects", "reactions", "comments", "stops"];

/** D-1 / D-2 / C-3: options with likes, Roses, comments and group fit, kept live with Realtime. */
export function DecideBoard({ tripId, meId, initial }: { tripId: string; meId: string; initial: DecideData }) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState(0);
  const [panel, setPanel] = useState<"add" | "compare" | null>(null);
  const latest = useRef(0);

  const refresh = useCallback(async () => {
    const run = ++latest.current; // several events arrive at once; only the newest load wins
    try {
      const next = await loadDecide(createClient(), tripId);
      if (run === latest.current) {
        setData(next);
        setError(null);
      }
    } catch (err) {
      if (run === latest.current) setError(errorMessage(err));
    }
  }, [tripId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`trip:${tripId}:decide`);
    for (const table of LIVE_TABLES) {
      channel.on("postgres_changes", { event: "*", schema: "public", table, filter: `trip_id=eq.${tripId}` }, refresh);
    }
    // DELETE events carry only the primary key, so the trip_id filter drops them (un-like, Rose taken back).
    channel.on("postgres_changes", { event: "DELETE", schema: "public", table: "reactions" }, refresh);
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, refresh]);

  const names = Object.fromEntries(data.members.map((m) => [m.id, m.display_name]));
  const activeCount = Math.max(1, data.members.filter((m) => m.status !== "dropped").length);
  const myRose = data.reactions.find((r) => r.kind === "rose" && r.member_id === meId);
  const kinds = FILTERS[filter].kinds;
  const shown = data.options
    .filter((o) => !kinds || kinds.includes(o.kind))
    .sort((a, b) => Number(!!a.vetoed_at) - Number(!!b.vetoed_at));

  return (
    <section className="grid gap-4" aria-label="Options">
      <div className="grid grid-cols-2 gap-2">
        <Button variant={panel === "add" ? "secondary" : "default"} className="h-11" onClick={() => setPanel(panel === "add" ? null : "add")}>
          {panel === "add" ? "Close" : "Add an option"}
        </Button>
        <Button variant="outline" className="h-11" aria-pressed={panel === "compare"} onClick={() => setPanel(panel === "compare" ? null : "compare")}>
          Compare stays
        </Button>
      </div>
      {panel === "add" && <AddOptionForm tripId={tripId} meId={meId} onAdded={() => { setPanel(null); refresh(); }} />}
      {panel === "compare" && <CompareStays tripId={tripId} data={data} activeCount={activeCount} refresh={refresh} />}

      <p className="text-sm text-muted-foreground">
        {myRose
          ? <>Your Rose 🌹 is on <strong className="text-foreground">{data.options.find((o) => o.id === myRose.option_id)?.title}</strong>.</>
          : "You have one Rose 🌹 for this trip. Give it to the option you love most."}
      </p>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Filter by kind">
        {FILTERS.map((f, i) => (
          <Button key={f.label} variant={i === filter ? "default" : "outline"} className="h-11 rounded-full px-4" aria-pressed={i === filter} onClick={() => setFilter(i)}>
            {f.label}
          </Button>
        ))}
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {shown.length === 0 && (
        <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
          Nothing here yet. Add a stay, a café or a day out, and let the group react.
        </p>
      )}
      {shown.map((o) => (
        <OptionCard key={o.id} option={o} data={data} names={names} meId={meId} tripId={tripId} myRose={myRose} activeCount={activeCount} refresh={refresh} />
      ))}
    </section>
  );
}
