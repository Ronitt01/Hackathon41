import "server-only";
import { createClient } from "@supabase/supabase-js";

export const MISSING_SECRET_KEY = "Server key not set: add SUPABASE_SECRET_KEY to .env.local";

/** Service-role client: bypasses RLS. Use only in server routes, AFTER the caller's membership check. */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error(MISSING_SECRET_KEY);
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
