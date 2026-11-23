import Link from "next/link";
import { DecideBoard } from "@/components/decide/board";
import { loadDecide } from "@/components/decide/data";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function DecidePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("members").select("id").eq("trip_id", id).eq("user_id", user?.id ?? "").maybeSingle();
  if (!me) return null; // layout already 404s for non-members
  const [data, { data: mine }] = await Promise.all([
    loadDecide(supabase, id),
    supabase.from("member_private").select("member_id").eq("member_id", me.id).maybeSingle(),
  ]);

  return (
    <>
      <Card className={mine ? undefined : "ring-2 ring-primary"}>
        <CardHeader>
          <CardTitle>Your budget &amp; preferences 🔒</CardTitle>
          <CardDescription>
            {mine
              ? "Saved. Only you can see it. Update it any time."
              : "Add your max budget and what you love, so the group can see which plans fit everyone. Takes a minute."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href={`/trips/${id}/decide/me`} className={buttonVariants({ variant: mine ? "outline" : "default", className: "h-11 w-full" })}>
            {mine ? "Edit my budget & preferences" : "Add my budget & preferences"}
          </Link>
        </CardContent>
      </Card>
      <DecideBoard tripId={id} meId={me.id} initial={data} />
    </>
  );
}
