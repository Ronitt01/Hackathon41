/** The Plan page's empty slot above the fair-plan card; the reveal stage is portalled into it. Lives here, not in the client module, so the server page gets the string. */
export const REVEAL_SLOT = "fair-reveal";

/** Most plan cards the reveal draws; the status line still says the real count. */
export const MAX_CARDS = 6;

/**
 * Which drawn cards get the "Over someone's budget" stamp, in stamp order, and which one is picked.
 * Purely visual: built from the two counts the route returns, never from who or which plan.
 */
export function revealCards(candidates: number, overBudget: number, max = MAX_CARDS) {
  const shown = Math.max(0, Math.min(candidates, max));
  const over = Math.max(0, Math.min(overBudget, candidates));
  // Scaled to the drawn cards, but at least one stamp if any failed and one survivor if any fit.
  const count = over === candidates ? shown : over === 0 ? 0 : Math.min(shown - 1, Math.max(1, Math.round((over * shown) / candidates)));
  // A fixed shuffle so stamps don't run left to right; 5 is coprime with 7, so keys are distinct for up to 7 cards.
  const order = Array.from({ length: shown }, (_, i) => i).sort((a, b) => ((a * 5 + 2) % 7) - ((b * 5 + 2) % 7));
  return { shown, stamped: order.slice(0, count), winner: count < shown ? order[count] : null };
}
