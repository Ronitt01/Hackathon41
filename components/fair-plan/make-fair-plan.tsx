"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import { burst } from "@/components/kafila/confetti";
import { useToast } from "@/components/kafila/toast";
import { Button } from "@/components/ui/button";
import { success } from "@/lib/haptics";
import { createClient } from "@/lib/supabase/client";

const STEPS = ["Checking everyone's budget…", "Balancing preferences…", "Picking the fairest plan…"];
const NO_FIT = "No plan fits everyone's budget yet. Try fewer days or a cheaper stay, then make a fair plan again.";
const NO_OPTIONS = "Add a few places, food spots or stays in Decide first, then make a fair plan.";

/** A-1: the "Make a fair plan" button, pinned above the tab bar. Also refreshes this phone when anyone saves a new plan. */
export function MakeFairPlan({ tripId, again = false }: { tripId: string; again?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [step, setStep] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const landed = useRef(false); // this phone made the plan: celebrate once the refreshed board is on screen
  const busy = pending || refreshing;
  const status = pending ? STEPS[step] : refreshing ? "Loading your plan…" : notice;

  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 1800);
    return () => clearInterval(timer);
  }, [pending]);

  useEffect(() => {
    if (refreshing || !landed.current) return;
    landed.current = false;
    const r = document.getElementById("fair-board")?.getBoundingClientRect();
    const onScreen = r && r.bottom > 0 && r.top < window.innerHeight;
    burst({ origin: onScreen ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined });
    success();
    toast("Scene set hai — fits everyone", { tone: "success" });
  }, [refreshing, toast]);

  // A new plan sets trips.active_plan_id, so every phone re-renders the Plan tab.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`trip:${tripId}:fair-plan`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "trips", filter: `id=eq.${tripId}` }, () => router.refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, router]);

  async function onClick() {
    setPending(true);
    setStep(0);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch(`/api/trips/${tripId}/plan`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setError(typeof body.error === "string" ? body.error : "Something went wrong. Please try again.");
      else if (body.status === "no_fit") setNotice(NO_FIT);
      else if (body.status === "no_options") setNotice(NO_OPTIONS);
      else {
        landed.current = true;
        startTransition(() => router.refresh());
      }
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    }
    setPending(false);
  }

  return (
    <>
      {/* Keeps the last content clear of the pinned bar. */}
      <div aria-hidden className="h-12" />
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 bg-wash shadow-[0_-8px_16px_var(--wash)]">
        <div className="mx-auto grid max-w-md gap-1.5 px-4 pt-2 pb-3">
          {pending && <Road />}
          <p role="status" className="text-center text-[13px] text-muted-foreground empty:hidden">
            {/* Re-keyed so each step eases in; the live region itself stays put. */}
            {status && (
              <span key={status} className="inline-block motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                {status}
              </span>
            )}
          </p>
          {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
          <Button type="button" onClick={onClick} disabled={busy} className="h-[50px] w-full rounded-xl text-base font-bold">
            {busy && <LoaderCircle aria-hidden strokeWidth={1.8} className="size-5 motion-safe:animate-spin" />}
            {busy ? "Working on it…" : again ? "Make a new fair plan" : "Make a fair plan"}
          </Button>
        </div>
      </div>
    </>
  );
}

/** The loading moment: the truck rolls on while the road's dashes stream past. Static under reduced motion. */
function Road() {
  return (
    <div aria-hidden className="relative mx-auto h-9 w-40 overflow-hidden">
      <style href="kafila-road" precedence="default">{`
        @keyframes kafila-road { to { transform: translateX(-20px); } }
        @keyframes kafila-bob { 50% { transform: translateY(-1.5px); } }
      `}</style>
      <Image
        src="/illustrations/truck.svg"
        alt=""
        width={42}
        height={28}
        unoptimized
        className="absolute bottom-1 left-1/2 -ml-[21px] motion-safe:animate-[kafila-bob_320ms_ease-in-out_infinite]"
      />
      <span className="absolute bottom-0 left-0 h-0.5 w-[calc(100%+20px)] bg-[repeating-linear-gradient(90deg,var(--ink)_0_10px,transparent_10px_20px)] motion-safe:animate-[kafila-road_400ms_linear_infinite]" />
    </div>
  );
}
