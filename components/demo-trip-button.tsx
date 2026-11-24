"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { tap } from "@/lib/haptics";
import { ensureSignedIn, errorMessage } from "@/lib/supabase/auth";
import { cn } from "@/lib/utils";

/** "Try the demo trip": guest sign-in if needed → seed a sample Goa trip → open its Plan tab with the reveal. */
export function DemoTripButton({ className, label = "Try the demo trip" }: { className?: string; label?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    tap();
    setPending(true);
    setError(null);
    try {
      await ensureSignedIn("Guest");
      const res = await fetch("/api/demo", { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { tripId?: string; error?: string };
      if (!res.ok || !body.tripId) throw new Error(body.error ?? "Couldn't open the demo trip. Please try again.");
      router.push(`/trips/${body.tripId}/plan?reveal=1`);
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
    }
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Button type="button" onClick={onClick} disabled={pending} aria-busy={pending} className="h-11 w-full">
        {pending ? "Packing the bags…" : label}
      </Button>
      {error && <p role="alert" className="text-[15px] text-destructive">{error}</p>}
    </div>
  );
}
