"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { WifiOff } from "lucide-react";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/**
 * Ink strip pinned to the bottom while the browser reports no connection, so it stays visible while scrolling
 * without covering the sticky trip app bar. On trip pages it sits just above the fixed bottom tabs (h-16).
 * The live region stays mounted so screen readers hear the change.
 */
export function OfflineBanner() {
  const offline = useSyncExternalStore(subscribe, () => !navigator.onLine, () => false);
  const onTrip = usePathname().startsWith("/trips/");
  return (
    <div role="status" aria-live="polite">
      {offline && (
        <p
          className={`fixed inset-x-4 z-30 mx-auto flex max-w-md items-center gap-2 rounded-lg bg-ink px-3 py-2 text-[13px] font-semibold text-wash ${
            onTrip ? "bottom-[calc(4.5rem+env(safe-area-inset-bottom))]" : "bottom-[calc(1rem+env(safe-area-inset-bottom))]"
          }`}
        >
          <WifiOff aria-hidden className="size-4 shrink-0" />
          Offline — showing saved pages. Edits need a connection.
        </p>
      )}
    </div>
  );
}
