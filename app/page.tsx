import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Closing } from "@/components/landing/closing";
import { DecideSection, MoneySection, TripSection } from "@/components/landing/features";
import { SiteHeader } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { FairPlanMoment } from "@/components/landing/moment";
import { FaqSection, PrivacySection, WrappedSection } from "@/components/landing/more";

export const metadata: Metadata = {
  other: { "page-type": "software", "site-kind": "software" },
};

/** The landing page for everyone. The sign-up home (create a trip, your trips) lives at /start. */
export default async function Landing({ searchParams }: PageProps<"/">) {
  // Old links and the auth callback's failure redirect still land here with ?next= or ?error=: send them on to /start.
  const sp = await searchParams;
  const keep = new URLSearchParams();
  for (const key of ["next", "error"] as const) {
    const v = sp[key];
    if (typeof v === "string") keep.set(key, v);
  }
  if (keep.size) redirect(`/start?${keep}`);

  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="outline-none">
        <Hero />
        <FairPlanMoment />
        <DecideSection />
        <MoneySection />
        <TripSection />
        <PrivacySection />
        <WrappedSection />
        <FaqSection />
      </main>
      <Closing />
    </>
  );
}
