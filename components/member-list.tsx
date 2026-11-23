"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type Member = { id: string; display_name: string; role: string; status: string };

const MEMBER_COLUMNS = "id, display_name, role, status";
const STATUS_LABEL: Record<string, string> = { confirmed: "In", maybe: "Maybe", dropped: "Dropped out" };
// Avatar paints rotate by position; green uses the darker text green so white initials stay ≥4.5:1.
const AVATAR = ["bg-truck-yellow text-ink", "bg-truck-red text-white", "bg-truck-green-ink text-white", "bg-ink text-wash"];

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";

/** Members of a trip, kept live with Supabase Realtime (someone joins → appears on every phone). */
export function MemberList({ tripId, initial }: { tripId: string; initial: Member[] }) {
  const [members, setMembers] = useState(initial);

  useEffect(() => {
    const supabase = createClient();
    const refresh = async () => {
      const { data } = await supabase.from("members").select(MEMBER_COLUMNS).eq("trip_id", tripId).order("joined_at");
      if (data) setMembers(data);
    };
    const channel = supabase
      .channel(`trip:${tripId}:members`)
      .on("postgres_changes", { event: "*", schema: "public", table: "members", filter: `trip_id=eq.${tripId}` }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card" aria-label="Trip members">
      {members.map((m, i) => (
        <li key={m.id} className="flex min-h-14 items-center gap-3 px-4 py-2.5">
          <span
            aria-hidden
            className={`grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-bold ${AVATAR[i % AVATAR.length]}`}
          >
            {initials(m.display_name)}
          </span>
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate font-semibold">{m.display_name}</span>
            {m.role === "organizer" && (
              <span className="rounded-full border border-ink bg-card px-2.5 text-[13px] leading-5 font-semibold">Organizer</span>
            )}
          </span>
          {m.status === "confirmed" ? (
            <span className="flex items-center gap-1 text-[13px] font-semibold text-truck-green-ink">
              <Check aria-hidden strokeWidth={2.2} className="size-4" />
              {STATUS_LABEL.confirmed}
            </span>
          ) : (
            <span className="text-[13px] text-muted-foreground">{STATUS_LABEL[m.status] ?? m.status}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
