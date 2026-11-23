import { createClient } from "./client";

/** Browser-side: sign in as a guest (name only) if there's no session yet. */
export async function ensureSignedIn(displayName: string) {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    const { error } = await supabase.auth.signInAnonymously({ options: { data: { display_name: displayName } } });
    if (error) throw error;
  }
  return supabase;
}

/** Browser-side: Google sign-in, returning to `next` (a same-site path) afterwards. */
export async function signInWithGoogle(next: string) {
  const { error } = await createClient().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) throw error;
}

/** Supabase errors are plain objects, not Error instances. */
export function errorMessage(err: unknown): string {
  const message = (err as { message?: unknown } | null)?.message;
  return typeof message === "string" && message ? message : "Something went wrong. Please try again.";
}
