"use client";

import { useState } from "react";
import { Check, ExternalLink, LocateFixed, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/supabase/auth";

export type ParentLinkRow = { id: string; token: string; share_location: boolean };

const when = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

/** T-3: my own read-only link for my parents (owner-only RLS): itinerary + opt-in location. Revocable. */
export function ParentLink({
  tripId,
  meId,
  tripName,
  initial,
  locationUpdatedAt,
}: {
  tripId: string;
  meId: string;
  tripName: string;
  initial: ParentLinkRow | null;
  locationUpdatedAt: string | null;
}) {
  const [link, setLink] = useState(initial);
  const [shared, setShared] = useState(locationUpdatedAt ? `Last shared ${when.format(new Date(locationUpdatedAt))}` : null);
  const [pending, setPending] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function step(name: string, action: () => Promise<void>) {
    setPending(name);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err));
    }
    setPending(null);
  }

  const create = () =>
    step("create", async () => {
      const { data, error } = await createClient()
        .from("parent_links")
        .insert({ trip_id: tripId, member_id: meId })
        .select("id, token, share_location")
        .single();
      if (error) throw error;
      setLink(data);
    });

  // toggle and revoke act on every live link of mine for this trip (RLS: owner only), not just the newest one loaded.
  const toggle = (on: boolean) =>
    step("toggle", async () => {
      const { error } = await createClient().from("parent_links").update({ share_location: on }).eq("trip_id", tripId).is("revoked_at", null);
      if (error) throw error;
      setLink({ ...link!, share_location: on });
    });

  const revoke = () =>
    step("revoke", async () => {
      const { error } = await createClient().from("parent_links").update({ revoked_at: new Date().toISOString() }).eq("trip_id", tripId).is("revoked_at", null);
      if (error) throw error;
      setLink(null);
      setConfirmRevoke(false);
    });

  const shareLocation = () =>
    step("locate", async () => {
      if (!navigator.geolocation) throw new Error("This phone can't share its location.");
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000 }),
      ).catch((e: GeolocationPositionError) => {
        throw new Error(e.code === 1 ? "Location is blocked. Allow it in your browser settings." : "Couldn't get your location. Try again.");
      });
      const { error } = await createClient()
        .from("locations")
        .upsert(
          { member_id: meId, trip_id: tripId, lat: pos.coords.latitude, lng: pos.coords.longitude, updated_at: new Date().toISOString() },
          { onConflict: "member_id" },
        );
      if (error) throw error;
      setShared("Shared just now");
    });

  async function share() {
    const url = `${location.origin}/p/${link!.token}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: tripName, text: `Follow my trip "${tripName}" on Kafila`, url });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      return setError("Couldn't copy. Open Preview and copy the link from there.");
    }
    setError(null);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section aria-labelledby="parent-link" className="grid gap-3 rounded-xl border bg-card p-4">
      <div className="grid gap-0.5">
        <h2 id="parent-link" className="text-[17px] font-bold">Parent link</h2>
        <p className="text-[13px] text-muted-foreground">
          A read-only page for your parents: the plan, and your location only if you turn it on. No login. Only you see this.
        </p>
      </div>

      {!link ? (
        <Button type="button" onClick={create} disabled={pending === "create"} className="h-11">
          {pending === "create" ? "Making link…" : "Make a parent link"}
        </Button>
      ) : (
        <>
          <div className="flex gap-2">
            <Button type="button" onClick={share} className="h-11 flex-1" aria-live="polite">
              {copied ? <Check aria-hidden strokeWidth={1.8} className="size-5" /> : <Share2 aria-hidden strokeWidth={1.8} className="size-5" />}
              {copied ? "Link copied" : "Send to parents"}
            </Button>
            <a
              href={`/p/${link.token}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center gap-1.5 rounded-lg border px-4 text-[15px] font-semibold hover:bg-muted"
            >
              <ExternalLink aria-hidden strokeWidth={1.8} className="size-5" />
              Preview
            </a>
          </div>

          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 py-1">
            <span>
              <span className="block font-semibold">Share my location</span>
              <span className="block text-[13px] text-muted-foreground">Only when you tap the button below. Never in the background.</span>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={link.share_location}
              disabled={pending === "toggle"}
              onChange={(e) => toggle(e.target.checked)}
              className="relative h-7 w-12 shrink-0 cursor-pointer appearance-none rounded-full border border-ink bg-track transition-colors before:absolute before:top-[2px] before:left-[2px] before:size-[22px] before:rounded-full before:border before:border-ink before:bg-white before:transition-transform checked:bg-truck-green checked:before:translate-x-5 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>

          {link.share_location && (
            <div className="grid gap-1">
              <Button type="button" variant="outline" onClick={shareLocation} disabled={pending === "locate"} className="h-11">
                <LocateFixed aria-hidden strokeWidth={1.8} className="size-5" />
                {pending === "locate" ? "Finding you…" : "Share my location now"}
              </Button>
              {shared && <p className="text-[13px] text-muted-foreground" aria-live="polite">{shared}</p>}
            </div>
          )}

          {confirmRevoke ? (
            <div className="grid gap-2 border-t pt-3">
              <p className="text-[15px]">Revoke it? The link stops working right away. You can make a new one later.</p>
              <div className="flex gap-2">
                <Button type="button" variant="destructive" onClick={revoke} disabled={pending === "revoke"} className="h-11 flex-1">
                  {pending === "revoke" ? "Revoking…" : "Yes, revoke"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setConfirmRevoke(false)} className="h-11 flex-1">Keep it</Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="ghost" onClick={() => setConfirmRevoke(true)} className="h-11 justify-self-start text-destructive">
              Revoke link
            </Button>
          )}
        </>
      )}
      {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
    </section>
  );
}
