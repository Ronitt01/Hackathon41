/** Tiny haptic ticks for phones. No-ops where vibration is unsupported (iOS Safari) or motion is reduced. */
function buzz(pattern: number | number[]) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Some browsers throw when vibration is blocked (no user gesture yet); a missing tick is fine.
  }
}

/** A light tick for a press: like, rose, claim, toggle. */
export const tap = () => buzz(8);

/** A two-beat "done" for a real moment: plan landed, all square, goal reached. */
export const success = () => buzz([12, 60, 18]);
