import Link from "next/link";
import { PrivateForm } from "@/components/decide/private-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { Prefs } from "@/lib/tags";

/** D-3: your private budget and preferences. Only you can read this row (owner-only RLS). */
export default async function MyPrefsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: me }, { count }] = await Promise.all([
    supabase.from("members").select("id").eq("trip_id", id).eq("user_id", user?.id ?? "").maybeSingle(),
    supabase.from("members").select("id", { count: "exact", head: true }).eq("trip_id", id).neq("status", "dropped"),
  ]);
  if (!me) return null; // layout already 404s for non-members
  const { data: mine } = await supabase
    .from("member_private")
    .select("budget_paise, prefs")
    .eq("member_id", me.id)
    .maybeSingle();

  return (
    <Card>
      <CardHeader>
        <Link href={`/trips/${id}/decide`} className="text-sm text-muted-foreground hover:underline">← Back to Decide</Link>
        <CardTitle>Your budget &amp; preferences 🔒</CardTitle>
        <CardDescription>Only you will ever see this number. The group only sees whether a plan fits everyone.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {(count ?? 0) < 3 && (
          <p className="rounded-lg bg-muted px-3 py-2 text-sm">
            Heads up: with fewer than 3 people in the trip, others could guess your budget from &quot;fits / doesn&apos;t fit&quot;.
          </p>
        )}
        <PrivateForm
          tripId={id}
          memberId={me.id}
          budgetPaise={(mine?.budget_paise as number | null) ?? null}
          prefs={(mine?.prefs as Prefs | null) ?? {}}
        />
      </CardContent>
    </Card>
  );
}
