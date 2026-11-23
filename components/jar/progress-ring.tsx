import { inr } from "@/lib/money";

const R = 52;
const C = 2 * Math.PI * R;

/** Jar progress ring; the label carries the numbers for screen readers. */
export function ProgressRing({ percent, saved, goal }: { percent: number; saved: number; goal: number }) {
  return (
    <div role="img" aria-label={`${percent}% saved: ${inr(saved)} of ${inr(goal)}`} className="relative mx-auto size-36">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={R} fill="none" strokeWidth="10" className="stroke-muted" />
        <circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - percent / 100)}
          className="stroke-primary motion-safe:transition-[stroke-dashoffset] motion-safe:duration-700"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-2xl font-semibold">{percent}%</span>
    </div>
  );
}
