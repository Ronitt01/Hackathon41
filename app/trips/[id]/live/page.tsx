import { PaintedBoard } from "@/components/kafila/painted-board";
import { Chat, type ChatMessage } from "@/components/ontrip/chat";
import { Documents, type TripDoc } from "@/components/ontrip/documents";
import { MoodPulse } from "@/components/ontrip/mood-pulse";
import { PhotoPool, type TripPhoto } from "@/components/ontrip/photo-pool";
import { Replan } from "@/components/ontrip/replan";
import { Section } from "@/components/ontrip/section";
import { Sos } from "@/components/ontrip/sos";
import { moodVerdict, type MoodSummary } from "@/lib/mood";
import { istNow } from "@/lib/replan";
import { errorMessage } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

const HOUR = 3600;

/** "On the trip" hub: mood (T-2), re-plan (T-1), SOS (T-5), chat (T-7), photos (T-4), documents (T-8). */
export default async function LivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { today } = istNow();
  const [trip, me, members, summary, messages, photos, docs, contacts] = await Promise.all([
    supabase.from("trips").select("start_date, end_date, destination").eq("id", id).single(),
    supabase.from("members").select("id").eq("trip_id", id).eq("user_id", auth.user?.id ?? "").maybeSingle(),
    supabase.from("members").select("id, display_name").eq("trip_id", id),
    supabase.rpc("mood_summary", { p_trip: id, p_day: today }),
    supabase.from("messages").select("id, member_id, body, created_at").eq("trip_id", id).order("created_at", { ascending: false }).limit(100),
    supabase.from("photos").select("id, member_id, storage_path, taken_at, created_at").eq("trip_id", id).order("taken_at", { ascending: true, nullsFirst: false }),
    supabase.from("documents").select("id, member_id, title, storage_path, for_day, created_at").eq("trip_id", id).order("for_day", { ascending: true, nullsFirst: false }),
    supabase.from("emergency_contacts").select("id, name, phone").order("name"),
  ]);
  const error = trip.error ?? me.error ?? members.error ?? summary.error ?? messages.error ?? photos.error ?? docs.error ?? contacts.error;
  if (error) return <p role="alert" className="text-[13px] text-destructive">{errorMessage(error)}</p>;
  const meId: string | undefined = me.data?.id;
  if (!meId || !trip.data) return <p className="text-muted-foreground">Join this trip to use the on-trip tools.</p>;
  const photoRows = photos.data ?? [], docRows = docs.data ?? [];

  // Private rows: RLS returns only mine.
  const [checkin, signals, photoUrls, docUrls] = await Promise.all([
    supabase.from("mood_checkins").select("energy").eq("member_id", meId).eq("day", today).maybeSingle(),
    supabase.from("signals").select("kind").eq("member_id", meId).gte("created_at", `${today}T00:00:00+05:30`),
    photoRows.length ? supabase.storage.from("photos").createSignedUrls(photoRows.map((p) => p.storage_path), HOUR) : { data: [] },
    docRows.length ? supabase.storage.from("documents").createSignedUrls(docRows.map((d) => d.storage_path), HOUR) : { data: [] },
  ]);
  const names = Object.fromEntries((members.data ?? []).map((m) => [m.id, m.display_name as string]));
  const urlOf = (list: { path: string | null; signedUrl: string | null }[] | null, path: string) => list?.find((u) => u.path === path)?.signedUrl ?? null;
  const mood = (summary.data as MoodSummary[] | null)?.[0] ?? null;
  const verdict = moodVerdict(mood);

  const tripPhotos: TripPhoto[] = photoRows.flatMap((p) => {
    const url = urlOf(photoUrls.data, p.storage_path);
    return url ? [{ id: p.id, mine: p.member_id === meId, by: names[p.member_id] ?? "Someone", url, storagePath: p.storage_path, at: p.taken_at ?? p.created_at }] : [];
  });
  const tripDocs: TripDoc[] = docRows.map((d) => ({
    id: d.id, mine: d.member_id === meId, by: names[d.member_id] ?? "Someone", title: d.title, forDay: d.for_day, storagePath: d.storage_path, url: urlOf(docUrls.data, d.storage_path),
  }));

  return (
    <>
      <PaintedBoard note={verdict.note}>{verdict.board}</PaintedBoard>

      <Section id="mood" title="How's your energy today?" hint="One tap a day. The group only ever sees the average and counts.">
        <MoodPulse tripId={id} meId={meId} today={today} energy={checkin.data?.energy ?? null} sent={(signals.data ?? []).map((s) => s.kind)} summary={mood} />
      </Section>

      <Section id="replan" title="Re-plan the rest of today" hint="Tell us what changed and get a revised plan to accept or skip.">
        <Replan tripId={id} />
      </Section>

      <Section id="sos" title="Safety" hint="SOS sends your location to your emergency contacts and the group chat.">
        <Sos tripId={id} meId={meId} contacts={contacts.data ?? []} />
      </Section>

      <Section id="chat" title="Group chat">
        <Chat tripId={id} meId={meId} names={names} initial={(messages.data as ChatMessage[]).reverse()} />
      </Section>

      <Section id="photos" title="Photo pool" hint="Everyone's photos in one place, sorted by trip day.">
        <PhotoPool tripId={id} meId={meId} start={trip.data.start_date} end={trip.data.end_date} photos={tripPhotos} />
      </Section>

      <Section id="docs" title="Tickets and bookings" hint="PDFs and photos of tickets, open for everyone in the trip.">
        <Documents tripId={id} meId={meId} start={trip.data.start_date} end={trip.data.end_date} docs={tripDocs} />
      </Section>
    </>
  );
}
