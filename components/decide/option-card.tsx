"use client";

import { useState } from "react";
import { Ban, CircleAlert, CircleCheck, Flower2, Heart, MessageCircle, Wallet } from "lucide-react";
import { ReflectorBar } from "@/components/kafila/reflector-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inr, splitEqually } from "@/lib/money";
import { errorMessage } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";
import { tagLabel } from "@/lib/tags";
import { cn } from "@/lib/utils";
import { reactionsOn, type DecideData, type Option, type Reaction } from "./data";

export const KIND_LABEL: Record<string, string> = {
  destination: "Destination", stay: "Stay", activity: "Activity", food: "Food", transport: "Transport", other: "Other",
};

/** Shared Decide styles. Selected fills use the text-strength green so white labels clear 4.5:1. */
export const SURFACE = "rounded-xl border border-border bg-card";
export const CHIP = "inline-flex items-center rounded-full border border-ink bg-card px-2.5 text-[13px] leading-6 font-semibold";
export const FIELD = "h-11 w-full rounded-lg border border-input bg-card px-2.5 text-base";
export const toggleClass = (on: boolean) =>
  cn(
    "h-11 rounded-full px-3.5",
    on ? "border-truck-green-ink bg-truck-green-ink text-white hover:bg-truck-green-ink/90 hover:text-white" : "border-input bg-card",
  );

type Props = {
  option: Option;
  data: DecideData;
  names: Record<string, string>;
  meId: string;
  tripId: string;
  myRose: Reaction | undefined;
  activeCount: number;
  refresh: () => void;
  /** D-4: vetoes I have left (0 = none). */
  vetoesLeft: number;
};

