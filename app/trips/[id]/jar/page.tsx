import { BookingDate } from "@/components/jar/booking-date";
import { JarForm } from "@/components/jar/jar-form";
import { MyJar, type Deposit, type Jar } from "@/components/jar/my-jar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { streakWeeks, weeksLeft } from "@/lib/jar";
import { errorMessage } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

// Trip party is in India; a fixed zone keeps "this week" right on server and phone.
const istDate = (value: Date | string) => new Date(value).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

/** M-1 Trip Jar. jars / jar_deposits are owner-only under RLS, so every query here returns only my rows. */
export default async function JarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const [trip, me, readiness] = await Promise.all([
    supabase.from("trips").select("booking_date, active_plan_id").eq("id", id).single(),
    supabase.from("members").select("id, role").eq("trip_id", id).eq("user_id", auth.user?.id ?? "").maybeSingle(),
    supabase.rpc("jar_readiness", { p_trip: id }),
  ]);
  const meId: string | undefined = me.data?.id;
  const [jar, deposits, share] = meId
    ? await Promise.all([
        supabase.from("jars").select("goal_paise, weekly_paise, autopay").eq("member_id", meId).maybeSingle(),
        supabase.from("jar_deposits").select("id, amount_paise, created_at").eq("member_id", meId).order("created_at", { ascending: false }),
        trip.data?.active_plan_id
          ? supabase.from("plan_members").select("total_paise").eq("plan_id", trip.data.active_plan_id).eq("member_id", meId).maybeSingle()
          : { data: null, error: null },
      ])
    : [];
  const error = trip.error ?? me.error ?? readiness.error ?? jar?.error ?? deposits?.error ?? share?.error;
  if (error) return <p role="alert" className="text-sm text-destructive">{errorMessage(error)}</p>;
  if (!meId || !trip.data) return <p className="text-muted-foreground">Join this trip to start a Jar.</p>;

  // bigint columns can arrive as strings; money maths needs exact integers
  const myJar: Jar | null = jar?.data
    ? { goal_paise: Number(jar.data.goal_paise), weekly_paise: Number(jar.data.weekly_paise), autopay: jar.data.autopay }
    : null;
  const myDeposits: Deposit[] = (deposits?.data ?? []).map((d) => ({ ...d, amount_paise: Number(d.amount_paise) }));
  const planShare = Number(share?.data?.total_paise ?? 0) || null;
  const today = istDate(new Date());
  const bookingDate: string | null = trip.data.booking_date;
  const weeks = bookingDate ? weeksLeft(today, bookingDate) : null;
  const ready = (readiness.data as { on_track: number; total: number }[] | null)?.[0];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Group savings</CardTitle>
          <CardDescription>Only you see your amounts 🔒</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-lg"><span className="font-semibold">{ready?.on_track ?? 0} of {ready?.total ?? 0}</span> on track</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Booking day</CardTitle>
          <CardDescription>Your Jar&apos;s deadline.</CardDescription>
        </CardHeader>
        <CardContent>
          <BookingDate tripId={id} bookingDate={bookingDate} isOrganizer={me.data?.role === "organizer"} />
        </CardContent>
      </Card>

      {myJar ? (
        <MyJar
          tripId={id}
          meId={meId}
          jar={myJar}
          deposits={myDeposits}
          weeks={weeks}
          streak={streakWeeks(myDeposits.map((d) => istDate(d.created_at)), today)}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Start my Jar 🔒</CardTitle>
            <CardDescription>Save a little every week so the trip is paid for by booking day. Only you see your amounts.</CardDescription>
          </CardHeader>
          <CardContent>
            <JarForm tripId={id} meId={meId} saved={0} weeks={weeks} goal={planShare} weekly={null} />
          </CardContent>
        </Card>
      )}
    </>
  );
}
