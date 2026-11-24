"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CalendarDays, ChevronLeft, Heart, House, Wallet } from "lucide-react";

// Each tab owns one paint; the band under the app bar and the active tab's indicator wear it.
const TABS = [
  { href: "", label: "Trip", icon: House, paint: "var(--truck-yellow)" },
  { href: "/plan", label: "Plan", icon: CalendarDays, paint: "var(--truck-green)" },
  { href: "/decide", label: "Decide", icon: Heart, paint: "var(--truck-red)" },
  { href: "/money", label: "Money", icon: Wallet, paint: "var(--ink)" },
];

function activeTab(pathname: string, base: string) {
  return TABS.find((t) => t.href && pathname.startsWith(base + t.href)) ?? TABS[0]; // jar, wrapped live under Trip
}

// The one paint indicator slides to the active tab (220ms ease-out); under reduced motion it just moves.
const SLIDE = "bg-paint motion-safe:transition-[translate,background-color] motion-safe:duration-[220ms] motion-safe:ease-out";

/** Sets the current tab's paint for everything inside (app bar band, indicator). */
export function TripPaint({ tripId, children }: { tripId: string; children: React.ReactNode }) {
  const tab = activeTab(usePathname(), `/trips/${tripId}`);
  return <div style={{ ["--paint" as string]: tab.paint }} className="flex min-h-full flex-1 flex-col">{children}</div>;
}

/** The tab links, shared by the phone bottom bar and the desktop rail. */
function useTabs(tripId: string) {
  const base = `/trips/${tripId}`;
  const current = activeTab(usePathname(), base);
  // Only a tab the user just switched to pops, never the one that was active on load.
  const [switchedTo, setSwitchedTo] = useState<string | null>(null);
  return { base, current, index: TABS.indexOf(current), switchedTo, setSwitchedTo };
}

export function TripTabs({ tripId }: { tripId: string }) {
  const { base, current, index, switchedTo, setSwitchedTo } = useTabs(tripId);
  return (
    <nav aria-label="Trip sections" className="fixed inset-x-0 bottom-0 z-20 border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="relative mx-auto grid h-16 max-w-md grid-cols-4">
        <span aria-hidden className={`absolute -top-px left-0 h-1 w-1/4 ${SLIDE}`} style={{ translate: `${index * 100}% 0` }} />
        {TABS.map((t) => {
          const active = t === current;
          const Icon = t.icon;
          return (
            <Link
              key={t.label}
              href={base + t.href}
              aria-current={active ? "page" : undefined}
              onClick={() => setSwitchedTo(t.label)}
              className={`press flex flex-col items-center justify-center gap-0.5 text-[13px] ${active ? "font-bold text-ink" : "text-muted-foreground"}`}
            >
              <Icon aria-hidden className={`size-[22px] ${active && switchedTo === t.label ? "pop" : ""}`} strokeWidth={active ? 2.2 : 1.8} />
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Desktop (≥1024px): the left rail with the wordmark, the trip, and the four tabs stacked. */
export function TripRail({ tripId, title, meta }: { tripId: string; title: string; meta: string }) {
  const { base, current, index, switchedTo, setSwitchedTo } = useTabs(tripId);
  return (
    <div className="sticky top-0 hidden h-dvh flex-col self-start border-r bg-card lg:flex">
      <span className="px-5 pt-6 text-[13px] font-bold tracking-[0.12em] text-muted-foreground uppercase">Kafila</span>
      <Link
        href="/start"
        className="mx-2 mt-3 inline-flex h-11 items-center gap-1 rounded-lg px-3 text-[13px] font-semibold text-muted-foreground hover:bg-muted hover:text-ink"
      >
        <ChevronLeft aria-hidden className="size-4" />
        All trips
      </Link>
      <div className="grid gap-0.5 border-b px-5 pt-2 pb-4">
        <h1 className="text-[18px] leading-tight font-bold break-words">{title}</h1>
        <p className="text-[13px] text-muted-foreground">{meta}</p>
      </div>
      <nav aria-label="Trip sections" className="relative grid py-2">
        <span aria-hidden className={`absolute top-2 left-0 h-12 w-1 ${SLIDE}`} style={{ translate: `0 ${index * 100}%` }} />
        {TABS.map((t) => {
          const active = t === current;
          const Icon = t.icon;
          return (
            <Link
              key={t.label}
              href={base + t.href}
              aria-current={active ? "page" : undefined}
              onClick={() => setSwitchedTo(t.label)}
              className={`press flex h-12 items-center gap-3 px-5 text-[15px] hover:bg-muted ${active ? "font-bold text-ink" : "text-muted-foreground"}`}
            >
              <Icon aria-hidden className={`size-5 ${active && switchedTo === t.label ? "pop" : ""}`} strokeWidth={active ? 2.2 : 1.8} />
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
