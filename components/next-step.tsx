import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { pickStep } from "@/lib/next-step";
import { cn } from "@/lib/utils";

/** Top of the Trip tab: one clear next step instead of a page of options. */
export async function NextStep({ tripId, meId, isOrganizer, people, planReady }: { tripId: string; meId: string; isOrganizer: boolean; people: number; planReady: boolean }) {
  const supabase = await createClient();
  const [mine, options, reactions] = await Promise.all([
    supabase.from("member_private").select("member_id").eq("member_id", meId).maybeSingle(), // RLS: only my own row
    supabase.from("options").select("id", { count: "exact", head: true }).eq("trip_id", tripId).is("vetoed_at", null),
    supabase.from("reactions").select("id", { count: "exact", head: true }).eq("trip_id", tripId).eq("member_id", meId),
  ]);
  const step = pickStep({
    tripId,
    isOrganizer,
    people,
    hasBudget: !!mine.data,
    budgetsIn: await budgetsIn(tripId),
    planReady,
    options: options.count ?? 0,
    reacted: (reactions.count ?? 0) > 0,
  });

  return (
    <section aria-labelledby="next-step" className={cn("grid gap-3 rounded-xl border-2 bg-card p-4", step.done ? "border-truck-green-ink" : "border-ink")}>
      <div className="grid gap-1">
        <h2 id="next-step" className="text-[20px] leading-tight font-bold">{step.title}</h2>
        <p className="text-[15px] text-muted-foreground">{step.text}</p>
      </div>
      {step.href && (
        <Link
          href={step.href}
          className="press inline-flex h-11 items-center justify-center gap-1 rounded-lg bg-ink px-4 font-semibold text-wash hover:bg-ink/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-truck-green"
        >
          {step.action}
          <ChevronRight aria-hidden strokeWidth={1.8} className="size-4" />
        </Link>
      )}
    </section>
  );
}

/** How many members have saved a budget: a count only, never whose or how much. Needs the service role (RLS hides others' rows). */
async function budgetsIn(tripId: string): Promise<number | null> {
  try {
    const { count } = await createAdminClient().from("member_private").select("member_id", { count: "exact", head: true }).eq("trip_id", tripId);
    return count ?? 0;
  } catch {
    return null;
  }
}
