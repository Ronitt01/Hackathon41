"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { SendHorizontal } from "lucide-react";
import { enter } from "@/components/ontrip/enter";
import { Button } from "@/components/ui/button";
import { tap } from "@/lib/haptics";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/supabase/auth";

export type ChatMessage = { id: string; member_id: string; body: string; created_at: string };

const COLUMNS = "id, member_id, body, created_at";
const time = new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });
const dayMonth = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
const stamp = (iso: string) => {
  const d = new Date(iso);
  return dayMonth.format(d) === dayMonth.format(new Date()) ? time.format(d) : `${dayMonth.format(d)}, ${time.format(d)}`;
};

/** T-7: trip chat, live over Supabase Realtime. Newest at the bottom; mine on the right in green. */
export function Chat({ tripId, meId, names: initialNames, initial }: { tripId: string; meId: string; names: Record<string, string>; initial: ChatMessage[] }) {
  const [messages, setMessages] = useState(initial);
  const [names, setNames] = useState(initialNames);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const log = useRef<HTMLOListElement>(null);
  // Messages already on screen at load don't animate; only ones that arrive after do.
  const seen = useRef(new Set(initial.map((m) => m.id)));
  const arrive = (id: string, mine: boolean) => (el: HTMLLIElement | null) => {
    if (!el || seen.current.has(id)) return;
    seen.current.add(id);
    enter(el, mine ? "translateX(24px) scale(0.96)" : "translateY(12px)"); // mine whooshes in from the send button
  };

  const add = (m: ChatMessage) => setMessages((list) => (list.some((x) => x.id === m.id) ? list : [...list, m]));

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`trip:${tripId}:messages`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `trip_id=eq.${tripId}` }, ({ new: row }) => add(row as ChatMessage))
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  // Names for people who joined after the page loaded.
  useEffect(() => {
    const unknown = [...new Set(messages.map((m) => m.member_id))].filter((id) => !(id in names));
    if (!unknown.length) return;
    createClient()
      .from("members")
      .select("id, display_name")
      .in("id", unknown)
      .then(({ data }) => {
        if (data?.length) setNames((n) => ({ ...n, ...Object.fromEntries(data.map((d) => [d.id, d.display_name])) }));
      });
  }, [messages, names]);

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [messages.length]);

  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    tap();
    setSending(true);
    const { data, error } = await createClient().from("messages").insert({ trip_id: tripId, member_id: meId, body: body.slice(0, 2000) }).select(COLUMNS).single();
    setSending(false);
    if (error) return setError(errorMessage(error));
    setError(null);
    setDraft("");
    add(data);
  }

  return (
    <div className="grid gap-2">
      {messages.length === 0 ? (
        <div className="grid justify-items-center gap-1 rounded-xl border border-dashed px-4 py-5 text-center">
          <Image src="/illustrations/chai.svg" alt="" width={64} height={64} />
          <p className="font-semibold">Quiet in here. Chai&apos;s getting cold.</p>
          <p className="text-[13px] text-muted-foreground">Say hi to the gang, or ask who&apos;s up for breakfast.</p>
        </div>
      ) : (
        <ol ref={log} role="log" aria-label="Group chat messages" className="grid max-h-96 content-start gap-2 overflow-y-auto overscroll-contain py-1">
          {messages.map((m) => {
            const mine = m.member_id === meId;
            return (
              <li key={m.id} ref={arrive(m.id, mine)} className={`grid max-w-[85%] gap-0.5 ${mine ? "justify-self-end text-right" : "justify-self-start"}`}>
                <span className="text-[13px] text-muted-foreground">
                  {mine ? "You" : (names[m.member_id] ?? "Someone")} · <time dateTime={m.created_at}>{stamp(m.created_at)}</time>
                </span>
                <p className={`rounded-xl px-3 py-2 text-left break-words whitespace-pre-wrap ${mine ? "bg-truck-green-ink text-white" : "border bg-card"}`}>{m.body}</p>
              </li>
            );
          })}
        </ol>
      )}
      <form onSubmit={send} className="flex items-end gap-2">
        <div className="grid flex-1 gap-1.5">
          <Label htmlFor="chat-draft" className="sr-only">Message</Label>
          <Input id="chat-draft" autoComplete="off" maxLength={2000} placeholder="Message the group" value={draft} onChange={(e) => setDraft(e.target.value)} className="h-11 bg-card" />
        </div>
        <Button type="submit" className="size-11 p-0" disabled={sending || !draft.trim()} aria-label="Send">
          <SendHorizontal aria-hidden strokeWidth={1.8} className="size-5" />
        </Button>
      </form>
      {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
    </div>
  );
}
