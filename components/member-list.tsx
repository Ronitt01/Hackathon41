"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { PledgeEditor } from "@/components/crew/pledge-editor";
import { burst } from "@/components/kafila/confetti";
import { StickerAvatar } from "@/components/kafila/sticker-avatar";
import { useToast } from "@/components/kafila/toast";
import { Button } from "@/components/ui/button";
import { success } from "@/lib/haptics";
import { inr } from "@/lib/money";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/supabase/auth";

export type Member = { id: string; display_name: string; role: string; status: string; task_role: string | null };

const MEMBER_COLUMNS = "id, display_name, role, status, task_role";
const STATUS_LABEL: Record<string, string> = { confirmed: "In", maybe: "Maybe", dropped: "Dropped out" };

/**
 * Members of a trip, kept live with Supabase Realtime (someone joins → appears on every phone).
 * M-2: a "Maybe" member confirms themself with a pledge (demo payment); the organiser sets the amount.
 */
export function MemberList({
  tripId,
  initial,
  meId,
  isOrganizer = false,
  pledgePaise,
  planReady = true,
}: {
  tripId: string;
  initial: Member[];
  meId?: string | null;
  isOrganizer?: boolean;
  pledgePaise?: number;
  /** Before the fair plan, nobody is asked to pledge: there is nothing to commit to yet, so no In/Maybe either. */
  planReady?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [members, setMembers] = useState(initial);
  const [pledge, setPledge] = useState(pledgePaise ?? 0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const refresh = async () => {
      const { data } = await supabase.from("members").select(MEMBER_COLUMNS).eq("trip_id", tripId).order("joined_at");
      if (data) setMembers(data);
      router.refresh(); // the server-rendered board and app bar count members
    };
    const channel = supabase
      .channel(`trip:${tripId}:members`)
      .on("postgres_changes", { event: "*", schema: "public", table: "members", filter: `trip_id=eq.${tripId}` }, refresh)
      // The organiser can change the pledge while others look at the list.
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "trips", filter: `id=eq.${tripId}` }, (p) =>
        setPledge(Number((p.new as { pledge_paise?: number | string }).pledge_paise ?? 0)),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, router]);

  const me = members.find((m) => m.id === meId);

  async function confirm(e: React.MouseEvent<HTMLButtonElement>) {
    const r = e.currentTarget.getBoundingClientRect(); // read now: the button goes away once I'm in
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("confirm_pledge", { p_trip: tripId });
    if (!error) {
      // Only on my phone, and never with the amount: the toast says I'm in, not what I paid.
      success();
      burst({ origin: { x: r.left + r.width / 2, y: r.top + r.height / 2 } });
      toast("You're in. Pack your bags!", { tone: "success" });
      const { data } = await supabase.from("members").select(MEMBER_COLUMNS).eq("trip_id", tripId).order("joined_at");
      if (data) setMembers(data);
      router.refresh();
    }
    setPending(false);
    if (error) setError(errorMessage(error));
  }

  return (
    <div className="grid gap-3">
      <ul className="divide-y overflow-hidden rounded-xl border bg-card" aria-label="Trip members">
        {members.map((m) => (
          <li key={m.id} className="flex min-h-14 items-center gap-3 px-4 py-2.5">
            {/* The name is right beside it, so the sticker stays out of the accessibility tree. */}
            <span aria-hidden className="inline-flex">
              <StickerAvatar name={m.display_name} />
            </span>
            <span className="grid min-w-0 flex-1">
              <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <span className="truncate font-semibold">
                  {m.display_name}
                  {m.id === meId && <span className="font-normal text-muted-foreground"> (you)</span>}
                </span>
                {m.role === "organizer" && (
                  <span className="rounded-full border border-ink bg-card px-2.5 text-[13px] leading-5 font-semibold">Organizer</span>
                )}
              </span>
              {m.task_role && <span className="truncate text-[13px] text-muted-foreground">{m.task_role}</span>}
            </span>
            {!planReady ? null : m.status === "confirmed" ? (
              <span className="flex items-center gap-1 rounded-full bg-truck-green-ink px-2.5 text-[13px] leading-6 font-semibold text-white">
                <Check aria-hidden strokeWidth={2.4} className="size-3.5" />
                {STATUS_LABEL.confirmed}
              </span>
            ) : (
              <span className="rounded-full border px-2.5 text-[13px] leading-6 text-muted-foreground">{STATUS_LABEL[m.status] ?? m.status}</span>
            )}
          </li>
        ))}
      </ul>

      {planReady && me?.status === "maybe" && (
        <div className="grid gap-1">
          <Button type="button" onClick={confirm} disabled={pending} className="h-11 w-full">
            {pending ? "Confirming…" : pledge > 0 ? `Confirm with ${inr(pledge)} pledge` : "Confirm I'm in"}
          </Button>
          {pledge > 0 && (
            <p className="text-center text-[13px] text-muted-foreground">Demo payment. Your pledge counts toward your share.</p>
          )}
        </div>
      )}
      {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
      {planReady && isOrganizer && <PledgeEditor tripId={tripId} pledgePaise={pledge} onSaved={setPledge} />}
    </div>
  );
}
