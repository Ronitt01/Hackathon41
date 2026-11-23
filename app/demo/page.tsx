import Link from "next/link";
import { DemoApp } from "@/components/demo-app";

// shortcut: preview of Stage 2 + 3 with sample data (no login, no DB); replace feature by feature.
export default function DemoTrip() {
  return (
    <main className="mx-auto grid w-full max-w-md gap-6 px-4 py-10">
      <header className="grid gap-1">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">← All trips</Link>
        <h1 className="text-2xl font-semibold tracking-tight">Goa with friends</h1>
      </header>
      <DemoApp />
    </main>
  );
}
