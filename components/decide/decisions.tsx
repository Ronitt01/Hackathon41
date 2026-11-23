"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Clock, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { countdown, leaders, rankOptions } from "@/lib/decisions";
import { errorMessage } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { DecideData, Decision } from "./data";
import { FIELD, SURFACE } from "./option-card";

const DECISION_KINDS: Record<string, string> = {
  destination: "Destination", stay: "Stay", activity: "Activity", food: "Food", transport: "Transport", dates: "Dates", other: "Other",
};

// Clock for countdowns, ticking every 30 s. 0 on the server, so the first render matches and nothing auto-locks there.
const TICK = 30_000;
const subscribe = (cb: () => void) => {
  const t = setInterval(cb, TICK);
  return () => clearInterval(t);
};
const useNow = () => useSyncExternalStore(subscribe, () => Math.floor(Date.now() / TICK) * TICK, () => 0);
// Mirrors the lock route's STUCK_MS: a claim older than this crashed mid-way and may be retried.
const claiming = (d: Decision, now: number) => !!d.locked_at && now - Date.parse(d.locked_at) < 60_000;

async function postLock(tripId: string, decisionId: string): Promise<string | null> {
  const res = await fetch(`/api/trips/${tripId}/decisions/${decisionId}/lock`, { method: "POST" });
  if (res.ok) return null;
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? "Couldn't lock it. Please try again.";
}

