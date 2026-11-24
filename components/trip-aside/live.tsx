"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * The aside sits in the persistent trip layout, and the Decide board updates through its own fetch,
 * so nothing re-renders the aside after a vote, lock or join. Re-render the server tree on those changes.
 */
export function TripAsideLive({ tripId }: { tripId: string }) {
  const router = useRouter();

  useEffect(() => {
    // The aside only shows at lg; phones keep their own per-tab realtime. shortcut: not re-checked on resize.
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 600); // one refresh per burst of row changes
    };
    const channel = supabase
      .channel(`trip:${tripId}:aside`)
      .on("postgres_changes", { event: "*", schema: "public", table: "decisions", filter: `trip_id=eq.${tripId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "members", filter: `trip_id=eq.${tripId}` }, refresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "trips", filter: `id=eq.${tripId}` }, refresh)
      .subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [tripId, router]);

  return null;
}
