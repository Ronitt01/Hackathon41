"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Coffee, Lock, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { averageLine, signalLines, type MoodSummary } from "@/lib/mood";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/supabase/auth";

const LEVELS = ["Wiped", "Low", "Okay", "Good", "Great"];
const SIGNALS = [
  { kind: "need_break", label: "I need a break", Icon: Coffee },
  { kind: "low_cash", label: "Low on cash", Icon: Wallet },
] as const;

type Props = { tripId: string; meId: string; today: string; energy: number | null; sent: string[]; summary: MoodSummary | null };

/** T-2: my daily energy (1–5) and anonymous signals; the group sees only mood_summary() aggregates. */
export function MoodPulse({ tripId, meId, today, energy, sent, summary }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lines = signalLines(summary);

  async function run(work: () => PromiseLike<{ error: unknown }>) {
    setPending(true);
    const { error } = await work();
    setPending(false);
    setError(error ? errorMessage(error) : null);
    if (!error) router.refresh();
  }

  const checkIn = (value: number) =>
    run(() => createClient().from("mood_checkins").upsert({ member_id: meId, trip_id: tripId, day: today, energy: value }, { onConflict: "member_id,day" }));
  const signal = (kind: string) => run(() => createClient().from("signals").insert({ member_id: meId, trip_id: tripId, kind }));

  return (
    <div className="grid gap-4">
      <fieldset className="grid gap-2">
        <legend className="sr-only">Your energy today, 1 to 5</legend>
        <div className="grid grid-cols-5 gap-1.5">
          {LEVELS.map((word, i) => {
            const value = i + 1;
            const on = energy === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={on}
                disabled={pending}
                onClick={() => checkIn(value)}
                className={`grid min-h-14 place-items-center rounded-xl border py-1.5 leading-tight disabled:opacity-60 ${
                  on ? "border-truck-green-ink bg-truck-green-ink text-white" : "border-input bg-card hover:bg-muted"
                }`}
              >
                <span className="text-[18px] font-bold tabular">{value}</span>
                <span className="text-[13px] font-semibold">{word}</span>
              </button>
            );
          })}
        </div>
        <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <Lock aria-hidden strokeWidth={1.8} className="size-4" />
          {energy ? "Saved for today. You can change it any time." : "Only you see your answer."}
        </p>
      </fieldset>

      <div className="grid grid-cols-2 gap-2">
        {SIGNALS.map(({ kind, label, Icon }) => {
          const done = sent.includes(kind);
          return (
            <Button key={kind} variant="outline" className="h-auto min-h-11 bg-card py-2 whitespace-normal" disabled={pending || done} onClick={() => signal(kind)}>
              {done ? <Check aria-hidden strokeWidth={2} className="text-truck-green-ink" /> : <Icon aria-hidden strokeWidth={1.8} />}
              {done ? `${label}: sent` : label}
            </Button>
          );
        })}
      </div>
      <p className="-mt-2 text-[13px] text-muted-foreground">Signals are anonymous. The group sees a count, never who.</p>
      {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}

      <div className="grid gap-1 rounded-xl border bg-card px-4 py-3" aria-live="polite">
        <p className="font-semibold">{averageLine(summary)}</p>
        {lines.length ? lines.map((l) => <p key={l}>{l}</p>) : <p className="text-[13px] text-muted-foreground">No signals today.</p>}
      </div>
    </div>
  );
}
