import { GoogleButton } from "@/components/google-button";
import { TripEntryForm } from "@/components/trip-entry-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { displayNameOf } from "@/lib/supabase/user";

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="mx-auto grid w-full max-w-md gap-6 px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>You&apos;re invited 🎒</CardTitle>
          <CardDescription>Your friends are planning a trip on Kafila. Add your name to join.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <TripEntryForm mode="join" code={code} defaultName={displayNameOf(user)} />
          {(!user || user.is_anonymous) && <GoogleButton next={`/join/${encodeURIComponent(code)}`} />}
        </CardContent>
      </Card>
    </main>
  );
}
