import Link from "next/link";
import { GoogleButton } from "@/components/google-button";
import { TripEntryForm } from "@/components/trip-entry-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";
import { displayNameOf } from "@/lib/supabase/user";

export default async function Home({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: trips } = user
    ? await supabase.from("trips").select("id, name").order("created_at", { ascending: false })
    : { data: [] };

  return (
    <main className="mx-auto grid w-full max-w-md gap-6 px-4 py-10">
      <header className="grid gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">Kafila</h1>
        <p className="text-muted-foreground">Plan the trip, not the drama.</p>
      </header>

      {error === "login_failed" && (
        <p role="alert" className="text-sm text-destructive">Google sign-in didn&apos;t finish. Please try again.</p>
      )}

      {!!trips?.length && (
        <Card>
          <CardHeader><CardTitle>Your trips</CardTitle></CardHeader>
          <CardContent className="grid gap-2">
            {trips.map((t) => (
              <Link key={t.id} href={`/trips/${t.id}`} className="rounded-lg border px-3 py-3 hover:bg-muted">
                {t.name}
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Start a trip</CardTitle>
          <CardDescription>Invite friends with a link. No app to install.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <TripEntryForm mode="create" defaultName={displayNameOf(user)} />
          {(!user || user.is_anonymous) && <GoogleButton next={safeNext(next)} />}
        </CardContent>
      </Card>
    </main>
  );
}