export function OptionCard({ option: o, data, names, meId, tripId, myRose, activeCount, refresh, vetoesLeft }: Props) {
  const [confirmVeto, setConfirmVeto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const vetoed = !!o.vetoed_at;
  const decided = data.decisions.some((d) => d.locked_option_id === o.id); // a lock is final: no veto
  const aspects = data.aspects.filter((a) => a.option_id === o.id);
  const comments = data.comments.filter((c) => c.option_id === o.id);
  const roses = reactionsOn(data.reactions, o.id, null, "rose");
  const likes = reactionsOn(data.reactions, o.id, null, "like");
  const who = (rs: Reaction[]) => rs.map((r) => names[r.member_id] ?? "Someone").join(", ");

  async function act(write: (s: ReturnType<typeof createClient>) => PromiseLike<{ error: unknown }>) {
    setPending(true);
    setError(null);
    const { error } = await write(createClient());
    if (error) setError(errorMessage(error));
    setPending(false);
    refresh();
    return !error;
  }

  function toggleLike(aspectId: string | null) {
    const mine = reactionsOn(data.reactions, o.id, aspectId, "like").find((r) => r.member_id === meId);
    return act((s) =>
      mine
        ? s.from("reactions").delete().eq("id", mine.id)
        : s.from("reactions").insert({ trip_id: tripId, option_id: o.id, aspect_id: aspectId, member_id: meId, kind: "like" }),
    );
  }

  function toggleRose() {
    return act(async (s) => {
      // One Rose per member per trip (unique index): take it back first, then give it here.
      if (myRose) {
        const { error } = await s.from("reactions").delete().eq("id", myRose.id);
        if (error || myRose.option_id === o.id) return { error };
      }
      return s.from("reactions").insert({ trip_id: tripId, option_id: o.id, member_id: meId, kind: "rose" });
    });
  }

  async function veto(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const showName = new FormData(e.currentTarget).get("showName") === "on";
    await act(async () => {
      const res = await fetch(`/api/trips/${tripId}/options/${o.id}/veto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showName }),
      });
      if (res.ok) return { error: null };
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      return { error: { message: body?.error } };
    });
    setConfirmVeto(false);
  }

  async function onComment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const body = String(form.get("body") ?? "").trim();
    if (!body) return;
    const ok = await act((s) =>
      s.from("comments").insert({ trip_id: tripId, option_id: o.id, aspect_id: form.get("aspect") || null, member_id: meId, body }),
    );
    if (ok) formEl.reset();
  }

  const liked = (rs: Reaction[]) => rs.some((r) => r.member_id === meId);
  const score = data.scores?.[o.id];
  const fits = data.fit && o.price_paise != null ? data.fit[o.id] : undefined;
  const roseHere = myRose?.option_id === o.id;

  return (
    <article className={cn(SURFACE, "overflow-hidden", vetoed && "bg-muted")}>
      {o.image_url && (
        // eslint-disable-next-line @next/next/no-img-element -- any user-pasted URL; next/image needs allow-listed hosts
        <img src={o.image_url} alt="" className={cn("h-40 w-full object-cover", vetoed && "grayscale")} />
      )}
      <div className="grid gap-3 p-4">
        <header className="grid gap-1.5">
          <div className="flex flex-wrap gap-1.5">
            <span className={CHIP}>{KIND_LABEL[o.kind] ?? o.kind}</span>
            {vetoed && <span className={cn(CHIP, "border-truck-red text-truck-red")}>{o.vetoed_by_name ? `Vetoed by ${o.vetoed_by_name}` : "Vetoed"}</span>}
            {vetoed && !o.vetoed_by_name && data.myVetoes.includes(o.id) && <span className={CHIP}>Your veto, only you see this</span>}
          </div>
          <h3 className="text-[17px] leading-snug font-bold">{o.title}</h3>
          {o.price_paise != null && (
            <p className="tabular text-[15px]">
              <span className="font-semibold">{inr(o.price_paise)}</span> total
              <span className="text-muted-foreground"> · {inr(splitEqually(o.price_paise, activeCount)[0])} per head</span>
            </p>
          )}
        </header>

        {o.description && <p className="text-[15px] text-muted-foreground">{o.description}</p>}
        {o.tags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
            {o.tags.map((t) => <li key={t} className={CHIP}>{tagLabel(t)}</li>)}
          </ul>
        )}

        {!vetoed && (score != null || fits !== undefined) && (
          <div className="grid gap-2">
            {score != null && (
              <div className="grid gap-1">
                <div className="grid grid-cols-[auto_1fr] items-center gap-3">
                  <p className="tabular text-[15px] font-bold">Group fit {score}</p>
                  <ReflectorBar value={score} label={`Group fit ${score} out of 100`} />
                </div>
                <p className="text-[13px] text-muted-foreground">Based on everyone&apos;s likes, Roses and preferences. Never shown per person.</p>
              </div>
            )}
            {fits === true && (
              <p className="flex items-center gap-1.5 text-[15px] font-semibold text-truck-green-ink">
                <CircleCheck aria-hidden className="size-[18px]" strokeWidth={1.8} />Fits everyone&apos;s budget
              </p>
            )}
            {fits === false && (
              <p className="flex items-center gap-1.5 text-[15px] font-semibold text-truck-red">
                <CircleAlert aria-hidden className="size-[18px]" strokeWidth={1.8} />Over someone&apos;s budget
              </p>
            )}
            {fits === null && (
              <p className="flex items-center gap-1.5 text-[15px] text-muted-foreground">
                <Wallet aria-hidden className="size-[18px]" strokeWidth={1.8} />Add budgets to check if it fits everyone
              </p>
            )}
          </div>
        )}

        {aspects.length > 0 && (
          <ul className="divide-y divide-border border-y border-border" aria-label="What's in it">
            {aspects.map((a) => {
              const al = reactionsOn(data.reactions, o.id, a.id, "like");
              const on = liked(al);
              return (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 text-[15px]">
                    <span className="font-semibold">{a.label}</span>
                    {a.value && <span className="text-muted-foreground"> · {a.value}</span>}
                    {al.length > 0 && <span className="block truncate text-[13px] text-muted-foreground">Liked by {who(al)}</span>}
                  </span>
                  <Button
                    variant="outline"
                    className={cn(toggleClass(on), "min-w-11 shrink-0 px-3")}
                    aria-pressed={on}
                    aria-label={`Like ${a.label}`}
                    disabled={pending || vetoed}
                    onClick={() => toggleLike(a.id)}
                  >
                    <Heart aria-hidden className={cn("size-[18px]", on && "fill-current")} strokeWidth={1.8} />
                    {al.length > 0 && <span className="tabular">{al.length}</span>}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        {!vetoed && (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className={toggleClass(liked(likes))} aria-pressed={liked(likes)} disabled={pending} onClick={() => toggleLike(null)}>
              <Heart aria-hidden className={cn("size-[18px]", liked(likes) && "fill-current")} strokeWidth={1.8} />
              {liked(likes) ? "Liked" : "Like"}
              {likes.length > 0 && <span className="tabular">· {likes.length}</span>}
            </Button>
            <Button variant="outline" className={toggleClass(roseHere)} aria-pressed={roseHere} disabled={pending} onClick={toggleRose}>
              <Flower2 aria-hidden className="size-[18px]" strokeWidth={1.8} />
              {roseHere ? "Your Rose" : myRose ? "Move Rose here" : "Give Rose"}
            </Button>
          </div>
        )}
        {!vetoed && !decided && !confirmVeto && (
          <Button variant="outline" className="h-11 border-input bg-card" disabled={pending || vetoesLeft === 0} onClick={() => setConfirmVeto(true)}>
            <Ban aria-hidden className="size-[18px]" strokeWidth={1.8} />
            {vetoesLeft === 0 ? "No vetoes left" : "Veto"}
          </Button>
        )}
        {!vetoed && !decided && confirmVeto && (
          <form onSubmit={veto} className="grid gap-2 border-y border-border py-3" aria-label={`Veto ${o.title}`}>
            <p className="text-[15px]">
              Veto <strong className="font-semibold">{o.title}</strong>? It&apos;s out for everyone and can&apos;t be undone.
              You&apos;ll have {vetoesLeft - 1} of {data.vetoAllowance} left.
            </p>
            <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px]">
              <input type="checkbox" name="showName" className="size-5 accent-truck-green-ink" />
              Show my name (otherwise nobody knows it was you)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" className="h-11 border-input bg-card" onClick={() => setConfirmVeto(false)}>Cancel</Button>
              <Button type="submit" variant="destructive" className="h-11" disabled={pending}>
                <Ban aria-hidden className="size-[18px]" strokeWidth={1.8} />
                {pending ? "Vetoing…" : "Veto it"}
              </Button>
            </div>
          </form>
        )}
        {(likes.length > 0 || roses.length > 0) && (
          <div className="grid gap-1 text-[13px] text-muted-foreground">
            {likes.length > 0 && (
              <p className="flex items-center gap-1.5"><Heart aria-hidden className="size-4 shrink-0" strokeWidth={1.8} />Liked by {who(likes)}</p>
            )}
            {roses.length > 0 && (
              <p className="flex items-center gap-1.5"><Flower2 aria-hidden className="size-4 shrink-0" strokeWidth={1.8} />Roses from {who(roses)}</p>
            )}
          </div>
        )}

        <details className="border-t border-border text-[15px]">
          <summary className="flex h-11 cursor-pointer list-none items-center gap-2 font-semibold [&::-webkit-details-marker]:hidden">
            <MessageCircle aria-hidden className="size-[18px]" strokeWidth={1.8} />
            {comments.length === 0 ? "Comment" : `${comments.length} comment${comments.length === 1 ? "" : "s"}`}
          </summary>
          <div className="grid gap-3 pb-1">
            {comments.length > 0 && (
              <ul className="divide-y divide-border">
                {comments.map((c) => (
                  <li key={c.id} className="py-2">
                    <p className="text-[13px] text-muted-foreground">
                      <span className="font-semibold text-ink">{names[c.member_id] ?? "Someone"}</span>
                      {c.aspect_id && <> on {aspects.find((a) => a.id === c.aspect_id)?.label}</>}
                    </p>
                    <p>{c.body}</p>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={onComment} className="grid gap-2">
              <Label htmlFor={`comment-${o.id}`}>Add a comment</Label>
              <Input id={`comment-${o.id}`} name="body" required maxLength={1000} placeholder="Looks great, but is it near the beach?" className="h-11 bg-card" />
              {aspects.length > 0 && (
                <>
                  <Label htmlFor={`aspect-${o.id}`}>About</Label>
                  <select id={`aspect-${o.id}`} name="aspect" className={FIELD}>
                    <option value="">The whole option</option>
                    {aspects.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                  </select>
                </>
              )}
              <Button type="submit" variant="outline" className="h-11 border-input bg-card" disabled={pending}>Post</Button>
            </form>
          </div>
        </details>
        {error && <p role="alert" className="text-[15px] text-destructive">{error}</p>}
      </div>
    </article>
  );
}
