/** One-shot entrance for an element that just arrived (a new chat message, a fresh photo). Visible at rest; skipped under reduced motion. */
export function enter(el: Element, from: string) {
  if (typeof el.animate !== "function" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  el.animate([{ transform: from, opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 320, easing: "cubic-bezier(0.16, 1, 0.3, 1)" });
}
