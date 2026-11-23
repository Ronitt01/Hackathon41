import Link from "next/link";
import { CircleAlert, Lock } from "lucide-react";
import { ReflectorBar } from "@/components/kafila/reflector-bar";
import { buttonVariants } from "@/components/ui/button";
import { inr } from "@/lib/money";

/** M-7: my share of expenses so far vs my PRIVATE budget. Both numbers come from my own RLS rows; nobody else sees this. */
export function BudgetTracker({ tripId, spent, budget }: { tripId: string; spent: number; budget: number | null }) {
  const pct = budget ? Math.round((spent / budget) * 100) : 0;
  return (
    <section aria-labelledby="my-budget-h" className="grid gap-2">
      <div>
        <h2 id="my-budget-h" className="text-[17px] leading-snug font-bold">Your budget</h2>
        <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <Lock aria-hidden strokeWidth={1.8} className="size-3.5" />
          Only you can see this.
        </p>
      </div>
      {budget === null ? (
        <div className="grid gap-2">
          <p className="text-[15px]">
            You&apos;ve spent <span className="tabular font-semibold">{inr(spent)}</span> so far. Add your private budget to see how much is left.
          </p>
          <Link href={`/trips/${tripId}/decide/me`} className={buttonVariants({ variant: "outline", className: "w-full bg-card" })}>
            Add your budget
          </Link>
        </div>
      ) : (
        <div className="grid gap-1.5">
          <ReflectorBar value={pct} label="Your spending against your budget" />
          <p className="tabular text-[15px]">
            <span className="font-semibold">{inr(spent)}</span> of {inr(budget)} · {pct}%
          </p>
          {pct >= 80 && (
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-destructive">
              <CircleAlert aria-hidden strokeWidth={1.8} className="size-4 shrink-0" />
              {spent > budget ? `You're ${inr(spent - budget)} over your budget.` : `Only ${inr(budget - spent)} left in your budget.`}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
