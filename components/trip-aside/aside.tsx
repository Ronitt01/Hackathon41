import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ReflectorBar } from "@/components/kafila/reflector-bar";
import { StickerStack } from "@/components/kafila/sticker-avatar";
import { countdown } from "@/lib/decisions";
import { createClient } from "@/lib/supabase/server";
import { TripAsideLive } from "./live";
import { Bone } from "./skeleton";

// Rendered per request; a passed deadline reads as "locking", like the Decide tab.
const lockText = (deadline: string | null) => (!deadline ? "No deadline" : (countdown(deadline, Date.now()) ?? "Time's up, locking…"));

/**
 * Desktop (≥1024px) right column: four glanceable blocks, each linking to its tab.
 * Only aggregates and shared rows under the viewer's RLS: names, counts, the group minimum. Never an amount.
 */
export async function TripAside({ tripId, activePlanId }: { tripId: string; activePlanId: string | null }) {
  const supabase = await createClient();
  const [members, decision, readiness, bars] = await Promise.all([
    supabase.from("members").select("display_name, status").eq("trip_id", tripId).neq("status", "dropped").order("joined_at"),
    supabase
      .from("decisions")
      .select("question, deadline")
      .eq("trip_id", tripId)
      .is("locked_option_id", null)
      .order("deadline", { ascending: true, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
    supabase.rpc("jar_readiness", { p_trip: tripId }),
    activePlanId ? supabase.rpc("fairness_bars", { p_plan: activePlanId }) : { data: null },
  ]);

  const failed = members.error ?? decision.error ?? readiness.error ?? ("error" in bars ? bars.error : null);
  if (failed) {
    return (
      <div className="grid gap-3">
        <TripAsideLive tripId={tripId} />
        <p role="alert" className="rounded-xl border bg-card p-4 text-[13px] text-muted-foreground">
          Couldn&apos;t load the summary. Refresh to try again.
        </p>
      </div>
    );
  }

  const crew = members.data ?? [];
  const confirmed = crew.filter((m) => m.status === "confirmed").length;
  const jar = (readiness.data as { on_track: number; total: number }[] | null)?.[0];
  const scores = ((bars.data ?? []) as (number | string)[]).map(Number); // numeric can arrive as a string
  const minimum = scores.length ? Math.round(Math.min(...scores) * 100) : null;
  const base = `/trips/${tripId}`;

  return (
    <div className="grid gap-3">
      <TripAsideLive tripId={tripId} />
      <Block href={base} title="Who's in">
        <div className="flex items-center gap-3">
          {crew.length > 0 && <StickerStack names={crew.map((m) => m.display_name)} size="sm" />}
          <span className="tabular text-[13px] font-semibold">{crew.length <= 1 ? "Just you so far" : `${confirmed} of ${crew.length} in`}</span>
        </div>
      </Block>

      <Block href={`${base}/decide`} title="Next decision">
        {decision.data ? (
          <span className="grid gap-0.5">
            <span className="line-clamp-2 break-words">{decision.data.question}</span>
            <span className="text-[13px] text-muted-foreground">{lockText(decision.data.deadline)}</span>
          </span>
        ) : (
          <span className="text-[13px] text-muted-foreground">Nothing waiting on a vote.</span>
        )}
      </Block>

      <Block href={`${base}/jar`} title="Trip Jar">
        <span className="tabular text-[13px] font-semibold">{`${jar?.on_track ?? 0} of ${jar?.total ?? crew.length} on track`}</span>
      </Block>

      <Block href={`${base}/plan`} title="Fair plan">
        {minimum === null ? (
          <span className="text-[13px] text-muted-foreground">No fair plan yet.</span>
        ) : (
          <span className="grid gap-1.5">
            <span className="flex justify-between gap-2 text-[13px] font-semibold">
              Group minimum <span className="tabular">{minimum}%</span>
            </span>
            <ReflectorBar value={minimum} label="Group minimum" />
          </span>
        )}
      </Block>
    </div>
  );
}

function Block({ href, title, children }: { href: string; title: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="press group grid gap-2 rounded-xl border bg-card p-4 hover:bg-muted"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-bold">{title}</h2>
        <ChevronRight aria-hidden className="size-4 text-muted-foreground" strokeWidth={1.8} />
      </div>
      {children}
    </Link>
  );
}

/** Same four blocks' shape while the aside's reads are in flight. */
export function TripAsideSkeleton() {
  return (
    <div aria-hidden className="grid gap-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="grid gap-3 rounded-xl border bg-card p-4">
          <Bone className="h-4 w-24" />
          <Bone className="h-3.5 w-36" />
        </div>
      ))}
    </div>
  );
}
