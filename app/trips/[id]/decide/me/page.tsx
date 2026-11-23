import { ArrowLeft, Lock, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { PrivateForm } from "@/components/decide/private-form";
import { PaintedBoard } from "@/components/kafila/painted-board";
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
    <>
      <Link
        href={`/trips/${id}/decide`}
        className="-ml-2 inline-flex h-11 w-fit items-center gap-1.5 rounded-lg px-2 text-[15px] font-semibold hover:bg-muted"
      >
        <ArrowLeft aria-hidden className="size-[18px]" strokeWidth={1.8} />
        Back to Decide
      </Link>
      <h1 className="-mt-2 text-xl font-bold">Your budget &amp; preferences</h1>
      <PaintedBoard>Only you see this</PaintedBoard>
      <p className="flex items-start gap-2.5 text-[15px] font-semibold">
        <Lock aria-hidden className="mt-0.5 size-5 shrink-0 text-truck-green-ink" strokeWidth={1.8} />
        Only you will ever see this number. The group only sees whether a plan fits everyone.
      </p>
      {(count ?? 0) < 3 && (
        <p className="flex items-start gap-2.5 rounded-xl border border-border bg-card px-3.5 py-3 text-[15px]">
          <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0" strokeWidth={1.8} />
          <span>Heads up: with fewer than 3 people in the trip, others could guess your budget from &quot;fits / doesn&apos;t fit&quot;.</span>
        </p>
      )}
      <PrivateForm
        tripId={id}
        memberId={me.id}
        budgetPaise={(mine?.budget_paise as number | null) ?? null}
        prefs={(mine?.prefs as Prefs | null) ?? {}}
      />
    </>
  );
}
