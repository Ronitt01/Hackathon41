import { cn } from "@/lib/utils";

/**
 * The world's signature: a truck rear-board. ONE per screen, for the screen's verdict or headline
 * ("FITS EVERYONE'S BUDGET", "₹4,000 TO GO"). Everything else on the page stays a clean working UI.
 */
export function PaintedBoard({
  label,
  children,
  tone = "yellow",
  className,
}: {
  label?: string;
  children: React.ReactNode;
  tone?: "yellow" | "red";
  className?: string;
}) {
  return (
    <section
      className={cn(
        "board-stamp rounded-md p-1.5 [background:repeating-linear-gradient(45deg,var(--truck-red)_0_9px,var(--truck-green)_9px_18px)]",
        className,
      )}
    >
      <div
        className={cn(
          "rounded-[3px] px-4 pt-2.5 pb-3 text-center",
          tone === "yellow" ? "bg-truck-yellow text-ink" : "bg-truck-red text-wash",
        )}
      >
        {label && <p className="text-[13px] font-semibold">{label}</p>}
        <p
          className={cn(
            "mt-0.5 font-display text-[23px] leading-[1.1] uppercase text-balance",
            tone === "yellow" ? "[text-shadow:2px_2px_0_rgb(200_16_46/0.55)]" : "[text-shadow:2px_2px_0_rgb(26_20_16/0.45)]",
          )}
        >
          {children}
        </p>
      </div>
    </section>
  );
}
