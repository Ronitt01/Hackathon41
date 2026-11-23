"use client";

import Link from "next/link";
import { useState } from "react";
import { CircleCheck, Clock, CloudRain, Sparkles, Zap } from "lucide-react";
import { ReflectorBar } from "@/components/kafila/reflector-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ReplanStop, Trigger } from "@/lib/replan";

const TRIGGERS: { id: Trigger; label: string; Icon: typeof CloudRain }[] = [
  { id: "rain", label: "Rain", Icon: CloudRain },
  { id: "tired", label: "We're tired", Icon: Zap },
  { id: "delay", label: "Running late", Icon: Clock },
];

type Proposal = { day: number; rain: number | null; source: "ai" | "rules"; note: string; replaceIds: string[]; current: ReplanStop[]; proposal: ReplanStop[] };

function StopList({ title, stops }: { title: string; stops: ReplanStop[] }) {
  return (
    <div className="min-w-0">
      <h3 className="pb-1 text-[15px] font-bold">{title}</h3>
      <ol className="divide-y border-t">
        {stops.map((s, i) => (
          <li key={i} className="py-2 leading-snug">
            <span className="block text-[13px] font-semibold tabular text-muted-foreground">{s.startsAt ?? "Any time"}{s.branch && ` · Group ${s.branch}`}</span>
            <span className="block font-semibold break-words">{s.title}</span>
            {s.locationName && <span className="block text-[13px] break-words text-muted-foreground">{s.locationName}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** T-1: pick what changed → server proposes a revised rest of today → accept (replaces those stops) or keep the plan. */
export function Replan({ tripId }: { tripId: string }) {
  const [trigger, setTrigger] = useState<Trigger | null>(null);
  const [minutes, setMinutes] = useState("30");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<React.ReactNode>(null);
  const [result, setResult] = useState<Proposal | null>(null);

  async function call(method: "POST" | "PUT", body: unknown) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/trips/${tripId}/replan`, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      return null;
    } finally {
      setPending(false);
    }
  }

  async function propose() {
    if (!trigger) return setError("Pick what changed first.");
    setInfo(null);
    const data = await call("POST", { trigger, minutes: Number(minutes) });
    if (!data) return;
    if (data.status === "no_plan") return setInfo(<>There&apos;s no plan yet. <Link href={`/trips/${tripId}/plan`} className="font-semibold underline underline-offset-2">Make one on the Plan tab</Link> first.</>);
    if (data.status === "empty") return setInfo(`Nothing left on Day ${data.day} to re-plan.`);
    setResult(data);
  }

  async function accept() {
    if (!result) return;
    const data = await call("PUT", { replaceIds: result.replaceIds, stops: result.proposal });
    if (!data) return;
    setResult(null);
    setInfo(
      <span className="flex items-center gap-1.5 font-semibold text-truck-green-ink">
        <CircleCheck aria-hidden strokeWidth={1.8} className="size-5 shrink-0" />
        Plan updated. Everyone sees it on the Plan tab.
      </span>,
    );
  }

  if (result) {
    return (
      <div className="grid gap-3">
        <p className="flex items-start gap-1.5">
          {result.source === "ai" && <Sparkles aria-hidden strokeWidth={1.8} className="mt-0.5 size-4 shrink-0" />}
          {result.note}
        </p>
        {result.rain !== null && (
          <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
            <span className="text-[13px] text-muted-foreground">Rain chance for the rest of today</span>
            <span className="text-[13px] font-semibold tabular">{result.rain}%</span>
            <div className="col-span-2">
              <ReflectorBar value={result.rain} label={`Rain chance for the rest of today: ${result.rain}%`} />
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <StopList title={`Day ${result.day} now`} stops={result.current} />
          <StopList title="New plan" stops={result.proposal} />
        </div>
        {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
        <div className="grid grid-cols-2 gap-2">
          <Button className="h-11" disabled={pending} onClick={accept}>{pending ? "Saving…" : "Accept"}</Button>
          <Button variant="outline" className="h-11 bg-card" disabled={pending} onClick={() => setResult(null)}>Keep the plan</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div role="group" aria-label="What changed?" className="flex flex-wrap gap-2">
        {TRIGGERS.map(({ id, label, Icon }) => {
          const on = trigger === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              onClick={() => setTrigger(id)}
              className={`inline-flex h-11 items-center gap-1.5 rounded-full border px-3.5 text-[15px] font-semibold ${
                on ? "border-truck-green-ink bg-truck-green-ink text-white" : "border-input bg-card hover:bg-muted"
              }`}
            >
              <Icon aria-hidden strokeWidth={1.8} className="size-4" />
              {label}
            </button>
          );
        })}
      </div>
      {trigger === "delay" && (
        <div className="grid gap-1.5">
          <Label htmlFor="replan-minutes">How late? (minutes)</Label>
          <Input id="replan-minutes" type="number" inputMode="numeric" min={5} max={600} step={5} value={minutes} onChange={(e) => setMinutes(e.target.value)} className="h-11 w-32 bg-card tabular" />
        </div>
      )}
      <Button className="h-11" disabled={pending || !trigger} onClick={propose}>{pending ? "Re-planning…" : "Re-plan the rest of today"}</Button>
      {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
      <p aria-live="polite" className="empty:hidden">{info}</p>
    </div>
  );
}
