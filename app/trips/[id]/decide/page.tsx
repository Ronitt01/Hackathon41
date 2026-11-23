import { Lock } from "lucide-react";
import Link from "next/link";
import { DecideBoard } from "@/components/decide/board";
import { loadDecide } from "@/components/decide/data";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

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
      <section className="grid gap-3 rounded-xl border border-border bg-card p-4" aria-labelledby="my-prefs-title">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-wash">
            <Lock aria-hidden className="size-5" strokeWidth={1.8} />
          </span>
          <div className="grid gap-0.5">
            <h2 id="my-prefs-title" className="text-[17px] font-bold">Your budget &amp; preferences</h2>
            <p className="text-[15px] text-muted-foreground">
              {mine
                ? "Saved. Only you can see it. Update it any time."
                : "Add your max budget and what you love, so the group can see which plans fit everyone. Takes a minute."}
            </p>
          </div>
        </div>
        <Link href={`/trips/${id}/decide/me`} className={buttonVariants({ variant: mine ? "outline" : "default", className: cn("w-full", mine && "border-input bg-card") })}>
          {mine ? "Edit my budget & preferences" : "Add my budget & preferences"}
        </Link>
      </section>
      <DecideBoard tripId={id} meId={me.id} initial={data} />
    </>
  );
}
