"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CircleCheck, Flame, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaintedBoard } from "@/components/kafila/painted-board";
import { ReflectorBar } from "@/components/kafila/reflector-bar";
import { shortDate } from "@/components/money/data";
import { progress, suggestedWeekly } from "@/lib/jar";
import { inr, toPaise } from "@/lib/money";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/supabase/auth";
import { JarForm } from "./jar-form";

export type Jar = { goal_paise: number; weekly_paise: number; autopay: boolean };
export type Deposit = { id: string; amount_paise: number; created_at: string };

type Props = {
  tripId: string;
  meId: string;
  jar: Jar;
  deposits: Deposit[];
  weeks: number | null;
  streak: number;
  children?: React.ReactNode; // group + booking sections, placed above the history
};

const stat = "flex items-baseline justify-between gap-4 py-2.5";

/** My Jar: progress, plan, AutoPay (mocked), add money, history. Only the owner ever loads this data. */
export function MyJar({ tripId, meId, jar, deposits, weeks, streak, children }: Props) {
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
      <PaintedBoard label="My Jar">{left === 0 ? "Goal reached" : `${inr(left)} to go`}</PaintedBoard>

      <section aria-label="My savings" className="grid gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="tabular">
            <span className="text-[28px] leading-none font-bold">{inr(saved)}</span>
            <span className="text-muted-foreground"> of {inr(jar.goal_paise)}</span>
          </p>
          <span className="text-[15px] font-semibold tabular">{percent}%</span>
        </div>
        <ReflectorBar value={percent} label={`${percent}% saved: ${inr(saved)} of ${inr(jar.goal_paise)}`} />
        {left === 0 ? (
          <p className="flex items-center gap-1.5 font-semibold text-truck-green-ink">
            <CircleCheck aria-hidden strokeWidth={1.8} className="size-5" />
            You&apos;re ready for booking day.
          </p>
        ) : null}
        <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <Lock aria-hidden strokeWidth={1.8} className="size-4" />
          Only you can see this.
        </p>
      </section>

      {editing ? (
        <section aria-label="Edit my Jar" className="rounded-xl border bg-card p-4">
          <JarForm tripId={tripId} meId={meId} saved={saved} weeks={weeks} goal={jar.goal_paise} weekly={jar.weekly_paise} onDone={() => setEditing(false)} />
        </section>
      ) : (
        <section aria-label="My plan" className="grid gap-3">
          <dl className="divide-y border-y">
            <div className={stat}>
              <dt className="text-muted-foreground">Your plan</dt>
              <dd className="font-semibold tabular">{inr(jar.weekly_paise)}/week</dd>
            </div>
            {weeks !== null && left > 0 && (
              <>
                <div className={stat}>
                  <dt className="text-muted-foreground">Suggested now</dt>
                  <dd className="font-semibold tabular">{inr(suggestedWeekly(jar.goal_paise, saved, weeks))}/week</dd>
                </div>
                <div className={stat}>
                  <dt className="text-muted-foreground">Weeks left</dt>
                  <dd className="font-semibold tabular">{weeks}</dd>
                </div>
              </>
            )}
            <div className={stat}>
              <dt className="text-muted-foreground">Streak</dt>
              <dd className="text-right">
                {streak === 0 ? (
                  <span className="text-muted-foreground">Add money this week to start one</span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-semibold tabular">
                    {streak} {streak === 1 ? "week" : "weeks"}
                    <Flame aria-hidden strokeWidth={1.8} className="size-4 text-truck-red" />
                  </span>
                )}
              </dd>
            </div>
          </dl>
          <Button variant="outline" className="h-11 bg-card" onClick={() => setEditing(true)}>Edit goal or weekly amount</Button>
        </section>
      )}

      <section aria-labelledby="add-money" className="grid gap-3 rounded-xl border bg-card p-4">
        <div>
          <h2 id="add-money" className="text-[17px] leading-snug font-bold">Add money</h2>
          <p className="text-[13px] text-muted-foreground">Log what you put aside for the trip.</p>
        </div>
        <form onSubmit={addMoney} className="grid gap-2">
          <Label htmlFor="jar-amount">Amount (₹)</Label>
          <div className="flex gap-2">
            <Input id="jar-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(jar.weekly_paise / 100)} className="h-11 tabular" />
            <Button type="submit" className="h-11 px-5" disabled={pending}>{pending ? "Adding…" : "Add"}</Button>
          </div>
          {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
        </form>
      </section>

      <div className="grid gap-1">
        <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 py-1">
          <span>
            <span className="block font-semibold">AutoPay</span>
            <span className="block text-[13px] text-muted-foreground">Demo — no real money moves</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={jar.autopay}
            disabled={pending}
            onChange={(e) => toggleAutopay(e.target.checked)}
            className="relative h-7 w-12 shrink-0 cursor-pointer appearance-none rounded-full border border-ink bg-track transition-colors before:absolute before:top-[2px] before:left-[2px] before:size-[22px] before:rounded-full before:border before:border-ink before:bg-white before:transition-transform checked:bg-truck-green checked:before:translate-x-5 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </label>
        {autopayError && <p role="alert" className="text-[13px] text-destructive">{autopayError}</p>}
      </div>

      {children}

      <section aria-labelledby="jar-history" className="grid gap-1">
        <h2 id="jar-history" className="text-[17px] leading-snug font-bold">History</h2>
        {deposits.length === 0 ? (
          <p className="text-muted-foreground">No money added yet. Your first deposit starts the streak.</p>
        ) : (
          <ul className="divide-y border-t" aria-label="Deposits">
            {deposits.map((d) => (
              <li key={d.id} className="flex justify-between py-3">
                <span className="text-muted-foreground">{shortDate(d.created_at)}</span>
                <span className="font-semibold tabular">{inr(d.amount_paise)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
