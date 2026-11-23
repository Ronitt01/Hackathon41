"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CircleAlert, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/kafila/toast";
import { Button } from "@/components/ui/button";
import { tap } from "@/lib/haptics";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { claimAction, duplicateNote, groupPacking, itemKey, unclaimAction, type PackingItem, type PackingRow } from "@/lib/packing";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/supabase/auth";
import type { CrewMember } from "./roles";

import { PACKING_COLUMNS } from "./columns";

/** S-2 who-brings-what: claim items, see who claimed them, spot doubles. Live via Realtime. */
export function Packing({ tripId, meId, members, initial }: { tripId: string; meId: string; members: CrewMember[]; initial: PackingRow[] }) {
  const [rows, setRows] = useState(initial);
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  });
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const [claimed, setClaimed] = useState<string | null>(null); // the item I just claimed pops its button
  const items = groupPacking(rows);
  const nameOf = (id: string) => (id === meId ? "You" : (members.find((m) => m.id === id)?.display_name ?? "Someone"));

  useEffect(() => {
    const supabase = createClient();
    const refresh = async () => {
      const { data } = await supabase.from("packing_items").select(PACKING_COLUMNS).eq("trip_id", tripId).order("created_at");
      if (data) setRows(data);
    };
    const channel = supabase
      .channel(`trip:${tripId}:packing`)
      .on("postgres_changes", { event: "*", schema: "public", table: "packing_items", filter: `trip_id=eq.${tripId}` }, refresh)
      // Realtime can't filter DELETEs (old row carries only the id): listen unfiltered, refetch only for rows we hold.
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "packing_items" }, (p) => {
        if (rowsRef.current.some((r) => r.id === (p.old as { id?: string }).id)) void refresh();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  async function run(action: (s: ReturnType<typeof createClient>) => PromiseLike<{ error: unknown }>) {
    setError(null);
    const supabase = createClient();
    const { error } = await action(supabase);
    const { data } = await supabase.from("packing_items").select(PACKING_COLUMNS).eq("trip_id", tripId).order("created_at");
    if (data) setRows(data);
    if (error) setError(errorMessage(error));
    return !error;
  }

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const clean = name.trim().replace(/\s+/g, " ");
    if (!clean) return setError("Write the item's name.");
    if (items.some((i) => i.key === itemKey(clean))) return setError(`"${clean}" is already on the list. Tap "I'll bring it" there.`);
    if (await run((s) => s.from("packing_items").insert({ trip_id: tripId, name: clean }))) setName("");
  }

  async function claim(item: PackingItem) {
    const step = claimAction(item, meId);
    if (!step) return;
    const ok = await run(async (s) => {
      if (step.kind === "take") {
        // Only take it if it is still unclaimed; if someone beat me to it, add my own row.
        const res = await s.from("packing_items").update({ member_id: meId }).eq("id", step.id).is("member_id", null).select("id");
        if (res.error || res.data.length) return res;
      }
      return s.from("packing_items").insert({ trip_id: tripId, name: item.name, member_id: meId });
    });
    if (!ok) return;
    tap();
    setClaimed(item.key);
    // "Bluetooth speaker" reads as "the bluetooth speaker"; acronyms like "UNO cards" stay as typed.
    const thing = /^[A-Z][a-z]/.test(item.name) ? item.name[0].toLowerCase() + item.name.slice(1) : item.name;
    toast(`You're bringing the ${thing}`, { tone: "success" });
  }

  function unclaim(item: PackingItem) {
    const step = unclaimAction(item, meId);
    if (!step) return;
    run((s) =>
      step.kind === "release"
        ? s.from("packing_items").update({ member_id: null }).eq("id", step.id)
        : s.from("packing_items").delete().eq("id", step.id),
    );
  }

  return (
    <div className="grid gap-3">
      {items.length ? (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card" aria-label="Packing list">
          {items.map((item) => {
            const mine = item.claimers.includes(meId);
            const note = duplicateNote(item);
            return (
              <li key={item.key} className="flex items-center gap-3 px-4 py-2.5">
                <span className="grid min-w-0 flex-1">
                  <span className="font-semibold">{item.name}</span>
                  <span className="text-[13px] text-muted-foreground">
                    {item.claimers.length ? `Bringing: ${item.claimers.map(nameOf).join(", ")}` : "Nobody yet"}
                  </span>
                  {note && (
                    <span className="flex items-center gap-1 text-[13px] font-semibold">
                      <CircleAlert aria-hidden strokeWidth={2} className="size-4 shrink-0" />
                      {note}. Party mode, or one too many?
                    </span>
                  )}
                </span>
                {!item.claimers.length && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="size-11 p-0"
                    aria-label={`Remove ${item.name}`}
                    onClick={() => run((s) => s.from("packing_items").delete().in("id", item.rows.map((r) => r.id)).is("member_id", null))}
                  >
                    <Trash2 aria-hidden strokeWidth={1.8} className="size-5" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant={mine ? "default" : "outline"}
                  aria-pressed={mine}
                  className={`h-11 ${mine ? "bg-truck-green-ink text-white hover:bg-truck-green-ink/90" : ""} ${mine && claimed === item.key ? "pop" : ""}`}
                  onClick={() => (mine ? unclaim(item) : claim(item))}
                >
                  {mine && <Check aria-hidden strokeWidth={2.2} className="size-4" />}
                  {mine ? "I'm bringing it" : "I'll bring it"}
                </Button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-[15px] text-muted-foreground">Nothing on the list yet. Add the shared stuff: speaker, first-aid kit, cards.</p>
      )}

      <form onSubmit={add} className="grid gap-2 border-t pt-3">
        <Label htmlFor="packing-name">Add an item</Label>
        <div className="flex gap-2">
          <Input id="packing-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Bluetooth speaker" className="h-11" />
          <Button type="submit" variant="outline" className="h-11">
            <Plus aria-hidden strokeWidth={1.8} className="size-5" />
            Add
          </Button>
        </div>
      </form>
      {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
    </div>
  );
}
