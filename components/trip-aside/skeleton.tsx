import { cn } from "@/lib/utils";

// Skeleton pieces for the trip loading.tsx files: border-tone blocks (muted vanished on the page wash) shaped like the real screen.
// A gentle opacity pulse only when motion is allowed; under reduced motion they sit still.

export function Bone({ className }: { className?: string }) {
  return <div aria-hidden className={cn("rounded bg-border motion-safe:animate-pulse", className)} />;
}

/** The screen's painted board. */
export const BoardBone = () => <Bone className="h-[76px] rounded-md" />;

/** A section title with its 13px helper line under it. */
export function HeadingBone({ hint = true }: { hint?: boolean }) {
  return (
    <div className="grid gap-1.5">
      <Bone className="h-[18px] w-32" />
      {hint && <Bone className="h-3 w-56 max-w-full" />}
    </div>
  );
}

/** A hairline-divided list of 44px rows. */
export function RowsBone({ rows = 3, avatars }: { rows?: number; avatars?: boolean }) {
  return (
    <div className="divide-y overflow-hidden rounded-xl border bg-card">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex min-h-13 items-center gap-3 px-4 py-3">
          {avatars && <Bone className="size-9 shrink-0 rounded-full" />}
          <Bone className="h-3.5 flex-1" />
          <Bone className="h-3.5 w-14" />
        </div>
      ))}
    </div>
  );
}

/** A white surface holding a form or a few lines. */
export function CardBone({ fields = 2 }: { fields?: number }) {
  return (
    <div className="grid gap-4 rounded-xl border bg-card p-4">
      <HeadingBone />
      {Array.from({ length: fields }, (_, i) => (
        <Bone key={i} className="h-11 rounded-lg" />
      ))}
    </div>
  );
}

/** Wraps a screen's skeleton: one status announcement, a 16px rhythm like the real column. */
export function ScreenBone({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div role="status" className={cn("grid content-start gap-4", className)}>
      <span className="sr-only">Loading…</span>
      {children}
    </div>
  );
}
