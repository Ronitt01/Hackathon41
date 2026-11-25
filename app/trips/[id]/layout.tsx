import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { TripAside, TripAsideSkeleton } from "@/components/trip-aside/aside";
import { TripPaint, TripRail, TripTabs } from "@/components/trip-tabs";
import { maybeAutoPlan } from "@/lib/auto-plan";
import { createClient } from "@/lib/supabase/server";

const day = new Intl.DateTimeFormat("en-IN", { day: "numeric", timeZone: "UTC" });
const dayMonth = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

/** "12–15 Dec", "28 Dec – 2 Jan", "12 Dec", or null. */
function dateRange(start: string | null, end: string | null) {
  if (!start) return null;
  const s = new Date(start), e = end ? new Date(end) : null;
  if (!e || +e === +s) return dayMonth.format(s);
  return s.getUTCMonth() === e.getUTCMonth() ? `${day.format(s)}–${dayMonth.format(e)}` : `${dayMonth.format(s)} – ${dayMonth.format(e)}`;
}

/**
 * Phone (<1024px): sticky app bar, one 448px column, fixed bottom tabs.
 * Desktop (≥1024px): left rail with the tabs, the content column, and a sticky "at a glance" aside.
 */
export default async function TripLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  // RLS returns nothing unless the viewer is a member, so "not found" also covers "not yours".
  const [{ data: trip }, { count }] = await Promise.all([
    supabase.from("trips").select("id, name, start_date, end_date, active_plan_id").eq("id", id).maybeSingle(),
    supabase.from("members").select("id", { count: "exact", head: true }).eq("trip_id", id).neq("status", "dropped"),
  ]);
  if (!trip) notFound();
  // Whoever opens the trip next moves it along: makes the fair plan once every budget is in or the "plan by" date passes.
  after(() => maybeAutoPlan(trip.id).catch((err) => console.error("auto plan failed", err)));
  const when = dateRange(trip.start_date, trip.end_date);
  const who = (count ?? 1) <= 1 ? "Just you" : `${count} friends`;
  const meta = when ? `${when} · ${who}` : who;

  return (
    <TripPaint tripId={trip.id}>
      <header className="sticky top-0 z-10 border-b-4 border-paint bg-wash lg:hidden">
        <div className="mx-auto flex h-16 max-w-md items-center gap-2 px-2">
          <Link href="/start" aria-label="All trips" className="grid size-11 place-items-center rounded-full hover:bg-muted">
            <ChevronLeft aria-hidden className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[18px] leading-tight font-bold">{trip.name}</h1>
            <p className="text-[13px] text-muted-foreground">{meta}</p>
          </div>
          <span aria-hidden className="shrink-0 pr-2 text-[12px] font-bold tracking-[0.12em] uppercase text-muted-foreground">Kafila</span>
        </div>
      </header>
      <div className="flex-1 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)]">
        <TripRail tripId={trip.id} title={trip.name} meta={meta} />
        <div className="lg:flex lg:justify-center lg:gap-6 lg:px-6 xl:gap-8 xl:px-8">
          <main className="mx-auto grid w-full max-w-md content-start gap-4 overflow-x-clip px-4 pt-4 pb-28 lg:mx-0 lg:max-w-[680px] lg:min-w-0 lg:flex-1 lg:px-0 lg:pt-8 lg:pb-16">
            {children}
          </main>
          <aside aria-label="Trip at a glance" className="sticky top-0 hidden w-72 shrink-0 self-start pt-8 pb-8 lg:block xl:w-80">
            {/* shortcut: streams (4 reads) at every width though only shown at lg; mount from a matchMedia client wrapper if phone refreshes get slow. */}
            <Suspense fallback={<TripAsideSkeleton />}>
              <TripAside tripId={trip.id} activePlanId={trip.active_plan_id} />
            </Suspense>
          </aside>
        </div>
      </div>
      <TripTabs tripId={trip.id} />
    </TripPaint>
  );
}
