import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { DemoApp } from "@/components/demo-app";

// shortcut: preview of Stage 2 + 3 with sample data (no login, no DB); replace feature by feature.
export default function DemoTrip() {
  return (
    <main className="mx-auto grid w-full max-w-md content-start gap-4 px-4 pt-2 pb-12">
      <header className="-mx-2 flex h-16 items-center gap-2 border-b-4 border-truck-yellow">
        <Link href="/" aria-label="All trips" className="grid size-11 place-items-center rounded-full hover:bg-muted">
          <ChevronLeft aria-hidden strokeWidth={1.8} className="size-5" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-[18px] leading-tight font-bold">Goa with friends</h1>
      </header>
      <DemoApp />
    </main>
  );
}
