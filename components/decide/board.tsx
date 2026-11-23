"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Columns2, Flower2, Plus, X } from "lucide-react";
import { PaintedBoard } from "@/components/kafila/painted-board";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { AddOptionForm } from "./add-option-form";
import { CompareStays } from "./compare-stays";
import { loadDecide, reactionsOn, type DecideData } from "./data";
import { CHIP, OptionCard, toggleClass } from "./option-card";

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
export function DecideBoard({
  tripId,
  meId,
  initial,
  children,
}: {
  tripId: string;
  meId: string;
  initial: DecideData;
  /** Rendered under the favourite board (the page's budget & preferences row). */
  children?: React.ReactNode;
}) {
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
  // Group favourite: likes + 3×Roses on the whole option; ties keep the first (newest) option.
  let fav: { title: string; likes: number; roses: number; score: number } | null = null;
  for (const o of data.options) {
    if (o.vetoed_at) continue;
    const likes = reactionsOn(data.reactions, o.id, null, "like").length;
    const roses = reactionsOn(data.reactions, o.id, null, "rose").length;
    const score = likes + 3 * roses;
    if (score > (fav?.score ?? 0)) fav = { title: o.title, likes, roses, score };
  }
  const favNote = fav && [
    "Most loved so far",
    fav.likes > 0 && `${fav.likes} ${fav.likes === 1 ? "like" : "likes"}`,
    fav.roses > 0 && `${fav.roses} ${fav.roses === 1 ? "Rose" : "Roses"}`,
  ].filter(Boolean).join(" · ");
  const kinds = FILTERS[filter].kinds;
  const shown = data.options
    .filter((o) => !kinds || kinds.includes(o.kind))
    .sort((a, b) => Number(!!a.vetoed_at) - Number(!!b.vetoed_at));

  return (
    <section className="grid gap-4" aria-label="Options">
      {fav && <PaintedBoard note={favNote || undefined}>{fav.title}</PaintedBoard>}
      {children}
      <div className="grid grid-cols-2 gap-2">
        <Button variant={panel === "add" ? "outline" : "default"} className={panel === "add" ? "border-input bg-card" : undefined} onClick={() => setPanel(panel === "add" ? null : "add")}>
          {panel === "add" ? <X aria-hidden className="size-[18px]" strokeWidth={1.8} /> : <Plus aria-hidden className="size-[18px]" strokeWidth={1.8} />}
          {panel === "add" ? "Close" : "Add an option"}
        </Button>
        <Button variant="outline" className={cn(toggleClass(panel === "compare"), "rounded-lg")} aria-pressed={panel === "compare"} onClick={() => setPanel(panel === "compare" ? null : "compare")}>
          <Columns2 aria-hidden className="size-[18px]" strokeWidth={1.8} />
          Compare stays
        </Button>
      </div>
      {panel === "add" && <AddOptionForm tripId={tripId} meId={meId} onAdded={() => { setPanel(null); refresh(); }} />}
      {panel === "compare" && <CompareStays tripId={tripId} data={data} activeCount={activeCount} refresh={refresh} />}

      <p className="flex items-start gap-2 text-[15px] text-muted-foreground">
        <Flower2 aria-hidden className={cn("mt-0.5 size-[18px] shrink-0", myRose ? "text-truck-green-ink" : "text-ink")} strokeWidth={1.8} />
        <span>
          {myRose
            ? <>Your Rose is on <strong className="font-semibold text-ink">{data.options.find((o) => o.id === myRose.option_id)?.title}</strong>.</>
            : "You have one Rose for this trip. Give it to the option you love most."}
        </span>
      </p>

      <div className="-mx-1 flex flex-wrap" role="group" aria-label="Filter by kind">
        {FILTERS.map((f, i) => (
          // 44px tap target around a 32px chip
          <button key={f.label} type="button" className="group flex h-11 shrink-0 items-center px-1 outline-none" aria-pressed={i === filter} onClick={() => setFilter(i)}>
            <span
              className={cn(
                CHIP,
                "h-8 px-3.5 group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-truck-green",
                i === filter ? "border-truck-green-ink bg-truck-green-ink text-white" : "group-hover:bg-muted",
              )}
            >
              {f.label}
            </span>
          </button>
        ))}
      </div>

      {error && <p role="alert" className="text-[15px] text-destructive">{error}</p>}
      {shown.length === 0 && (
        <p className="rounded-xl border border-dashed border-border bg-card px-4 py-8 text-center text-[15px] text-muted-foreground">
          Nothing here yet. Add a stay, a café or a day out, and let the group react.
        </p>
      )}
      {shown.map((o) => (
        <OptionCard key={o.id} option={o} data={data} names={names} meId={meId} tripId={tripId} myRose={myRose} activeCount={activeCount} refresh={refresh} />
      ))}
    </section>
  );
}
