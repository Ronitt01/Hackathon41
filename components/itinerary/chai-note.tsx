import Image from "next/image";

/** Friendly empty state for an itinerary with nothing in it yet. */
export function ChaiNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card px-3.5 py-3">
      <Image src="/illustrations/chai.svg" alt="" width={64} height={64} unoptimized className="size-16 shrink-0" />
      <p className="text-muted-foreground">{children}</p>
    </div>
  );
}
