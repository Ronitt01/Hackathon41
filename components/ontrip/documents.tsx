"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileText, Trash2 } from "lucide-react";
import { dayLabel } from "@/components/itinerary/days";
import { shortDate } from "@/components/money/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { todayDay } from "@/lib/replan";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/supabase/auth";

export type TripDoc = { id: string; mine: boolean; by: string; title: string; forDay: string | null; storagePath: string; url: string | null };

const extOf = (f: File) => (f.name.split(".").pop() || f.type.split("/")[1] || "pdf").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "pdf";

/** "Day 2 · 24 Nov" inside the trip, "20 Nov" outside it, "Any day" when untied. */
function groupLabel(forDay: string | null, start: string | null, end: string | null) {
  if (!forDay) return "Any day";
  const { day, live } = todayDay(start, end, forDay);
  return live ? dayLabel(day, start) : shortDate(forDay);
}

/** T-8: tickets and bookings (PDF or image) for the trip, optionally tied to a day. */
export function Documents({ tripId, meId, start, end, docs }: { tripId: string; meId: string; start: string | null; end: string | null; docs: TripDoc[] }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [forDay, setForDay] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return setError("Choose a PDF or photo to upload.");
    if (file.type !== "application/pdf" && !file.type.startsWith("image/")) return setError("Only PDFs and images can go in the vault.");
    if (!title.trim()) return setError("Give it a title, like \"Train to Goa\".");
    setPending(true);
    const supabase = createClient();
    const path = `${tripId}/${crypto.randomUUID()}.${extOf(file)}`;
    const { error: up } = await supabase.storage.from("documents").upload(path, file, { contentType: file.type });
    const { error: row } = up
      ? { error: up }
      : await supabase.from("documents").insert({ trip_id: tripId, member_id: meId, title: title.trim().slice(0, 120), storage_path: path, for_day: forDay || null });
    if (row && !up) await supabase.storage.from("documents").remove([path]);
    setPending(false);
    if (row) return setError(errorMessage(row));
    setError(null);
    setFile(null);
    setTitle("");
    setForDay("");
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  async function remove(d: TripDoc) {
    const supabase = createClient();
    const { error } = await supabase.from("documents").delete().eq("id", d.id).eq("member_id", meId);
    setConfirming(null);
    if (error) return setError(errorMessage(error));
    await supabase.storage.from("documents").remove([d.storagePath]);
    router.refresh();
  }

  // docs arrive sorted by day, undated last, so the groups come out in trip order.
  const groups = new Map<string, TripDoc[]>();
  for (const d of docs) {
    const label = groupLabel(d.forDay, start, end);
    groups.set(label, [...(groups.get(label) ?? []), d]);
  }

  return (
    <div className="grid gap-3">
      {docs.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-6 text-center text-muted-foreground">No tickets yet. Upload train tickets or hotel bookings so nobody digs through email at the station.</p>
      ) : (
        [...groups].map(([label, list]) => (
          <section key={label} aria-label={label} className="grid gap-1">
            <h3 className="text-[15px] font-bold">{label}</h3>
            <ul className="divide-y border-y">
              {list.map((d) => (
                <li key={d.id} className="flex min-h-14 items-center gap-3 py-1.5">
                  <FileText aria-hidden strokeWidth={1.8} className="size-5 shrink-0 text-muted-foreground" />
                  <span className="grid min-w-0 flex-1">
                    {d.url ? (
                      <a href={d.url} target="_blank" rel="noopener noreferrer" className="truncate font-semibold underline-offset-2 hover:underline">{d.title}</a>
                    ) : (
                      <span className="truncate font-semibold">{d.title}</span>
                    )}
                    <span className="text-[13px] text-muted-foreground">Added by {d.mine ? "you" : d.by}</span>
                  </span>
                  {d.mine &&
                    (confirming === d.id ? (
                      <span className="flex gap-1">
                        <Button className="h-11 bg-destructive px-3 text-[13px] text-white hover:bg-destructive/90" onClick={() => remove(d)}>
                          Delete<span className="sr-only"> {d.title}</span>
                        </Button>
                        <Button variant="ghost" className="h-11 px-3 text-[13px]" onClick={() => setConfirming(null)}>Keep</Button>
                      </span>
                    ) : (
                      <Button variant="ghost" className="size-11 p-0" aria-label={`Delete ${d.title}`} onClick={() => setConfirming(d.id)}>
                        <Trash2 aria-hidden strokeWidth={1.8} className="size-4" />
                      </Button>
                    ))}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <form onSubmit={upload} className="grid gap-2">
        <div className="grid gap-1.5">
          <Label htmlFor="doc-file">File (PDF or photo)</Label>
          <Input
            id="doc-file"
            type="file"
            accept="application/pdf,image/*"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ""));
            }}
            className="h-11 bg-card py-2"
          />
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div className="grid gap-1.5">
            <Label htmlFor="doc-title">Title</Label>
            <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="h-11 bg-card" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="doc-day">For day (optional)</Label>
            <Input id="doc-day" type="date" value={forDay} min={start ?? undefined} max={end ?? undefined} onChange={(e) => setForDay(e.target.value)} className="h-11 bg-card" />
          </div>
        </div>
        <Button type="submit" variant="outline" className="h-11 bg-card" disabled={pending}>{pending ? "Uploading…" : "Upload"}</Button>
        {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
      </form>
    </div>
  );
}
