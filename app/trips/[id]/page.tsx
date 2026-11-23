import { InviteButton } from "@/components/invite-button";
import { MemberList, type Member } from "@/components/member-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: trip }, { data: members }] = await Promise.all([
    supabase.from("trips").select("id, name, invite_code").eq("id", id).single(),
    supabase.from("members").select("id, display_name, role, status").eq("trip_id", id).order("joined_at"),
  ]);
  if (!trip) return null; // layout already 404s for non-members

  return (
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
  );
}
