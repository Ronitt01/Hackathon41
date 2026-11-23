import type { User } from "@supabase/supabase-js";

/** Best name to prefill: Google's full name, else the name a guest typed. */
export function displayNameOf(user: User | null): string {
  const meta = user?.user_metadata ?? {};
  return String(meta.full_name ?? meta.name ?? meta.display_name ?? "");
}
