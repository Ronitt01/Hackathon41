"use client";

import { useEffect, useRef, useState } from "react";
import { Lightbulb } from "lucide-react";
import { useToast } from "@/components/kafila/toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SURFACE, toggleClass } from "./option-card";

/**
 * Kafila's own suggestions. With `auto`, fills the board once when the trip has no suggestions yet (the server
 * checks again); "Suggest more ideas" adds a few more any time. Adding options by hand stays open alongside it.
 */
export function SuggestOptions({
  tripId,
  destination,
  auto,
  onAdded,
  onPendingChange,
}: {
  tripId: string;
  destination: string | null;
  auto: boolean;
  onAdded: () => void;
  onPendingChange?: (pending: boolean) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const started = useRef(false);

  async function suggest(isAuto: boolean) {
    setPending(true);
    onPendingChange?.(true);
    setError(null);
    try {
      const res = await fetch(`/api/trips/${tripId}/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auto: isAuto }),
      });
      const body = (await res.json().catch(() => null)) as { added?: number; error?: string } | null;
      if (!res.ok) setError(body?.error ?? "Couldn't find ideas right now. Add your own, or try again.");
      else if (body?.added) {
        onAdded();
        toast(`Kafila added ${body.added} ${body.added === 1 ? "idea" : "ideas"}. Add your own any time.`, { tone: "success" });
      }
    } catch {
      setError("Couldn't find ideas right now. Add your own, or try again.");
    }
    setPending(false);
    onPendingChange?.(false);
  }

  useEffect(() => {
    if (!auto || started.current) return;
    started.current = true;
    suggest(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount, only when the board has no suggestions yet
  }, [auto]);

  const what = destination ? `stays, food and things to do in ${destination}` : "places your group might like";
  return (
    <>
      <Button variant="outline" className={cn(toggleClass(false), "rounded-lg")} disabled={pending} onClick={() => suggest(false)}>
        <Lightbulb aria-hidden className="size-[18px]" strokeWidth={1.8} />
        {pending ? "Finding ideas…" : "Suggest more ideas"}
      </Button>
      <p role="status" className={cn(pending ? SURFACE : "sr-only", pending && "col-span-full grid gap-2 p-4")}>
        {pending && (
          <>
            <span className="text-[15px] font-semibold">Kafila is finding {what}…</span>
            <span className="text-[13px] text-muted-foreground">Prices are estimates. Add your own options any time.</span>
          </>
        )}
      </p>
      {error && <p role="alert" className="col-span-full text-[15px] text-destructive">{error}</p>}
    </>
  );
}
