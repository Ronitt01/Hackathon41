"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { shortDate } from "@/components/money/data";
import { progress, suggestedWeekly } from "@/lib/jar";
import { inr, toPaise } from "@/lib/money";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/supabase/auth";
import { JarForm } from "./jar-form";
import { ProgressRing } from "./progress-ring";

export type Jar = { goal_paise: number; weekly_paise: number; autopay: boolean };
export type Deposit = { id: string; amount_paise: number; created_at: string };

type Props = { tripId: string; meId: string; jar: Jar; deposits: Deposit[]; weeks: number | null; streak: number };

/** My Jar: progress, plan, AutoPay (mocked), add money, history. Only the owner ever loads this data. */
export function MyJar({ tripId, meId, jar, deposits, weeks, streak }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autopayError, setAutopayError] = useState<string | null>(null);

  const saved = deposits.reduce((sum, d) => sum + d.amount_paise, 0);
  const left = Math.max(0, jar.goal_paise - saved);
  const percent = progress(saved, jar.goal_paise);

  /** Runs one write, then reloads; returns the error text (or null). */
  async function run(work: () => PromiseLike<{ error: unknown }>) {
    setPending(true);
    const { error } = await work();
    setPending(false);
    if (error) return errorMessage(error);
    router.refresh();
    return null;
  }

  async function addMoney(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const paise = toPaise(amount);
    if (!paise) return setError("Enter an amount, like 500.");
    const failed = await run(() => createClient().from("jar_deposits").insert({ member_id: meId, trip_id: tripId, amount_paise: paise }));
    setError(failed);
    if (!failed) setAmount("");
  }

  async function toggleAutopay(on: boolean) {
    setAutopayError(await run(() => createClient().from("jars").update({ autopay: on }).eq("member_id", meId)));
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>My Jar 🔒</CardTitle>
          <CardDescription>Only you can see this.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <ProgressRing percent={percent} saved={saved} goal={jar.goal_paise} />
          <p className="text-center">
            <span className="text-lg font-semibold">{inr(saved)}</span>
            <span className="text-muted-foreground"> of {inr(jar.goal_paise)}</span>
          </p>
          {left === 0 ? (
            <p className="rounded-lg bg-emerald-50 p-3 text-center font-medium text-emerald-800 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 dark:bg-emerald-950 dark:text-emerald-200">
              🎉 Goal reached! You&apos;re ready for booking day.
            </p>
          ) : (
            <p className="text-center text-muted-foreground">{inr(left)} to go</p>
          )}

          {editing ? (
            <JarForm tripId={tripId} meId={meId} saved={saved} weeks={weeks} goal={jar.goal_paise} weekly={jar.weekly_paise} onDone={() => setEditing(false)} />
          ) : (
            <>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <dt className="text-muted-foreground">Your plan</dt>
                <dd>{inr(jar.weekly_paise)}/week</dd>
                {weeks !== null && left > 0 && (
                  <>
                    <dt className="text-muted-foreground">Suggested now</dt>
                    <dd>{inr(suggestedWeekly(jar.goal_paise, saved, weeks))}/week</dd>
                    <dt className="text-muted-foreground">Weeks left</dt>
                    <dd>{weeks}</dd>
                  </>
                )}
                <dt className="text-muted-foreground">Streak</dt>
                <dd>{streak === 0 ? "Add money this week to start one" : `${streak} ${streak === 1 ? "week" : "weeks"} 🔥`}</dd>
              </dl>
              <Button variant="outline" className="h-11" onClick={() => setEditing(true)}>Edit goal or weekly amount</Button>
            </>
          )}

          <label className="flex min-h-11 items-center gap-3 rounded-lg border px-3">
            <input
              type="checkbox"
              checked={jar.autopay}
              disabled={pending}
              onChange={(e) => toggleAutopay(e.target.checked)}
              className="size-4"
            />
            <span>AutoPay (demo — no real money moves)</span>
          </label>
          {autopayError && <p role="alert" className="text-sm text-destructive">{autopayError}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add money</CardTitle>
          <CardDescription>Log what you put aside for the trip.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={addMoney} className="grid gap-2">
            <Label htmlFor="jar-amount">Amount (₹)</Label>
            <div className="flex gap-2">
              <Input id="jar-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(jar.weekly_paise / 100)} className="h-11" />
              <Button type="submit" className="h-11" disabled={pending}>{pending ? "Adding…" : "Add"}</Button>
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          {deposits.length === 0 ? (
            <p className="text-muted-foreground">No money added yet. Your first deposit starts the streak.</p>
          ) : (
            <ul className="grid gap-2" aria-label="Deposits">
              {deposits.map((d) => (
                <li key={d.id} className="flex justify-between rounded-lg border px-3 py-3">
                  <span className="text-muted-foreground">{shortDate(d.created_at)}</span>
                  <span className="font-medium">{inr(d.amount_paise)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
