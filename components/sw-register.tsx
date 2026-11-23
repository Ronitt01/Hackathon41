"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LAST_USER = "kafila-sw-user";
const enabled = () => process.env.NODE_ENV === "production" && typeof navigator !== "undefined" && "serviceWorker" in navigator;

/** Saved pages hold one person's trips, budget and mood; drop them all so the next person on this phone never sees them. */
function clearSavedPages() {
  return caches
    .keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith("kafila-pages-")).map((k) => caches.delete(k))))
    .catch(() => {});
}

/** Registers the offline service worker in production builds only (in dev it would serve stale code) and keeps its saved pages tied to the signed-in user. */
export function SwRegister() {
  const pathname = usePathname();

  useEffect(() => {
    if (!enabled()) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // No service worker means no offline copy; the app still works online.
    });

    const { data } = createClient().auth.onAuthStateChange((event, session) => {
      let last: string | null = null;
      try {
        last = localStorage.getItem(LAST_USER);
      } catch {}
      const id = session?.user.id ?? null;
      // A null session without SIGNED_OUT (e.g. a refresh that failed offline) keeps the copies: that is the offline case.
      // An unknown previous user (first run, or after sign-out) counts as different.
      if (event === "SIGNED_OUT" || (id && id !== last)) void clearSavedPages();
      try {
        if (event === "SIGNED_OUT") localStorage.removeItem(LAST_USER);
        else if (id) localStorage.setItem(LAST_USER, id);
      } catch {}
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // In-app moves don't hit the worker as navigations, so ask it to save this page now.
  useEffect(() => {
    if (enabled()) navigator.serviceWorker.controller?.postMessage({ type: "cache-page", url: pathname });
  }, [pathname]);

  return null;
}
