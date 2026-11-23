"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { canonicalCity, DESTINATIONS, fairestDestinations, HOME_CITIES } from "@/lib/meet-middle";
import { inr } from "@/lib/money";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/supabase/auth";

/**
 * A-4: each member picks a home city; destinations are ranked by the travel gap between the cheapest and the
 * dearest trip to get there. Only aggregates are shown, never who pays what.
 */
export function MeetMiddle({ myMemberId, myCity, otherCities }: { myMemberId: string; myCity: string | null; otherCities: (string | null)[] }) {
  const router = useRouter();
  const [city, setCity] = useState(canonicalCity(myCity) ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cities = [city || null, ...otherCities];
  const known = cities.filter((c) => canonicalCity(c)).length;
  const top = fairestDestinations(cities);

  async function save(next: string) {
    setCity(next);
    setError(null);
    setStatus("Saving…");
    const { error } = await createClient().from("members").update({ home_city: next || null }).eq("id", myMemberId);
    if (error) {
      setStatus(null);
      return setError(errorMessage(error));
    }
    setStatus("Saved");
    router.refresh();
  }

  return (
    <section className="grid gap-3" aria-labelledby="meet-middle">
      <div>
        <h2 id="meet-middle" className="text-[17px] leading-snug font-bold">Meet in the middle</h2>
        <p className="text-[13px] text-muted-foreground">Places that cost everyone about the same to reach.</p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="home-city">Your home city</Label>
        <select
          id="home-city"
          value={city}
          onChange={(e) => save(e.target.value)}
          aria-describedby="home-city-status"
          className="h-11 rounded-lg border border-input bg-card px-2.5"
        >
          <option value="">Not set</option>
          {HOME_CITIES.map((c) => (
            <option key={c.name} value={c.name}>{c.name}</option>
          ))}
        </select>
        <p id="home-city-status" aria-live="polite" className="text-[13px] text-muted-foreground">
          {status ?? `${known} of ${cities.length} ${cities.length === 1 ? "person has" : "people have"} set a home city.`}
        </p>
        {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
      </div>

      {top.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">Pick your home city and ask the group to do the same to see which places are fairest to reach.</p>
      ) : (
        <>
          <ol className="grid">
            {top.map((d, i) => (
              <li
                key={d.destination}
                style={{ animationDelay: `${i * 60}ms` }}
                className="grid gap-0.5 border-t py-2 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 fill-mode-backwards duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
              >
                <p className="flex items-baseline justify-between gap-2">
                  <span className="flex flex-wrap items-center gap-x-2 font-semibold">
                    {d.destination}
                    {i === 0 && <span className="-rotate-3 rounded-sm bg-truck-green-ink px-1.5 text-[13px] leading-5 font-bold text-white">Best pick</span>}
                  </span>
                  <span className="tabular text-[13px] font-semibold text-muted-foreground">Travel gap {inr(d.spreadPaise)}</span>
                </p>
                {i === 0 ? (
                  <p className="text-[13px] text-muted-foreground">
                    {known > 1
                      ? `Everyone pays ${d.minPaise === d.maxPaise ? `about ${inr(d.minPaise)}` : `between ${inr(d.minPaise)} and ${inr(d.maxPaise)}`} one way to get here: the smallest gap of the ${DESTINATIONS.length} places we compared.`
                      : `About ${inr(d.meanPaise)} one way from your city. Fairness shows once more friends set theirs.`}
                  </p>
                ) : (
                  <p className="tabular text-[13px] text-muted-foreground">About {inr(d.meanPaise)} one way on average</p>
                )}
              </li>
            ))}
          </ol>
          <p className="text-[13px] text-muted-foreground">Fares are approximate budget train or bus prices, one way per person.</p>
        </>
      )}
    </section>
  );
}
