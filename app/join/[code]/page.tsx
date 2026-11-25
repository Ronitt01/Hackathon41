import Image from "next/image";
import { redirect } from "next/navigation";
import { GoogleButton } from "@/components/google-button";
import { PaintedBoard } from "@/components/kafila/painted-board";
import { StickerStack } from "@/components/kafila/sticker-avatar";
import { TripEntryForm } from "@/components/trip-entry-form";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { displayNameOf } from "@/lib/supabase/user";

const day = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

type Invite = { tripId: string; name: string; destination: string | null; when: string | null; organizer: string | null; names: string[] };

/**
 * What the link holder is joining. A non-member can't read the trip under RLS, so the server looks it up by code
 * with the service role and returns only what the invite shows: trip name, place, dates, first names. Never budgets.
 */
async function lookUp(code: string): Promise<Invite | null | "unavailable"> {
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return "unavailable"; // no server key: fall back to the generic invite
  }
  const { data: trip } = await admin.from("trips").select("id, name, destination, start_date, end_date").eq("invite_code", code).maybeSingle();
  if (!trip) return null;
  const { data: members } = await admin.from("members").select("display_name, role").eq("trip_id", trip.id).neq("status", "dropped").order("joined_at");
  const first = (n: string) => n.trim().split(/\s+/)[0];
  const when = trip.start_date
    ? trip.end_date && trip.end_date !== trip.start_date
      ? `${day.format(new Date(trip.start_date))} – ${day.format(new Date(trip.end_date))}`
      : day.format(new Date(trip.start_date))
    : null;
  const organizer = members?.find((m) => m.role === "organizer");
  return {
    tripId: trip.id,
    name: trip.name,
    destination: trip.destination,
    when,
    organizer: organizer ? first(organizer.display_name) : null,
    names: (members ?? []).map((m) => first(m.display_name)),
  };
}

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const invite = await lookUp(code);
  if (invite === null) {
    return (
      <main className="mx-auto grid w-full max-w-md content-start gap-6 px-4 pt-8 pb-12">
        <PaintedBoard className="[&_p:first-child]:py-1 [&_p:first-child]:text-[36px]">Kafila</PaintedBoard>
        <section className="grid gap-2 rounded-xl border bg-card p-4">
          <h1 className="text-[22px] leading-tight font-bold">This invite link doesn&apos;t work</h1>
          <p className="text-muted-foreground">It may have been mistyped or cut off. Ask whoever sent it for the link again.</p>
        </section>
      </main>
    );
  }
  // Already in this trip (e.g. tapped the link twice): go straight there.
  if (user && invite !== "unavailable") {
    const { data: mine } = await supabase.from("members").select("id").eq("trip_id", invite.tripId).eq("user_id", user.id).maybeSingle();
    if (mine) redirect(`/trips/${invite.tripId}`);
  }
  const known = invite === "unavailable" ? null : invite;
  const others = known ? known.names.length - 1 : 0;

  return (
    <main className="mx-auto grid w-full max-w-md content-start gap-6 px-4 pt-8 pb-12">
      <PaintedBoard className="[&_p:first-child]:py-1 [&_p:first-child]:text-[36px]">Kafila</PaintedBoard>
      <section aria-labelledby="invited" className="grid gap-4 rounded-xl border bg-card p-4">
        <div className="flex items-center gap-3">
          <Image src="/illustrations/chai.svg" alt="" width={160} height={160} className="size-16 shrink-0 sm:size-20" />
          <div className="grid gap-1">
            <h1 id="invited" className="text-[22px] leading-tight font-bold">
              {known?.organizer ? `${known.organizer} invited you` : "You're invited"}
            </h1>
            <p className="text-muted-foreground">
              {known ? (
                <>
                  to <strong className="font-semibold text-ink">{known.name}</strong>
                  {(known.destination || known.when) && (
                    // "Goa trip · 12–15 Dec", not "Goa trip · Goa, 12–15 Dec"
                    <> · {[known.name.toLowerCase().includes(known.destination?.toLowerCase() ?? "\0") ? null : known.destination, known.when].filter(Boolean).join(", ")}</>
                  )}
                </>
              ) : (
                "Chai's on. Your friends are planning a trip and saved you a seat."
              )}
            </p>
          </div>
        </div>
        {known && known.names.length > 0 && (
          <div className="flex items-center gap-3">
            <StickerStack names={known.names} size="md" />
            <p className="text-[15px]">
              {others <= 0 ? `${known.names[0]} is in` : `${known.names[0]} and ${others} ${others === 1 ? "other" : "others"} are in`}
            </p>
          </div>
        )}
        <p className="text-[15px] text-muted-foreground">Add your name to hop in. Next you&apos;ll add a budget that only you can see.</p>
        <TripEntryForm mode="join" code={code} defaultName={displayNameOf(user)} />
        {(!user || user.is_anonymous) && <GoogleButton next={`/join/${encodeURIComponent(code)}`} />}
      </section>
    </main>
  );
}
