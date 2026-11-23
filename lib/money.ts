// Money is always integer paise (₹7,500 = 750000). Never floats for stored amounts.

const whole = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const exact = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });

/** 750000 → "₹7,500" ; 12550 → "₹125.50" (Indian digit grouping). */
export function inr(paise: number): string {
  return paise % 100 === 0 ? whole.format(paise / 100) : exact.format(paise / 100);
}

/** User input "1,250.5" / "₹1250" → 125050 paise; null if not a valid non-negative amount. */
export function toPaise(input: string): number | null {
  const s = input.replace(/[,₹\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [rupees, paise = ""] = s.split(".");
  const value = Number(rupees) * 100 + Number(paise.padEnd(2, "0"));
  return Number.isSafeInteger(value) ? value : null;
}

/** Split `total` paise across `weights` (≥0) so the parts sum EXACTLY to total (largest-remainder rounding). */
export function splitByWeights(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) throw new Error("splitByWeights: weights must add up to more than 0");
  const raw = weights.map((w) => (total * w) / sum);
  const parts = raw.map(Math.floor);
  let left = total - parts.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (const [, i] of order) {
    if (left <= 0) break;
    parts[i] += 1;
    left -= 1;
  }
  return parts;
}

/** Equal split: 100000 among 3 → [33334, 33333, 33333]. */
export function splitEqually(total: number, people: number): number[] {
  return splitByWeights(total, Array(people).fill(1));
}
