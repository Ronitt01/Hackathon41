import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { loadAutoPlan } from "@/lib/auto-plan";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { pickStep } from "@/lib/next-step";
import { cn } from "@/lib/utils";

const planDay = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

/** Top of the Trip tab: one clear next step instead of a page of options. */
export async function NextStep({ tripId, meId, isOrganizer, people, planReady }: { tripId: string; meId: string; isOrganizer: boolean; people: number; planReady: boolean }) {
  const supabase = await createClient();
  const [mine, options, reactions] = await Promise.all([
    supabase.from("member_private").select("member_id").eq("member_id", meId).maybeSingle(), // RLS: only my own row
    supabase.from("options").select("id", { count: "exact", head: true }).eq("trip_id", tripId).is("vetoed_at", null),
    supabase.from("reactions").select("id", { count: "exact", head: true }).eq("trip_id", tripId).eq("member_id", meId),
  ]);
  const auto = await loadAutoPlan(tripId); // null before migration 0003 or without the server key
  const planBy = auto?.state.planBy;
  const step = pickStep({
    tripId,
    isOrganizer,
    people,
    hasBudget: !!mine.data,
    budgetsIn: auto ? auto.state.budgets : await budgetsIn(tripId),
    planReady,
    options: options.count ?? 0,
    reacted: (reactions.count ?? 0) > 0,
    planByLabel: auto && planBy && Date.parse(planBy) > auto.state.now ? planDay.format(new Date(planBy)) : null, // past deadlines aren't promised
    askReplan: auto?.decision === "ask_organizer",
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
