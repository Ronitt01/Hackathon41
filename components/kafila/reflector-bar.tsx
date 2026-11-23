/**
 * Reflector tape on one fixed-length track: the world's only way to draw a share of something
 * (satisfaction, savings, budget used). Length is the only encoding; the number sits beside it as text.
 * `index` staggers the fill animation in lists.
 */
export function ReflectorBar({ value, index = 0, label }: { value: number; index?: number; label: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className="h-3.5 overflow-hidden rounded-[2px] border border-ink bg-track"
    >
      <div
        className="tape-fill h-full [background:repeating-linear-gradient(90deg,var(--truck-red)_0_10px,#fff_10px_20px)]"
        style={{ width: `${pct}%`, ["--i" as string]: index }}
      />
    </div>
  );
}
