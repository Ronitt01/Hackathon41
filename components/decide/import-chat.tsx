"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MAX_CHAT_CHARS, type Proposal } from "@/lib/chat-import";
import { errorMessage } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";
import { tagLabel } from "@/lib/tags";
import { cn } from "@/lib/utils";
import { CHIP, FIELD, KIND_LABEL, SURFACE } from "./option-card";

/** D-6: WhatsApp export → proposals (server, not stored) → organizer ticks → added as options. */
export function ImportChat({ tripId, meId, onAdded }: { tripId: string; meId: string; onAdded: () => void }) {
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onRead(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const file = form.get("file");
    const picked = file instanceof File && file.size > 0 ? file : null;
    if (picked && picked.size > MAX_CHAT_CHARS) return setError("That file is over 200 KB. Export a shorter chat, or paste the part about the trip.");
    const text = picked ? await picked.text() : String(form.get("pasted") ?? "");
    if (!text.trim()) return setError("Pick the .txt file or paste the chat first.");
    if (text.length > MAX_CHAT_CHARS) return setError("That chat is over 200 KB. Paste just the part about the trip.");
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/trips/${tripId}/import-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, consent: form.get("consent") === "on" }),
      });
      const body = (await res.json().catch(() => null)) as { proposals?: Proposal[]; error?: string } | null;
      if (!res.ok || !body?.proposals) setError(body?.error ?? "Couldn't read that chat. Please try again.");
      else setProposals(body.proposals);
    } catch (err) {
      setError(errorMessage(err));
    }
    setPending(false);
  }

  async function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const picked = new FormData(e.currentTarget).getAll("pick").map((i) => proposals![Number(i)]);
    if (!picked.length) return setError("Tick at least one idea to add.");
    setPending(true);
    setError(null);
    const { error } = await createClient()
      .from("options")
      .insert(picked.map((p) => ({ trip_id: tripId, kind: p.kind, title: p.title, tags: p.tags, source: "chat", created_by: meId })));
    setPending(false);
    if (error) return setError(errorMessage(error));
    onAdded();
  }

  return (
    <section className={cn(SURFACE, "grid gap-4 p-4")} aria-labelledby="import-chat-title">
      <div className="grid gap-1">
        <h2 id="import-chat-title" className="text-[17px] font-bold">Import from WhatsApp</h2>
        <p className="flex items-start gap-2 text-[13px] text-muted-foreground">
          <ShieldCheck aria-hidden className="mt-px size-4 shrink-0" strokeWidth={1.8} />
          Names, numbers and times are removed before anything is read, and the chat is never saved.
        </p>
      </div>

      {proposals === null ? (
        <form onSubmit={onRead} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="chat-file">Chat export (.txt)</Label>
            <input id="chat-file" name="file" type="file" accept=".txt,text/plain" className={cn(FIELD, "py-2 text-[15px] file:mr-3 file:font-semibold")} />
            <p className="text-[13px] text-muted-foreground">In the WhatsApp group, open the menu, then More, Export chat, Without media.</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="chat-paste">Or paste the messages</Label>
            <textarea id="chat-paste" name="pasted" rows={4} className={cn(FIELD, "h-auto py-2")} placeholder="Goa or Gokarna for 12–15 Dec? Budget max 10k…" />
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px] font-semibold">
            <input type="checkbox" name="consent" required className="size-5 shrink-0 accent-truck-green-ink" />
            Everyone in the chat is OK with this
          </label>
          <Button type="submit" disabled={pending}>{pending ? "Reading the chat…" : "Find trip ideas"}</Button>
        </form>
      ) : proposals.length === 0 ? (
        <div className="grid gap-3">
          <p className="text-[15px] text-muted-foreground">No trip ideas found in that chat. Try the stretch where you planned, or add options by hand.</p>
          <Button variant="outline" className="h-11 border-input bg-card" onClick={() => setProposals(null)}>Try another chat</Button>
        </div>
      ) : (
        <form onSubmit={onAdd} className="grid gap-3">
          <fieldset className="grid">
            <legend className="mb-1 text-[15px] font-semibold">Tick what the group should vote on</legend>
            <ul className="divide-y divide-border border-y border-border">
              {proposals.map((p, i) => (
                <li key={i}>
                  <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2.5">
                    <input type="checkbox" name="pick" value={i} defaultChecked className="mt-0.5 size-5 shrink-0 accent-truck-green-ink" />
                    <span className="grid min-w-0 gap-1">
                      <span className="text-[15px] font-semibold">{p.title}</span>
                      <span className="flex flex-wrap gap-1.5">
                        <span className={CHIP}>{KIND_LABEL[p.kind] ?? p.kind}</span>
                        {p.tags.map((t) => <span key={t} className={CHIP}>{tagLabel(t)}</span>)}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" className="h-11 border-input bg-card" onClick={() => setProposals(null)}>Start over</Button>
            <Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add selected"}</Button>
          </div>
        </form>
      )}
      {error && <p role="alert" className="text-[15px] text-destructive">{error}</p>}
    </section>
  );
}
