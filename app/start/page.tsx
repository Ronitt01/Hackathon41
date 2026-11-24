import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { GoogleButton } from "@/components/google-button";
import { PaintedBoard } from "@/components/kafila/painted-board";
import { TripEntryForm } from "@/components/trip-entry-form";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";
import { displayNameOf } from "@/lib/supabase/user";

export const metadata: Metadata = { title: "Start a trip" };

/** The sign-up home: start a trip, sign in with Google, and the trips you're in. "/" is the landing page. */
export default async function Start({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: trips } = user
    ? await supabase.from("trips").select("id, name").order("created_at", { ascending: false })
    : { data: [] };

  return (
    <main id="main" tabIndex={-1} className="mx-auto grid w-full max-w-md content-start gap-6 px-4 pt-6 pb-12 outline-none">
      <header className="grid gap-3">
        {/* The truck pulls up into frame once; under reduced motion it is simply parked. */}
        <Link href="/" aria-label="About Kafila" className="mx-auto block w-full max-w-[280px] rounded-lg">
          <Image
            src="/illustrations/truck.svg"
            alt="A hand-painted Indian goods truck seen from behind, Horn OK Please on its tailboard"
            width={360}
            height={240}
            priority
            className="h-auto w-full transition-[translate,opacity] duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-safe:starting:-translate-x-10 motion-safe:starting:opacity-0"
          />
        </Link>
        <PaintedBoard className="[&_p:first-child]:py-1 [&_p:first-child]:text-[36px]">Kafila</PaintedBoard>
        <div className="grid gap-1">
          <h1 className="text-[22px] leading-tight font-bold text-balance">Plan the trip, not the drama.</h1>
          <p className="text-muted-foreground">Budgets stay private. The plan is fair to everyone.</p>
        </div>
      </header>

      {error === "login_failed" && (
        <p role="alert" className="text-[15px] text-destructive">Google sign-in didn&apos;t finish. Please try again.</p>
      )}

      <section aria-labelledby="start-trip" className="grid gap-4 rounded-xl border bg-card p-4">
        <div className="grid gap-0.5">
          <h2 id="start-trip" className="text-[17px] font-bold">Start a trip</h2>
          <p className="text-[13px] text-muted-foreground">Invite friends with a link. No app to install.</p>
        </div>
        <TripEntryForm mode="create" defaultName={displayNameOf(user)} />
        {(!user || user.is_anonymous) && <GoogleButton next={safeNext(next, "/start")} />}
      </section>

      {!!trips?.length && (
        <section aria-labelledby="your-trips" className="grid gap-2">
          <h2 id="your-trips" className="text-[17px] font-bold">Your trips</h2>
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {trips.map((t) => (
              <li key={t.id}>
                <Link href={`/trips/${t.id}`} className="press flex min-h-13 items-center gap-3 px-4 py-3 font-semibold hover:bg-muted">
                  <span className="min-w-0 flex-1 truncate">{t.name}</span>
                  <ChevronRight aria-hidden strokeWidth={1.8} className="size-5 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
