// M-6: UPI intent links (upi://pay?…) open any UPI app with payee and amount filled in.

/** e.g. "aarav.k@okicici" */
export function isValidVpa(vpa: string): boolean {
  return /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9]{2,64}$/.test(vpa);
}

export function upiLink({ vpa, name, amountPaise, note }: { vpa: string; name: string; amountPaise: number; note: string }): string {
  if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) throw new Error("upiLink: amount must be positive integer paise");
  const am = `${Math.floor(amountPaise / 100)}.${String(amountPaise % 100).padStart(2, "0")}`; // integer maths, no float rounding
  const params: [string, string][] = [["pa", vpa], ["pn", name], ["am", am], ["cu", "INR"], ["tn", note]];
  return `upi://pay?${params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")}`;
}
