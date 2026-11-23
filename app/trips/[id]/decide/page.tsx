import { ChevronRight, Lock } from "lucide-react";
import Link from "next/link";
import { DecideBoard } from "@/components/decide/board";
import { loadDecide } from "@/components/decide/data";
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
    <DecideBoard tripId={id} meId={me.id} initial={data}>
      <Link
        href={`/trips/${id}/decide/me`}
        className={cn(
          "flex min-h-11 items-center gap-3 rounded-xl border bg-card px-3 py-2.5 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-truck-green",
          mine ? "border-border" : "border-2 border-ink",
        )}
      >
        <Lock aria-hidden className="size-5 shrink-0" strokeWidth={1.8} />
        <span className="grid min-w-0 flex-1">
          <span className="font-semibold">{mine ? "Your budget & preferences" : "Add your budget & preferences"}</span>
          <span className="text-[13px] text-muted-foreground">
            {mine ? "Saved. Only you can see it." : "So the group sees which plans fit everyone. Only you see it."}
          </span>
        </span>
        <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.8} />
      </Link>
    </DecideBoard>
  );
}
