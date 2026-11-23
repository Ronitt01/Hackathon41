"use client";

import { useState } from "react";
import { BedDouble, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inr, toPaise } from "@/lib/money";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/supabase/auth";
import type { MoneyData } from "./data";

const FIELD = "h-11 bg-card text-[15px]";
const CHIP =
  "group/chip flex h-11 w-fit cursor-pointer items-center gap-1.5 rounded-full border border-ink bg-card px-4 text-[15px] font-semibold text-ink has-checked:border-truck-green-ink has-checked:bg-truck-green-ink has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-truck-green-ink";
const rupees = (paise: number) => String(paise / 100);

/** M-4: rooms at the stay, private per-bed ratings, the organizer's fair split, and accepting your own bed. */
export function Rooms({ tripId, meId, isOrganizer, data, onChange }: { tripId: string; meId: string | null; isOrganizer: boolean; data: MoneyData; onChange: () => void }) {
  const { rooms, beds, myValues, members } = data;
  const name = (id: string) => (id === meId ? "You" : (members.find((m) => m.id === id)?.display_name ?? "Someone"));
  const myBed = beds.find((b) => b.member_id === meId);
  const rent = beds.reduce((s, b) => s + b.price_paise, 0);

  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(myValues).map(([id, v]) => [id, rupees(v)])));
  const [roomName, setRoomName] = useState("");
  const [bedCount, setBedCount] = useState("2");
  const [total, setTotal] = useState(rent ? rupees(rent) : "");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function run(key: string, work: () => Promise<string | null>) {
    setBusy(key);
    setError(null);
    setSaved(false);
    const problem = await work().catch(errorMessage);
    setBusy(null);
    if (problem) setError(problem);
    else onChange();
    return !problem;
  }

  const addRoom = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const count = Number(bedCount);
    if (!roomName.trim()) return setError("Give the room a name, like “Sea-view double”.");
    if (!Number.isInteger(count) || count < 1 || count > 20) return setError("Beds should be a whole number from 1 to 20.");
    run("add", async () => {
      const { error } = await createClient().from("rooms").insert({ trip_id: tripId, name: roomName.trim(), beds: count });
      if (error) return errorMessage(error);
      setRoomName("");
      return null;
    });
  };

  const deleteRoom = (id: string, roomLabel: string) => {
    if (!confirm(`Delete ${roomLabel}? Everyone's ratings for it and the beds split in it go too.`)) return;
    run(`del:${id}`, async () => problemOf((await createClient().from("rooms").delete().eq("id", id)).error));
  };

  const saveRatings = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!meId) return;
    const rows: { room_id: string; member_id: string; trip_id: string; value_paise: number }[] = [];
    for (const r of rooms) {
      const raw = values[r.id]?.trim() ?? "";
      const paise = raw ? toPaise(raw) : 0; // blank counts as ₹0, same as not rating it
      if (paise === null) return setError(`Check your price for ${r.name}.`);
      rows.push({ room_id: r.id, member_id: meId, trip_id: tripId, value_paise: paise });
    }
    run("rate", async () => problemOf((await createClient().from("room_valuations").upsert(rows, { onConflict: "room_id,member_id" })).error)).then((ok) => setSaved(ok));
  };

  const split = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const totalPaise = toPaise(total);
    if (!totalPaise) return setError("Enter the total rent for the stay.");
    run("split", async () => {
      const res = await fetch(`/api/trips/${tripId}/rooms/price`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ totalPaise }) });
      if (res.ok) return null;
      return ((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Couldn't split the rent. Please try again.";
    });
  };

  const accept = (accepted: boolean) => {
    if (!myBed) return;
    run("accept", async () => problemOf((await createClient().from("bed_assignments").update({ accepted }).eq("id", myBed.id)).error));
  };

  const happy = beds.filter((b) => b.accepted).length;

  return (
    <section aria-labelledby="rooms-h" className="grid gap-3">
      <div>
        <h2 id="rooms-h" className="text-[17px] leading-snug font-bold">Rooms</h2>
        <p className="text-[13px] text-muted-foreground">The better room costs a bit more, and nobody would rather swap. Your ratings stay private.</p>
      </div>

      {beds.length > 0 && (
        <div className="grid gap-3 rounded-xl border bg-card p-4">
          <ul className="grid gap-2" aria-label="Room split">
            {rooms.map((r) => {
              const here = beds.filter((b) => b.room_id === r.id);
              if (here.length === 0) return null;
              const same = here.every((b) => b.price_paise === here[0].price_paise);
              return (
                <li key={r.id} className="flex items-start gap-2">
                  <BedDouble aria-hidden strokeWidth={1.8} className="mt-0.5 size-[18px] shrink-0 text-muted-foreground" />
                  <p className="min-w-0">
                    <span className="font-semibold">{r.name}:</span>{" "}
                    {here.map((b, i) => (
                      <span key={b.id}>
                        {i > 0 && " + "}
                        {name(b.member_id)}
                        {b.accepted && (
                          <>
                            <Check aria-hidden strokeWidth={2.2} className="ml-0.5 inline size-3.5 align-[-1px] text-truck-green-ink" />
                            <span className="sr-only"> (accepted)</span>
                          </>
                        )}
                        {!same && <span className="tabular"> {inr(b.price_paise)}</span>}
                      </span>
                    ))}
                    {same && <span className="tabular font-semibold"> · {inr(here[0].price_paise)}{here.length > 1 && " each"}</span>}
                  </p>
                </li>
              );
            })}
          </ul>
          <p className="text-[13px] text-muted-foreground">
            {happy} of {beds.length} happy with this split · total {inr(rent)}
          </p>
          {myBed && (
            <label className={CHIP}>
              <input type="checkbox" className="sr-only" checked={myBed.accepted} disabled={busy === "accept"} onChange={(e) => accept(e.target.checked)} />
              <Check aria-hidden strokeWidth={2.2} className="hidden size-4 group-has-checked/chip:block" />
              I&apos;m happy with my bed
            </label>
          )}
        </div>
      )}

      {rooms.length === 0 ? (
        <p className="text-muted-foreground">No rooms yet. Add each room at your stay with its number of beds, then everyone rates them.</p>
      ) : (
        meId && (
          <form onSubmit={saveRatings} className="grid gap-3">
            <div>
              <h3 className="text-[15px] font-bold">What one bed is worth to you</h3>
              <p className="text-[13px] text-muted-foreground">Leave a room blank if you&apos;d rather not stay there.</p>
            </div>
            <ul className="divide-y rounded-xl border bg-card px-4">
              {rooms.map((r) => (
                <li key={r.id} className="grid grid-cols-[1fr_7.5rem_auto] items-center gap-2 py-2">
                  <Label htmlFor={`rate-${r.id}`} className="block min-w-0 text-[15px] font-semibold">
                    <span className="block truncate">{r.name}</span>
                    <span className="block text-[13px] font-normal text-muted-foreground">
                      {r.beds} {r.beds === 1 ? "bed" : "beds"}
                    </span>
                    <span className="sr-only"> — ₹ you&apos;d pay per bed</span>
                  </Label>
                  <Input
                    id={`rate-${r.id}`}
                    inputMode="decimal"
                    placeholder="₹ per bed"
                    value={values[r.id] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [r.id]: e.target.value }))}
                    className={`${FIELD} tabular`}
                  />
                  <Button type="button" variant="ghost" className="size-11 px-0" aria-label={`Delete ${r.name}`} disabled={busy === `del:${r.id}`} onClick={() => deleteRoom(r.id, r.name)}>
                    <Trash2 aria-hidden strokeWidth={1.8} className="size-[18px]" />
                  </Button>
                </li>
              ))}
            </ul>
            <Button type="submit" variant="outline" className="w-full bg-card" disabled={busy === "rate"}>
              {busy === "rate" ? "Saving…" : saved ? "Ratings saved" : "Save my ratings"}
            </Button>
          </form>
        )
      )}

      <form onSubmit={addRoom} className="grid grid-cols-[1fr_5rem_auto] items-end gap-2">
        <div className="grid min-w-0 gap-1">
          <Label htmlFor="room-name" className="text-[13px]">Room name</Label>
          <Input id="room-name" value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="Sea-view double" maxLength={40} className={FIELD} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="room-beds" className="text-[13px]">Beds</Label>
          <Input id="room-beds" type="number" inputMode="numeric" min={1} max={20} value={bedCount} onChange={(e) => setBedCount(e.target.value)} className={`${FIELD} tabular`} />
        </div>
        <Button type="submit" disabled={busy === "add"}>{busy === "add" ? "Adding…" : "Add room"}</Button>
      </form>

      {isOrganizer && rooms.length > 0 && (
        <form onSubmit={split} className="grid gap-1">
          <Label htmlFor="total-rent" className="text-[13px]">Total rent for the stay (₹)</Label>
          <div className="flex gap-2">
            <Input id="total-rent" inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="10,500" className={`${FIELD} tabular min-w-0 flex-1`} />
            <Button type="submit" disabled={busy === "split"}>{busy === "split" ? "Splitting…" : beds.length ? "Split again" : "Split rent fairly"}</Button>
          </div>
          <p className="text-[13px] text-muted-foreground">Uses everyone&apos;s private ratings. Splitting again asks everyone to accept again.</p>
        </form>
      )}

      {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
    </section>
  );
}

/** Supabase write result → message or null. */
function problemOf(error: unknown): string | null {
  return error ? errorMessage(error) : null;
}
