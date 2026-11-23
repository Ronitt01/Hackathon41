"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { dayLabel } from "@/components/itinerary/days";
import { shortDate } from "@/components/money/data";
import { Button } from "@/components/ui/button";
import { istNow, todayDay } from "@/lib/replan";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/supabase/auth";

export type TripPhoto = { id: string; mine: boolean; by: string; url: string; storagePath: string; at: string };

const extOf = (f: File) => (f.name.split(".").pop() || f.type.split("/")[1] || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";

/** "Day 2 · 24 Nov" inside the trip's dates, otherwise "20 Nov". */
function groupLabel(at: string, start: string | null, end: string | null) {
  const { today: date } = istNow(new Date(at));
  const { day, live } = todayDay(start, end, date);
  return live ? dayLabel(day, start) : shortDate(date);
}

/** T-4: everyone's photos, grouped by trip day (taken_at, which is the file date when uploaded). */
export function PhotoPool({ tripId, meId, start, end, photos }: { tripId: string; meId: string; start: string | null; end: string | null; photos: TripPhoto[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const shown = useRef(new Set<string>());
  useEffect(() => {
    shown.current = new Set(photos.map((p) => p.id));
  }, [photos]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`trip:${tripId}:photos`)
      .on("postgres_changes", { event: "*", schema: "public", table: "photos", filter: `trip_id=eq.${tripId}` }, () => router.refresh())
      // Realtime can't filter DELETEs (the old row only carries its id), so listen to all and refresh when one of ours goes.
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "photos" }, (payload) => {
        if (shown.current.has((payload.old as { id?: string }).id ?? "")) router.refresh();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, router]);

  async function upload(files: FileList | null) {
    const images = [...(files ?? [])].filter((f) => f.type.startsWith("image/"));
    if (!images.length) return;
    const supabase = createClient();
    let failed = 0;
    for (const [i, file] of images.entries()) {
      setProgress(`Uploading ${i + 1} of ${images.length}…`);
      const path = `${tripId}/${crypto.randomUUID()}.${extOf(file)}`;
      const { error: up } = await supabase.storage.from("photos").upload(path, file, { contentType: file.type });
      // shortcut: file date stands in for EXIF capture time (no parser dependency); add EXIF if days look wrong.
      const { error: row } = up
        ? { error: up }
        : await supabase.from("photos").insert({ trip_id: tripId, member_id: meId, storage_path: path, taken_at: new Date(file.lastModified || Date.now()).toISOString() });
      if (row && !up) await supabase.storage.from("photos").remove([path]);
      if (row) failed++;
    }
    setProgress(null);
    setError(failed ? `${failed} of ${images.length} photos didn't upload. Please try again.` : null);
    if (input.current) input.current.value = "";
    router.refresh();
  }

  async function remove(p: TripPhoto) {
    const supabase = createClient();
    const { error } = await supabase.from("photos").delete().eq("id", p.id);
    setConfirming(null);
    if (error) return setError(errorMessage(error));
    await supabase.storage.from("photos").remove([p.storagePath]);
    router.refresh();
  }

  const groups = new Map<string, TripPhoto[]>();
  for (const p of photos) {
    const label = groupLabel(p.at, start, end);
    groups.set(label, [...(groups.get(label) ?? []), p]);
  }

  return (
    <div className="grid gap-3">
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
      <Button variant="outline" className="h-11 bg-card" disabled={!!progress} onClick={() => input.current?.click()}>
        <ImagePlus aria-hidden strokeWidth={1.8} className="size-5" />
        {progress ?? "Add photos"}
      </Button>
      {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
      {photos.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-6 text-center text-muted-foreground">No photos yet. Add yours and they&apos;ll land under the right day for Trip Wrapped.</p>
      ) : (
        [...groups].map(([label, list]) => (
          <section key={label} aria-label={label} className="grid gap-1.5">
            <h3 className="text-[15px] font-bold">{label}</h3>
            <ul className="grid grid-cols-3 gap-1">
              {list.map((p) => (
                <li key={p.id} className="relative aspect-square overflow-hidden rounded-md bg-track">
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="block size-full">
                    {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed Storage URLs */}
                    <img src={p.url} alt={`Photo by ${p.by}`} loading="lazy" className="size-full object-cover" />
                  </a>
                  {p.mine &&
                    (confirming === p.id ? (
                      <span className="absolute inset-x-1 bottom-1 grid grid-cols-2 gap-1">
                        <Button className="h-11 bg-destructive px-1 text-[13px] text-white hover:bg-destructive/90" onClick={() => remove(p)}>Delete</Button>
                        <Button variant="outline" className="h-11 bg-card px-1 text-[13px]" onClick={() => setConfirming(null)}>Keep</Button>
                      </span>
                    ) : (
                      <Button aria-label="Delete this photo" className="absolute top-1 right-1 size-11 bg-ink/75 p-0 text-white hover:bg-ink" onClick={() => setConfirming(p.id)}>
                        <Trash2 aria-hidden strokeWidth={1.8} className="size-4" />
                      </Button>
                    ))}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
