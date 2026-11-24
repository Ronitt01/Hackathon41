import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BTN_PRIMARY, NAV_LINK, PHOTOS, WRAP } from "./kit";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#decide", label: "Decide" },
  { href: "#money", label: "Money" },
  { href: "#trip", label: "Trip Jar" },
  { href: "#privacy", label: "Privacy" },
  { href: "#faq", label: "Questions" },
];

/** "author, licence, URL", where the author itself may contain commas. */
function splitCredit(credit: string) {
  const parts = credit.split(", ");
  const url = parts.pop() ?? "";
  const licence = parts.pop() ?? "";
  return { author: parts.join(", "), licence, url };
}

/** The close and the footer are one screen: the tagline and the main action, then the links and credits. */
export function Closing() {
  return (
    <footer id="contact" aria-labelledby="close-h" className="closing relative flex min-h-svh flex-col pt-24 pb-10 lg:pt-30 lg:pb-12">
      <div className={cn(WRAP, "flex flex-1 flex-col justify-between gap-16")}>
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-x-6">
          <div className="lg:col-span-8">
            <h2 id="close-h" className="text-[44px] leading-[1] font-semibold tracking-[-0.02em] text-balance md:text-[72px] xl:text-[96px]">
              Plan the trip, not the drama.
            </h2>
            <p className="mt-6 max-w-[44ch] text-[18px] leading-[1.5] md:text-[20px]">
              Start a trip, drop the invite link in your group chat, and let everyone add a budget only they can see.
            </p>
            <Link href="/start" className={cn(BTN_PRIMARY, "mt-8 h-14 px-7 text-[17px]")}>
              Start a trip
            </Link>
          </div>
          <Image
            src="/illustrations/truck.svg"
            alt="A hand-painted Indian goods truck seen from behind, Horn OK Please on its tailboard"
            width={360}
            height={240}
            className="h-auto w-full max-w-[220px] self-end lg:col-span-3 lg:col-start-10 lg:max-w-none"
          />
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
              <Link href="/start" className={NAV_LINK}>
                My trips
              </Link>
            </nav>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-4 text-[14px] text-muted-foreground">
            <p>Kafila {new Date().getFullYear()}. Budgets stay private.</p>
            <details className="max-w-[72ch]">
              <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold underline decoration-1 underline-offset-4 hover:text-ink">
                Photographs via Wikimedia Commons
              </summary>
              <ul className="mt-2 grid gap-1">
                {PHOTOS.map((p) => {
                  const c = splitCredit(p.credit);
                  return (
                    <li key={p.file}>
                      <a href={c.url} rel="noopener" className="underline underline-offset-4 hover:text-ink">
                        {c.author}
                      </a>
                      , {c.licence}
                    </li>
                  );
                })}
              </ul>
            </details>
          </div>
        </div>
      </div>
    </footer>
  );
}
