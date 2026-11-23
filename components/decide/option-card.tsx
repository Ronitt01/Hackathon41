"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inr, splitEqually } from "@/lib/money";
import { errorMessage } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";
import { tagLabel } from "@/lib/tags";
import { reactionsOn, type DecideData, type Option, type Reaction } from "./data";

export const KIND_LABEL: Record<string, string> = {
  destination: "Destination", stay: "Stay", activity: "Activity", food: "Food", transport: "Transport", other: "Other",
};

type Props = {
  option: Option;
  data: DecideData;
  names: Record<string, string>;
  meId: string;
  tripId: string;
  myRose: Reaction | undefined;
  activeCount: number;
  refresh: () => void;
};

export function OptionCard({ option: o, data, names, meId, tripId, myRose, activeCount, refresh }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const vetoed = !!o.vetoed_at;
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

  return (
    <Card className={vetoed ? "opacity-60 grayscale" : undefined}>
      {o.image_url && (
        // eslint-disable-next-line @next/next/no-img-element -- any user-pasted URL; next/image needs allow-listed hosts
        <img src={o.image_url} alt="" className="h-40 w-full object-cover" />
      )}
      <CardHeader>
        <CardDescription>{KIND_LABEL[o.kind] ?? o.kind}{vetoed && " · Vetoed"}</CardDescription>
        <CardTitle>{o.title}</CardTitle>
        {o.price_paise != null && (
          <p className="text-sm">
            {inr(o.price_paise)} total · {inr(splitEqually(o.price_paise, activeCount)[0])} per head
          </p>
        )}
      </CardHeader>
      <CardContent className="grid gap-3">
        {o.description && <p className="text-sm text-muted-foreground">{o.description}</p>}
        {o.tags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
            {o.tags.map((t) => <li key={t} className="rounded-full bg-muted px-2.5 py-1 text-xs">{tagLabel(t)}</li>)}
          </ul>
        )}

        {!vetoed && (score != null || fits !== undefined) && (
          <div className="grid gap-1 text-sm">
            {score != null && (
              <details>
                <summary className="flex h-11 cursor-pointer items-center font-medium">Group fit {score}/100</summary>
                <p className="text-muted-foreground">Based on everyone&apos;s likes, Roses and preferences. Never shown per person.</p>
              </details>
            )}
            {fits === true && <p className="text-green-700 dark:text-green-400">Fits everyone&apos;s budget ✓</p>}
            {fits === false && <p className="text-destructive">Over someone&apos;s budget ✗</p>}
            {fits === null && <p className="text-muted-foreground">Add budgets to check if it fits everyone</p>}
          </div>
        )}

        {aspects.length > 0 && (
          <ul className="grid gap-2" aria-label="What's in it">
            {aspects.map((a) => {
              const al = reactionsOn(data.reactions, o.id, a.id, "like");
              return (
                <li key={a.id} className="flex items-center justify-between gap-2 rounded-full border py-1 pr-1 pl-4">
                  <span className="min-w-0 text-sm">
                    <span className="font-medium">{a.label}</span>
                    {a.value && <span className="text-muted-foreground"> · {a.value}</span>}
                    {al.length > 0 && <span className="block truncate text-xs text-muted-foreground">♥ {who(al)}</span>}
                  </span>
                  <Button
                    variant={liked(al) ? "secondary" : "ghost"}
                    className="h-11 shrink-0 rounded-full px-3"
                    aria-pressed={liked(al)}
                    aria-label={`Like ${a.label}`}
                    disabled={pending || vetoed}
                    onClick={() => toggleLike(a.id)}
                  >
                    {liked(al) ? "♥" : "♡"} {al.length || ""}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        {!vetoed && (
          <div className="grid grid-cols-2 gap-2">
            <Button variant={liked(likes) ? "secondary" : "outline"} className="h-11" aria-pressed={liked(likes)} disabled={pending} onClick={() => toggleLike(null)}>
              {liked(likes) ? "♥ Liked" : "♡ Like"} {likes.length > 0 && `· ${likes.length}`}
            </Button>
            <Button variant={myRose?.option_id === o.id ? "secondary" : "outline"} className="h-11" aria-pressed={myRose?.option_id === o.id} disabled={pending} onClick={toggleRose}>
              🌹 {myRose?.option_id === o.id ? "Your Rose" : myRose ? "Move Rose here" : "Give Rose"}
            </Button>
          </div>
        )}
        {likes.length > 0 && <p className="text-xs text-muted-foreground">♥ Liked by {who(likes)}</p>}
        {roses.length > 0 && <p className="text-xs text-muted-foreground">🌹 Roses from {who(roses)}</p>}

        <details className="text-sm">
          <summary className="flex h-11 cursor-pointer items-center">
            💬 {comments.length === 0 ? "Comment" : `${comments.length} comment${comments.length === 1 ? "" : "s"}`}
          </summary>
          <div className="grid gap-3">
            {comments.length > 0 && (
              <ul className="grid gap-2">
                {comments.map((c) => (
                  <li key={c.id}>
                    <span className="font-medium">{names[c.member_id] ?? "Someone"}</span>
                    {c.aspect_id && <span className="text-muted-foreground"> on {aspects.find((a) => a.id === c.aspect_id)?.label}</span>}
                    : {c.body}
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={onComment} className="grid gap-2">
              <Label htmlFor={`comment-${o.id}`}>Add a comment</Label>
              <Input id={`comment-${o.id}`} name="body" required maxLength={1000} placeholder="Looks great, but is it near the beach?" className="h-11" />
              {aspects.length > 0 && (
                <>
                  <Label htmlFor={`aspect-${o.id}`}>About</Label>
                  <select id={`aspect-${o.id}`} name="aspect" className="h-11 rounded-lg border border-input bg-transparent px-2.5 text-sm">
                    <option value="">The whole option</option>
                    {aspects.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                  </select>
                </>
              )}
              <Button type="submit" variant="outline" className="h-11" disabled={pending}>Post</Button>
            </form>
          </div>
        </details>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
