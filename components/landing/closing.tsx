import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BTN_PRIMARY, NAV_LINK, WRAP } from "./kit";

const LINKS = [
  { href: "#how", label: "Fair plan" },
  { href: "#decide", label: "Vote" },
  { href: "#money", label: "Settle up" },
  { href: "#trip", label: "Trip Jar" },
  { href: "#privacy", label: "What stays private" },
  { href: "#faq", label: "Questions" },
];

/** The close and the footer are one screen: the tagline and the main action, then the links and one credits line. */
export function Closing() {
  return (
    <footer id="contact" aria-labelledby="close-h" className="closing relative flex min-h-svh flex-col pt-24 pb-12 lg:pt-30 lg:pb-20">
      <div className={cn(WRAP, "flex flex-1 flex-col justify-between gap-10 lg:gap-16")}>
        <div className="grid items-start gap-6 lg:grid-cols-12 lg:gap-x-6">
          <div className="lg:col-span-6">
            <h2 id="close-h" className="text-[44px] leading-[1] font-semibold tracking-[-0.02em] text-balance md:text-[64px] xl:text-[80px]">
              Plan the trip, not the drama.
            </h2>
            <p className="mt-6 max-w-[44ch] text-[18px] leading-[1.5] md:text-[20px]">
              Start a trip, drop the invite link in your group chat, and let everyone add a budget only they can see.
            </p>
            <Link href="/start" className={cn(BTN_PRIMARY, "mt-8")}>
              Start a trip
            </Link>
          </div>
          {/* Full-width grid child so the split reaches the container's right edge; the truck sits at its end. */}
          <div className="flex w-full lg:col-span-6 lg:col-start-7 lg:justify-end">
            <Image
              src="/illustrations/truck.svg"
              alt="A hand-painted Indian goods truck seen from behind, Horn OK Please on its tailboard"
              width={360}
              height={240}
              className="h-auto w-full max-w-[160px] lg:max-w-[420px]"
            />
          </div>
        </div>

        <div className="grid gap-6 border-t pt-6">
          <div className="flex flex-wrap items-center gap-x-7 gap-y-1">
            <Link href="#top" className="mr-auto inline-flex h-11 items-center text-[15px] font-bold tracking-[0.16em] uppercase">
              Kafila
            </Link>
            <nav aria-label="Footer" className="flex flex-wrap gap-x-6">
              {LINKS.map((l) => (
                <a key={l.href} href={l.href} className={NAV_LINK}>
                  {l.label}
                </a>
              ))}
              <Link href="/tour" className={NAV_LINK}>
                Take the tour
              </Link>
              <Link href="/start" className={NAV_LINK}>
                My trips
              </Link>
            </nav>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[14px] text-muted-foreground">
            <p>Kafila {new Date().getFullYear()}. Budgets stay private.</p>
            <p>
              Photographs: Wikimedia Commons contributors,{" "}
              <Link href="/credits" className="inline-block font-semibold underline decoration-1 underline-offset-4 hover:text-ink">
                credits
              </Link>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
