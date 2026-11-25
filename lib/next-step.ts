// The Trip tab's "next step": one thing to do, picked from where the trip is. Pure, no I/O.

export type Step = { title: string; text: string; href?: string; action?: string; done?: boolean };

/** The one thing this person should do next, picked from where the trip is. Pure so the order is easy to read and test. */
export function pickStep(s: {
  tripId: string;
  isOrganizer: boolean;
  people: number;
  hasBudget: boolean;
  budgetsIn: number | null; // null when the server key is missing
  planReady: boolean;
  options: number;
  reacted: boolean;
}): Step {
  const base = `/trips/${s.tripId}`;
  const budgets = s.budgetsIn == null ? "" : `${s.budgetsIn} of ${s.people} budgets in.`;
  if (!s.hasBudget)
    return { title: "Add your budget", text: "Takes 30 seconds. Only you will ever see the number.", href: `${base}/decide/me`, action: "Add my budget" };
  if (s.planReady) return { title: "The fair plan is ready", text: "See what fits you and your share.", href: `${base}/plan`, action: "See the plan", done: true };
  if (s.isOrganizer && s.people <= 1) return { title: "Bring your friends in", text: "Share the invite link in your group chat. They join with just a name." };
  if (s.isOrganizer && (s.budgetsIn ?? 0) >= 2)
    return {
      title: "Make the fair plan",
      text: `${budgets} ${s.budgetsIn === s.people ? "Everyone's ready." : "Go now, or wait for the rest."}`,
      href: `${base}/plan`,
      action: "Make the fair plan",
    };
  if (s.options > 0 && !s.reacted)
    return { title: `React to ${s.options} ${s.options === 1 ? "idea" : "ideas"}`, text: "Swipe right on what you like. Takes a minute.", href: `${base}/decide?vote=1`, action: "Start swiping" };
  return {
    title: "Waiting on the group",
    text: `${budgets} ${s.isOrganizer ? "Make the fair plan once at least 2 are in." : "The organizer makes the fair plan once budgets are in."}`.trim(),
    done: true,
  };
}
