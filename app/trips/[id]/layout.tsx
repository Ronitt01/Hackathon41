import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { TripPaint, TripTabs } from "@/components/trip-tabs";
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

export default async function TripLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  // RLS returns nothing unless the viewer is a member, so "not found" also covers "not yours".
  const [{ data: trip }, { count }] = await Promise.all([
    supabase.from("trips").select("id, name, start_date, end_date").eq("id", id).maybeSingle(),
    supabase.from("members").select("id", { count: "exact", head: true }).eq("trip_id", id).neq("status", "dropped"),
  ]);
  if (!trip) notFound();
  const when = dateRange(trip.start_date, trip.end_date);
  const who = (count ?? 1) <= 1 ? "Just you" : `${count} friends`;

  return (
    <TripPaint tripId={trip.id}>
      <header className="sticky top-0 z-10 border-b-4 border-paint bg-wash/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-md items-center gap-2 px-2">
          <Link href="/" aria-label="All trips" className="grid size-11 place-items-center rounded-full hover:bg-muted">
            <ChevronLeft aria-hidden className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[18px] leading-tight font-bold">{trip.name}</h1>
            <p className="text-[13px] text-muted-foreground">{when ? `${when} · ${who}` : who}</p>
          </div>
          <span aria-hidden className="shrink-0 pr-2 font-display text-[13px] uppercase text-ink">Kafila</span>
        </div>
      </header>
      <main className="mx-auto grid w-full max-w-md content-start gap-4 px-4 pt-4 pb-28">{children}</main>
      <TripTabs tripId={trip.id} />
    </TripPaint>
  );
}
