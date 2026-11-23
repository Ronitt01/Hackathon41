"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "", label: "Trip" },
  { href: "/plan", label: "Plan" },
  { href: "/decide", label: "Decide" },
  { href: "/money", label: "Money" },
];

export function TripTabs({ tripId }: { tripId: string }) {
  const pathname = usePathname();
  const base = `/trips/${tripId}`;
  return (
    <nav aria-label="Trip sections" className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-1">
      {TABS.map((t) => {
        const href = base + t.href;
        const active = t.href ? pathname.startsWith(href) : pathname === base;
        return (
          <Link
            key={t.label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex h-11 items-center justify-center rounded-md text-sm font-medium ${active ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
