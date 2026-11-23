"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Member = { id: string; display_name: string; role: string; status: string };

const MEMBER_COLUMNS = "id, display_name, role, status";
const STATUS_LABEL: Record<string, string> = { confirmed: "In ✓", maybe: "Maybe", dropped: "Dropped out" };

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
    <ul className="grid gap-2" aria-label="Trip members">
      {members.map((m) => (
        <li key={m.id} className="flex items-center justify-between rounded-lg border px-3 py-3">
          <span>
            {m.display_name}
            {m.role === "organizer" && <span className="ml-2 text-xs text-muted-foreground">organizer</span>}
          </span>
          <span className="text-sm text-muted-foreground">{STATUS_LABEL[m.status] ?? m.status}</span>
        </li>
      ))}
    </ul>
  );
}
