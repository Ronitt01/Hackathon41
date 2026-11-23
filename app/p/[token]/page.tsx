import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { byPosition, dayLabel } from "@/components/itinerary/days";
import { PaintedBoard } from "@/components/kafila/painted-board";
import { createAdminClient } from "@/lib/supabase/admin";

// Revocation and location must show up immediately, never from a cached render.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Trip plan · Kafila", robots: { index: false, follow: false }, referrer: "no-referrer" };

type Stop = { id: string; day: number; position: number; starts_at: string | null; title: string; location_name: string | null };

const dayMonth = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
const fmt = (d: string) => dayMonth.format(new Date(`${d}T00:00:00Z`));

function ago(iso: string): string {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return "updated just now";
  if (min < 60) return `updated ${min} min ago`;
  if (min < 48 * 60) return `updated ${Math.round(min / 60)} hr ago`;
  return `updated ${Math.round(min / 1440)} days ago`;
}

/** T-3 parent view: no login. The service role reads by token only; it never exposes money, budgets or other members. */
export default async function ParentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{64}$/.test(token)) notFound(); // tokens are 32 random bytes as hex

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return <Shell><p role="alert" className="text-destructive">The parent view isn&apos;t set up on this server yet.</p></Shell>;
  }

  const { data: link } = await admin
    .from("parent_links")
    .select("trip_id, member_id, share_location, revoked_at")
    .eq("token", token)
    .maybeSingle();
  if (!link || link.revoked_at) notFound();

  const [{ data: trip }, { data: member }, { data: loc }] = await Promise.all([
    admin.from("trips").select("name, start_date, end_date, active_plan_id").eq("id", link.trip_id).single(),
    admin.from("members").select("display_name").eq("id", link.member_id).single(),
    link.share_location
      ? admin.from("locations").select("lat, lng, updated_at").eq("member_id", link.member_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (!trip || !member) notFound();

  const { data: stopRows } = trip.active_plan_id
    ? await admin.from("stops").select("id, day, position, starts_at, title, location_name").eq("plan_id", trip.active_plan_id)
    : { data: [] as Stop[] };
  const stops = (stopRows ?? []) as Stop[];
  const days = [...new Set(stops.map((s) => s.day))].sort((a, b) => a - b);
  const when = trip.start_date
    ? trip.end_date && trip.end_date !== trip.start_date ? `${fmt(trip.start_date)} – ${fmt(trip.end_date)}` : fmt(trip.start_date)
    : undefined;

  return (
    <Shell>
      <h1 className="sr-only">{trip.name}</h1>
      <PaintedBoard note={when}>{trip.name}</PaintedBoard>
      <p className="text-[15px]">
        You&apos;re following <strong>{member.display_name}</strong>&apos;s trip. This page is read-only and {member.display_name} can turn it off any time.
      </p>

      {link.share_location && (
        <section aria-labelledby="where" className="grid gap-2 rounded-xl border bg-card p-4">
          <h2 id="where" className="text-[17px] font-bold">Where {member.display_name} is</h2>
          {loc ? (
            <>
              <a
                href={`https://www.google.com/maps?q=${loc.lat},${loc.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                referrerPolicy="no-referrer"
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-[15px] font-semibold text-primary-foreground hover:bg-primary/80"
              >
                <MapPin aria-hidden strokeWidth={1.8} className="size-5" />
                Open in Google Maps
              </a>
              <p className="text-[13px] text-muted-foreground">Last shared location, {ago(loc.updated_at)}.</p>
            </>
          ) : (
            <p className="text-muted-foreground">No location shared yet. It appears here when {member.display_name} taps &quot;Share my location now&quot;.</p>
          )}
        </section>
      )}

      <section aria-labelledby="plan" className="grid gap-3">
        <h2 id="plan" className="text-[17px] font-bold">The plan</h2>
        {days.length ? (
          days.map((day) => (
            <div key={day} className="grid gap-1">
              <h3 className="text-[15px] font-bold">{dayLabel(day, trip.start_date, true)}</h3>
              <ul className="divide-y overflow-hidden rounded-xl border bg-card">
                {stops
                  .filter((s) => s.day === day)
                  .sort(byPosition)
                  .map((s) => (
                    <li key={s.id} className="flex gap-3 px-4 py-2.5">
                      <span className="tabular w-12 shrink-0 font-semibold">{s.starts_at?.slice(0, 5) ?? ""}</span>
                      <span className="grid min-w-0">
                        <span className="font-semibold">{s.title}</span>
                        {s.location_name && <span className="text-[13px] text-muted-foreground">{s.location_name}</span>}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ))
        ) : (
          <p className="text-muted-foreground">The group hasn&apos;t made a plan yet. Check back soon.</p>
        )}
      </section>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto grid w-full max-w-md content-start gap-4 px-4 pt-6 pb-12">
      {children}
      <p className="text-center text-[12px] font-bold tracking-[0.12em] uppercase text-muted-foreground">Kafila</p>
    </main>
  );
}
