import { cn } from "@/lib/utils";
import { initials, stickerPaint, stickerTilt } from "@/lib/sticker";

// Contrast: ink on yellow 10:1, wash on red 5.4:1, white on green-ink 5.9:1, wash on ink 16:1.
const PAINT = ["bg-truck-yellow text-ink", "bg-truck-red text-wash", "bg-truck-green-ink text-white", "bg-ink text-wash"];
const SIZE = { sm: "size-7 text-[11px]", md: "size-9 text-[13px]", lg: "size-12 text-[17px]" };
type Size = keyof typeof SIZE;

/** A friend's initials as a slightly tilted paint sticker. Same name, same paint and tilt, on every screen. */
export function StickerAvatar({ name, size = "md", className }: { name: string; size?: Size; className?: string }) {
  return (
    <span
      role="img"
      aria-label={name}
      title={name}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold leading-none ring-2 ring-ink",
        PAINT[stickerPaint(name)],
        SIZE[size],
        className,
      )}
      style={{ rotate: `${stickerTilt(name)}deg` }}
    >
      <span aria-hidden>{initials(name)}</span>
    </span>
  );
}

/** Overlapping stickers for "who's in", with a "+N" chip past `max`. The stack is one labelled image. */
export function StickerStack({
  names,
  max = 5,
  size = "md",
  className,
}: {
  names: string[];
  max?: number;
  size?: Size;
  className?: string;
}) {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  return (
    <span role="img" aria-label={names.join(", ")} className={cn("inline-flex items-center pl-2", className)}>
      {shown.map((n, i) => (
        <span key={`${n}-${i}`} aria-hidden className="-ml-2 inline-flex">
          <StickerAvatar name={n} size={size} />
        </span>
      ))}
      {extra > 0 && (
        <span
          aria-hidden
          className={cn(
            "tabular -ml-2 inline-flex shrink-0 items-center justify-center rounded-full bg-card font-bold leading-none text-ink ring-2 ring-ink",
            SIZE[size],
          )}
        >
          +{extra}
        </span>
      )}
    </span>
  );
}
