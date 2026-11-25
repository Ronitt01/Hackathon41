// When Kafila makes the fair plan by itself. Pure, no I/O, so the rules are easy to read and test.

export type AutoPlanState = {
  /** A fair plan exists (the active plan came from the plan route, not the empty starter plan). */
  fair: boolean;
  people: number; // active members
  budgets: number; // active members with a budget saved
  planBy: string | null; // ISO deadline, or null (none set / migration not run)
  /** A budget was added or changed after the current fair plan was made. */
  lateBudget: boolean;
  /** Someone other than an organizer has already confirmed with a pledge. */
  pledged: boolean;
  now: number;
};

/**
 * "make": make (or re-make) the fair plan now.
 * "ask_organizer": a budget changed after people pledged, so the plan must not change under them; the organizer decides.
 * "wait": nothing to do.
 */
export function autoPlanDecision(s: AutoPlanState): "make" | "ask_organizer" | "wait" {
  if (!s.fair) {
    if (s.budgets < 2) return "wait"; // a "fair" plan for one person is just their own plan
    const allIn = s.budgets >= s.people;
    const due = s.planBy != null && Date.parse(s.planBy) <= s.now;
    return allIn || due ? "make" : "wait";
  }
  if (!s.lateBudget) return "wait";
  return s.pledged ? "ask_organizer" : "make";
}

/** How long an automatic attempt holds the trip, so a plan that can't be made isn't retried on every page view. */
export const AUTO_PLAN_RETRY_MS = 30 * 60_000;
