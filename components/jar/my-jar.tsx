"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CircleCheck, Flame, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { burst } from "@/components/kafila/confetti";
import { PaintedBoard } from "@/components/kafila/painted-board";
import { ReflectorBar } from "@/components/kafila/reflector-bar";
import { useToast } from "@/components/kafila/toast";
import { success, tap } from "@/lib/haptics";
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
const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";

/** One-off Web Animation (transform / clip-path only); skipped entirely under reduced motion. */
function play(el: Element | null | undefined, frames: Keyframe[], opts: KeyframeAnimationOptions) {
  if (el && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) el.animate(frames, opts);
}

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

  const toast = useToast();
  const tape = useRef<HTMLDivElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  const coin = useRef<HTMLSpanElement>(null);
  const flame = useRef<HTMLSpanElement>(null);
  const before = useRef({ percent, left });

  // After a deposit lands (router.refresh), the tape grows on from where it was, and reaching the goal is the big moment.
  useEffect(() => {
    const prev = before.current;
    before.current = { percent, left };
    if (percent > prev.percent) {
      // Overshoot is clipped by the fill's own edge, so this reads as a springy snap without any wobble.
      const from = 100 - (prev.percent / percent) * 100;
      play(tape.current?.querySelector(".tape-fill"), [{ clipPath: `inset(0 ${from}% 0 0)` }, { clipPath: "inset(0 0 0 0)" }], {
        duration: 650,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      });
    }
    if (prev.left > 0 && left === 0) {
      // The board fires its own burst as it flips to "Goal reached"; this second one from the tape makes it the big one.
      const r = tape.current?.getBoundingClientRect();
      burst({ count: 80, origin: r ? { x: r.left + r.width / 2, y: r.top } : undefined });
      success();
      toast("Goal reached! You're going.", { tone: "success" });
    }
  }, [percent, left, toast]);

  // The streak flame flickers a few times when it appears, then rests.
  useEffect(() => {
    play(
      flame.current,
      [
        { transform: "scale(1) rotate(0deg)" },
        { transform: "scale(1.08, 0.94) rotate(-5deg)", offset: 0.3 },
        { transform: "scale(0.96, 1.06) rotate(4deg)", offset: 0.65 },
        { transform: "scale(1) rotate(0deg)" },
      ],
      { duration: 1100, iterations: 3, easing: "ease-in-out" },
    );
  }, [streak]);

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
    // A coin drops into the Add button (falling, so it accelerates), and the button dips as it lands.
    tap();
    play(coin.current, [
      { transform: "translateY(-26px) rotate(-30deg)", opacity: 0 },
      { transform: "translateY(-18px) rotate(-10deg)", opacity: 1, offset: 0.3 },
      { transform: "translateY(8px) rotate(0deg)", opacity: 0 },
    ], { duration: 380, easing: "cubic-bezier(0.55, 0, 1, 0.45)" });
    play(slot.current, [{ transform: "none" }, { transform: "translateY(2px) scale(0.97)" }, { transform: "none" }], { duration: 220, delay: 300, easing: EASE_OUT });
    const failed = await run(() => createClient().from("jar_deposits").insert({ member_id: meId, trip_id: tripId, amount_paise: paise }));
    setError(failed);
    if (!failed) {
      setAmount("");
      toast("Added to your Jar.", { tone: "success" });
    }
  }

  async function toggleAutopay(on: boolean) {
    tap();
    setAutopayError(await run(() => createClient().from("jars").update({ autopay: on }).eq("member_id", meId)));
  }

  return (
    <>
      {/* Private screen: only the owner ever sees this celebration. Once per session on revisits. */}
      <PaintedBoard celebrate={left === 0 ? `jar-goal-${tripId}` : undefined}>{left === 0 ? "Goal reached" : `${inr(left)} to go`}</PaintedBoard>

      <section aria-label="My savings" className="grid gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="tabular">
            <span className="text-[28px] leading-none font-bold">{inr(saved)}</span>
            <span className="text-muted-foreground"> of {inr(jar.goal_paise)}</span>
          </p>
          <span className="text-[15px] font-semibold tabular">{percent}%</span>
        </div>
        <div ref={tape}>
          <ReflectorBar value={percent} label={`${percent}% saved: ${inr(saved)} of ${inr(jar.goal_paise)}`} />
        </div>
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
                    <span ref={flame} className="inline-flex origin-bottom">
                      <Flame aria-hidden strokeWidth={1.8} className="size-4 text-truck-red" />
                    </span>
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
            <div ref={slot} className="relative shrink-0">
              <Button type="submit" className="press h-11 px-5" disabled={pending}>{pending ? "Adding…" : "Add"}</Button>
              <span ref={coin} aria-hidden className="pointer-events-none absolute top-0 left-1/2 -ml-2 size-4 rounded-full border-2 border-ink bg-truck-yellow opacity-0" />
            </div>
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
