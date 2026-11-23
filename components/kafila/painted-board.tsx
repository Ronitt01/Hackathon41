import { cn } from "@/lib/utils";

/**
 * The world's signature: a truck rear-board. ONE per screen, for the screen's verdict or headline
 * ("FITS EVERYONE'S BUDGET", "₹4,000 TO GO"). Everything else on the page stays a clean working UI.
 * The lettering speaks first; `note` is an optional plain line UNDER it (never a label above it).
 */
export function PaintedBoard({
  children,
  note,
  tone = "yellow",
  className,
}: {
  children: React.ReactNode;
  note?: string;
  tone?: "yellow" | "red";
  className?: string;
}) {
  return (
    <section className={cn("board-stamp chevron-band rounded-md p-2.5", className)}>
      <div
        className={cn(
          "rounded-[3px] border-2 border-ink px-4 pt-3 pb-3 text-center",
          tone === "yellow" ? "bg-truck-yellow text-ink" : "bg-truck-red text-wash",
        )}
      >
        <p
          className={cn(
            "font-display text-[23px] leading-[1.1] uppercase text-balance",
            tone === "yellow" ? "[text-shadow:2px_2px_0_rgb(200_16_46/0.55)]" : "[text-shadow:2px_2px_0_rgb(26_20_16/0.45)]",
          )}
        >
          {children}
        </p>
        {note && <p className="mt-1 text-[13px] font-semibold">{note}</p>}
      </div>
    </section>
  );
}
