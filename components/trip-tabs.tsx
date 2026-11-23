"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Heart, House, Wallet } from "lucide-react";

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

/** Sets the current tab's paint for everything inside (app bar band, indicator). */
export function TripPaint({ tripId, children }: { tripId: string; children: React.ReactNode }) {
  const tab = activeTab(usePathname(), `/trips/${tripId}`);
  return <div style={{ ["--paint" as string]: tab.paint }} className="flex min-h-full flex-1 flex-col">{children}</div>;
}

export function TripTabs({ tripId }: { tripId: string }) {
  const pathname = usePathname();
  const base = `/trips/${tripId}`;
  const current = activeTab(pathname, base);
  return (
    <nav aria-label="Trip sections" className="fixed inset-x-0 bottom-0 z-20 border-t bg-card pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid h-16 max-w-md grid-cols-4">
        {TABS.map((t) => {
          const active = t === current;
          const Icon = t.icon;
          return (
            <Link
              key={t.label}
              href={base + t.href}
              aria-current={active ? "page" : undefined}
              className={`-mt-px flex flex-col items-center justify-center gap-0.5 border-t-4 text-[13px] ${
                active ? "border-paint font-bold text-ink" : "border-transparent text-muted-foreground"
              }`}
            >
              <Icon aria-hidden className="size-[22px]" strokeWidth={active ? 2.2 : 1.8} />
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
