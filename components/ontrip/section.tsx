/** A titled block on the On-the-trip hub: Hind heading, optional helper line under it, hairline above. */
export function Section({ id, title, hint, children }: { id: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`${id}-title`} className="grid gap-3 border-t pt-4">
      <div className="grid gap-0.5">
        <h2 id={`${id}-title`} className="text-[17px] leading-snug font-bold">{title}</h2>
        {hint && <p className="text-[13px] text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}
