"use client";

import { useState } from "react";
import { Check, CircleAlert, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inr } from "@/lib/money";
import type { MoneyMember } from "./data";

type Result = { oldPerHead: number; newPerHead: number; deltaPaise: number; fitsEveryone: boolean; roomsRepriced: boolean; roomsProblem?: string | null };

/** M-8 (organizer only): remove someone who can't come; shows the new cost per person and a budget re-check, never whose. */
export function RemoveMember({ tripId, meId, members, onChange }: { tripId: string; meId: string | null; members: MoneyMember[]; onChange: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ name: string } & Result>();
  const others = members.filter((m) => m.status !== "dropped" && m.id !== meId);

  async function remove(m: MoneyMember) {
    if (!confirm(`Remove ${m.display_name} from the trip? Costs and rooms get re-split for everyone else. Their pledge stays with the group.`)) return;
    setBusy(m.id);
    setError(null);
    try {
      const res = await fetch(`/api/trips/${tripId}/members/${m.id}/drop`, { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Couldn't remove them. Please try again.");
      setResult({ name: m.display_name, ...(body as Result) });
      onChange();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="dropouts-h" className="grid gap-2">
      <div>
        <h2 id="dropouts-h" className="text-[17px] leading-snug font-bold">Dropouts</h2>
        <p className="text-[13px] text-muted-foreground">If someone can&apos;t come, remove them here. Their pledge stays counted.</p>
      </div>

      {result && (
        <div role="status" className="grid gap-1 rounded-xl border bg-card p-4">
          <p className="tabular text-[20px] leading-tight font-bold">
            {result.deltaPaise > 0 ? `+${inr(result.deltaPaise)} per person` : "No change per person"}
          </p>
          <p className="tabular text-[13px] text-muted-foreground">
            {result.name} is off the trip
            {result.newPerHead > 0 && ` · shared cost ${inr(result.oldPerHead)} → ${inr(result.newPerHead)} each`}
            {result.roomsRepriced && " · rooms re-split"}
          </p>
          {result.fitsEveryone ? (
            <p className="flex items-center gap-1.5 text-[15px] font-semibold text-truck-green-ink">
              <Check aria-hidden strokeWidth={2} className="size-4 shrink-0" />
              Still fits everyone&apos;s budget
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-[15px] font-semibold text-destructive">
              <CircleAlert aria-hidden strokeWidth={1.8} className="size-4 shrink-0" />
              Now over someone&apos;s budget (we never say whose)
            </p>
          )}
          {result.roomsProblem && (
            <p role="alert" className="text-[13px] text-destructive">
              {result.roomsProblem} Use &ldquo;Split again&rdquo; under Rooms.
            </p>
          )}
        </div>
      )}

      {others.length === 0 ? (
        <p className="text-muted-foreground">Nobody else is on the trip yet.</p>
      ) : (
        <ul className="divide-y rounded-xl border bg-card px-4" aria-label="People on the trip">
          {others.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 py-1.5">
              <span className="min-w-0 truncate font-semibold">{m.display_name}</span>
              <Button variant="ghost" className="text-destructive hover:text-destructive" disabled={busy !== null} onClick={() => remove(m)} aria-label={`Remove ${m.display_name} from the trip`}>
                <UserMinus aria-hidden strokeWidth={1.8} className="size-[18px]" />
                {busy === m.id ? "Removing…" : "Remove"}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
    </section>
  );
}
