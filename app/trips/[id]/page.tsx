import Link from "next/link";
import { notFound } from "next/navigation";
import { InviteButton } from "@/components/invite-button";
import { MemberList, type Member } from "@/components/member-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // RLS returns nothing unless the viewer is a member, so "not found" also covers "not yours".
  const { data: trip } = await supabase.from("trips").select("id, name, invite_code").eq("id", id).maybeSingle();
  if (!trip) notFound();
  const { data: members } = await supabase
    .from("members")
    .select("id, display_name, role, status")
    .eq("trip_id", id)
    .order("joined_at");

  return (
    <main className="mx-auto grid w-full max-w-md gap-6 px-4 py-10">
      <header className="grid gap-1">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">← All trips</Link>
        <h1 className="text-2xl font-semibold tracking-tight">{trip.name}</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Who&apos;s in</CardTitle>
          <CardDescription>Share the link in your group chat. Up to 12 people.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <MemberList tripId={trip.id} initial={(members ?? []) as Member[]} />
          <InviteButton code={trip.invite_code} tripName={trip.name} />
        </CardContent>
      </Card>
    </main>
  );
}
