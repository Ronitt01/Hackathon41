import Link from "next/link";
import { cn } from "@/lib/utils";
import { BTN_PRIMARY, NAV_LINK, WRAP } from "./kit";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#decide", label: "Decide" },
  { href: "#money", label: "Money" },
  { href: "#privacy", label: "Privacy" },
  { href: "#faq", label: "Questions" },
];

/** One fixed, opaque bar on the page's edges: the quiet wordmark, section links, My trips, the main action. */
export function SiteHeader() {
  return (
    <header className="nav fixed inset-x-0 top-0 z-30 border-b bg-wash">
      <div className={`${WRAP} flex h-16 items-center gap-6 lg:h-[72px]`}>
        <Link href="#top" className="inline-flex h-11 items-center text-[15px] font-bold tracking-[0.16em] text-ink uppercase">
          Kafila
        </Link>
        <nav aria-label="Sections" className="hidden flex-1 items-center justify-center gap-7 xl:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className={NAV_LINK}>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-4 xl:ml-0">
          <Link href="/start" className={NAV_LINK}>
            My trips
          </Link>
          <Link href="/start" className={cn(BTN_PRIMARY, "h-11 px-4 text-[15px]")}>
            Start a trip
          </Link>
        </div>
      </div>
    </header>
  );
}