/** D-5: questions with a deadline; options ranked by likes + 3×Roses; the leader locks at the deadline. */
export function Decisions({ tripId, data, isOrganizer, refresh }: { tripId: string; data: DecideData; isOrganizer: boolean; refresh: () => void }) {
  const now = useNow();
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [pending, setPending] = useState<string | null>(null);
  const tried = useRef(new Set<string>());

  const lock = (id: string) =>
    postLock(tripId, id).then((err) => {
      setErrors((e) => ({ ...e, [id]: err }));
      refresh();
    });

  // Deadline passed (on load, or while the page is open): any member's page asks the server to lock it, once.
  useEffect(() => {
    if (!now) return;
    for (const d of data.decisions) {
      if (d.locked_at && !d.locked_option_id && !claiming(d, now)) tried.current.delete(d.id); // stale claim: try again
      if (d.locked_option_id || claiming(d, now) || !d.deadline || Date.parse(d.deadline) > now || tried.current.has(d.id)) continue;
      tried.current.add(d.id);
      lock(d.id);
    }
  }); // no deps: runs after every render; `tried` keeps it to one call per decision per page load

  async function act(id: string, run: () => Promise<string | null>) {
    setPending(id);
    setErrors((e) => ({ ...e, [id]: null }));
    const err = await run();
    setErrors((e) => ({ ...e, [id]: err }));
    setPending(null);
    refresh();
  }

  if (!isOrganizer && data.decisions.length === 0) return null;

  return (
    <section className="grid gap-2" aria-labelledby="decisions-title">
      <h2 id="decisions-title" className="text-[17px] font-bold">Decisions</h2>
      {data.decisions.length === 0 ? (
        <p className="text-[15px] text-muted-foreground">
          Going round in circles? Ask the group one question with a deadline. When time&apos;s up, the leading option locks itself.
        </p>
      ) : (
        <ul className={cn(SURFACE, "divide-y divide-border")}>
          {data.decisions.map((d) => (
            <DecisionRow
              key={d.id}
              d={d}
              data={data}
              now={now}
              isOrganizer={isOrganizer}
              pending={pending === d.id}
              error={errors[d.id] ?? null}
              onLock={() => act(d.id, () => postLock(tripId, d.id))}
              onAttach={(optionId) =>
                act(d.id, async () => {
                  const { error } = await createClient().from("options").update({ decision_id: d.id }).eq("id", optionId);
                  return error ? errorMessage(error) : null;
                })
              }
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function DecisionRow({
  d, data, now, isOrganizer, pending, error, onLock, onAttach,
}: {
  d: Decision; data: DecideData; now: number; isOrganizer: boolean; pending: boolean; error: string | null;
  onLock: () => void; onAttach: (optionId: string) => void;
}) {
  // Oldest first, like the server, so a tie lists options in the order they were added.
  const ranked = rankOptions(data.options.filter((o) => o.decision_id === d.id).reverse(), data.reactions);
  const top = leaders(ranked);
  const locked = data.options.find((o) => o.id === d.locked_option_id);
  const free = data.options.filter((o) => !o.decision_id && !o.vetoed_at);
  const status = claiming(d, now) ? "Locking…" : !d.deadline ? "No deadline" : now ? (countdown(d.deadline, now) ?? "Time's up, locking…") : null;

  return (
    <li className="grid gap-3 p-4">
      <div className="grid gap-0.5">
        <h3 className="text-[15px] leading-snug font-bold">{d.question}</h3>
        {locked ? (
          <p className="flex items-start gap-1.5 text-[15px] font-semibold text-truck-green-ink">
            <Lock aria-hidden className="mt-0.5 size-[18px] shrink-0" strokeWidth={1.8} />Locked: {locked.title}
          </p>
        ) : (
          <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <Clock aria-hidden className="size-4 shrink-0" strokeWidth={1.8} />
            {DECISION_KINDS[d.kind] ?? d.kind}{status && ` · ${status}`}
          </p>
        )}
      </div>

      {ranked.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          No options yet. {isOrganizer ? "Attach some below." : "The organizer will attach a few to vote on."}
        </p>
      ) : (
        <ol className="grid gap-1.5" aria-label="Options, most loved first">
          {ranked.map((r, i) => {
            const leading = !locked && top.length === 1 && i === 0 && r.score > 0;
            return (
              <li key={r.id} className="flex items-baseline justify-between gap-3 text-[15px]">
                <span className="min-w-0">
                  <span className="tabular text-muted-foreground">{i + 1}. </span>
                  <span className={cn(leading && "font-semibold")}>{r.title}</span>
                  {leading && <span className="font-semibold text-truck-green-ink"> · Leading</span>}
                </span>
                <span className="tabular shrink-0 text-[13px] text-muted-foreground">
                  {r.likes} {r.likes === 1 ? "like" : "likes"} · {r.roses} {r.roses === 1 ? "Rose" : "Roses"}
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {!locked && top.length > 1 && top[0].score > 0 && (
        <p className="text-[13px] text-muted-foreground">It&apos;s a tie at the top. If it&apos;s still tied when it locks, AI suggests a compromise.</p>
      )}

      {isOrganizer && !locked && (
        <div className="grid gap-2">
          {free.length > 0 && (
            <form
              className="grid grid-cols-[1fr_auto] items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const id = String(new FormData(e.currentTarget).get("option") ?? "");
                if (id) onAttach(id);
              }}
            >
              <div className="grid gap-1">
                <Label htmlFor={`attach-${d.id}`} className="text-[13px] font-normal text-muted-foreground">Add an option to vote on</Label>
                <select id={`attach-${d.id}`} name="option" className={FIELD}>
                  {free.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
                </select>
              </div>
              <Button type="submit" variant="outline" className="h-11 border-input bg-card" disabled={pending}>Attach</Button>
            </form>
          )}
          <Button variant="outline" className="h-11 border-input bg-card" disabled={pending || ranked.length === 0 || claiming(d, now)} onClick={onLock}>
            <Lock aria-hidden className="size-[18px]" strokeWidth={1.8} />
            {pending ? "Working…" : "Lock now"}
          </Button>
        </div>
      )}
      {error && <p role="alert" className="text-[15px] text-destructive">{error}</p>}
    </li>
  );
}

/** Organizer: ask a question with a deadline. Options are attached afterwards from the decision row. */
export function NewDecisionForm({ tripId, onAdded }: { tripId: string; onAdded: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const question = String(form.get("question") ?? "").trim();
    const deadline = new Date(String(form.get("deadline") ?? "")); // datetime-local is the viewer's local time
    if (!question) return setError("Write the question, e.g. “Where do we stay?”");
    if (Number.isNaN(+deadline) || +deadline <= Date.now()) return setError("Pick a deadline in the future.");
    setPending(true);
    setError(null);
    const { error } = await createClient()
      .from("decisions")
      .insert({ trip_id: tripId, question, kind: String(form.get("kind")), deadline: deadline.toISOString() });
    setPending(false);
    if (error) return setError(errorMessage(error));
    onAdded();
  }

  return (
    <section className={cn(SURFACE, "p-4")} aria-labelledby="new-decision-title">
      <h2 id="new-decision-title" className="text-[17px] font-bold">New decision</h2>
      <form onSubmit={onSubmit} className="mt-4 grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="question">Question</Label>
          <Input id="question" name="question" required maxLength={120} placeholder="Where do we stay in Goa?" className="h-11 bg-card text-base" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="decision-kind">About</Label>
          <select id="decision-kind" name="kind" defaultValue="stay" className={FIELD}>
            {Object.entries(DECISION_KINDS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="deadline">Locks at</Label>
          <Input id="deadline" name="deadline" type="datetime-local" required className="h-11 bg-card text-base" />
        </div>
        <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create decision"}</Button>
        {error && <p role="alert" className="text-[15px] text-destructive">{error}</p>}
      </form>
    </section>
  );
}
