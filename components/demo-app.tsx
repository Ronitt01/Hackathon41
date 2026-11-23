"use client";

// shortcut: Stage 2 + 3 PREVIEW — sample data in React state, nothing saved to Supabase.
// Replace each card with the real feature (docs/MVP.md) as it gets built.

import { useState } from "react";
import { InviteButton } from "@/components/invite-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const STAY_TOTAL = 12600; // shared stay cost, split per head
const PERSONAL = 5400; // travel + own spends per head
const LOWEST_PRIVATE_BUDGET = 8000; // never shown in the UI — only "fits / doesn't fit"

const ROLES: Record<string, string> = {
  Aarav: "Organizer", Meera: "Treasurer", Sana: "Food scout", Kabir: "Navigator", Rohan: "Stay hunter", Ishita: "Memory keeper",
};

type Tab = "trip" | "decide" | "ontrip" | "plan";
const TABS: { id: Tab; label: string }[] = [
  { id: "trip", label: "Trip" }, { id: "decide", label: "Decide" }, { id: "ontrip", label: "On trip" }, { id: "plan", label: "Plan" },
];

function Section({ title, desc, tag, children }: { title: string; desc: string; tag: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          {title}
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">{tag}</span>
        </CardTitle>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">{children}</CardContent>
    </Card>
  );
}

const row = "flex items-center justify-between gap-2 rounded-lg border px-3 py-2";

export function DemoApp() {
  const [tab, setTab] = useState<Tab>("trip");
  const [members, setMembers] = useState(["Aarav", "Meera", "Sana", "Kabir", "Rohan", "Ishita"]);
  const [confirmed, setConfirmed] = useState(new Set(["Aarav", "Meera", "Sana", "Rohan", "Ishita"]));
  const [parentLink, setParentLink] = useState<"none" | "live" | "revoked">("none");

  // Decide
  const [options, setOptions] = useState([
    { name: "Casa Anjuna (villa, pool)", votes: 4, vetoed: false },
    { name: "Baga Beach Hostel", votes: 3, vetoed: false },
    { name: "Palolem Huts", votes: 2, vetoed: false },
  ]);
  const [vetoesLeft, setVetoesLeft] = useState(2);
  const [locked, setLocked] = useState<string | null>(null);

  // On trip
  const [rain, setRain] = useState(false);
  const [replanAccepted, setReplanAccepted] = useState(false);
  const [energy, setEnergy] = useState<number | null>(null);
  const [breakSignals, setBreakSignals] = useState(0);
  const [packing, setPacking] = useState([
    { item: "Speaker", by: ["Rohan"] }, { item: "First-aid kit", by: [] as string[] }, { item: "Power bank", by: ["Sana"] }, { item: "Sunscreen", by: [] as string[] },
  ]);
  const [spent, setSpent] = useState(5200);

  const perHead = Math.round(STAY_TOTAL / members.length) + PERSONAL;
  const basePerHead = Math.round(STAY_TOTAL / 6) + PERSONAL;
  const fitsEveryone = perHead <= LOWEST_PRIVATE_BUDGET;
  const rooms = Array.from({ length: Math.ceil(members.length / 2) }, (_, i) => members.slice(i * 2, i * 2 + 2));
  const leading = options.filter((o) => !o.vetoed).sort((a, b) => b.votes - a.votes)[0];

  return (
    <div className="grid gap-4">
      <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
        Preview of Stage 2 + 3 with sample data. Taps work, nothing is saved.
      </p>

      <div role="tablist" aria-label="Trip sections" className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`h-10 rounded-md text-sm font-medium ${tab === t.id ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "trip" && (
        <>
          <Section title="Who's in" desc="Roles split the work so the organizer isn't doing everything." tag="S-1 · M-2">
            {members.map((m) => (
              <div key={m} className={row}>
                <span>{m} <span className="text-xs text-muted-foreground">· {ROLES[m]}</span></span>
                {confirmed.has(m) ? (
                  <span className="text-sm text-muted-foreground">In ✓</span>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setConfirmed(new Set(confirmed).add(m))}>
                    Pay ₹500 pledge
                  </Button>
                )}
              </div>
            ))}
            <p className="text-xs text-muted-foreground">The pledge counts toward your share, so it's not an extra cost. (Payment mocked.)</p>
            <InviteButton code="demo" tripName="Goa with friends" />
          </Section>

          <Section title="Parent mode" desc="A read-only itinerary link for parents. No login, can be revoked." tag="T-3">
            {parentLink === "live" ? (
              <>
                <div className={row}><span className="truncate text-sm">kafila.app/p/9f2c…e41a</span><span className="text-xs text-muted-foreground">live</span></div>
                <Button variant="outline" className="h-11" onClick={() => setParentLink("revoked")}>Revoke link</Button>
              </>
            ) : (
              <Button className="h-11" onClick={() => setParentLink("live")}>
                {parentLink === "revoked" ? "Link revoked. Create a new one" : "Create parent link"}
              </Button>
            )}
          </Section>
        </>
      )}

      {tab === "decide" && (
        <Section
          title="Where do we stay?"
          desc={locked ? `Locked: ${locked}` : "Decision locks automatically in 2h. The leading option wins."}
          tag="D-4 · D-5"
        >
          {options.map((o, i) => (
            <div key={o.name} className={row}>
              <span className={o.vetoed ? "text-muted-foreground line-through" : ""}>
                {o.name} <span className="text-xs text-muted-foreground">· {o.votes} likes</span>
              </span>
              {o.vetoed ? (
                <span className="text-xs text-muted-foreground">Vetoed (anonymous)</span>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={vetoesLeft === 0 || !!locked}
                  onClick={() => {
                    setOptions(options.map((x, j) => (j === i ? { ...x, vetoed: true } : x)));
                    setVetoesLeft(vetoesLeft - 1);
                  }}
                >
                  Veto
                </Button>
              )}
            </div>
          ))}
          <p className="text-sm text-muted-foreground">Your vetoes left: {vetoesLeft} of 2</p>
          <Button className="h-11" disabled={!!locked || !leading} onClick={() => setLocked(leading?.name ?? null)}>
            {locked ? "Locked ✓" : "Deadline passed: lock now"}
          </Button>
        </Section>
      )}

      {tab === "ontrip" && (
        <>
          <Section title="Day 2 plan" desc="If it rains or the group is tired, the rest of the day re-plans itself." tag="T-1">
            {(rain && replanAccepted
              ? ["10:00 Café Bodega (indoor)", "13:00 Mapusa market", "17:00 Board-game café"]
              : ["10:00 Anjuna beach", "13:00 Beach shack lunch", "17:00 Chapora fort sunset"]
            ).map((s) => <div key={s} className={row}>{s}</div>)}
            {!rain && <Button variant="outline" className="h-11" onClick={() => setRain(true)}>🌧 Simulate rain</Button>}
            {rain && !replanAccepted && (
              <div className="grid gap-2 rounded-lg border border-dashed p-3">
                <p className="text-sm">Rain expected from 11:00. Suggested: swap the beach for a café + market plan.</p>
                <Button className="h-11" onClick={() => setReplanAccepted(true)}>Accept new plan</Button>
              </div>
            )}
          </Section>

          <Section title="Mood pulse" desc="Anonymous check-in. The group only sees totals." tag="T-2">
            <div className="grid grid-cols-5 gap-2" role="group" aria-label="Energy 1 to 5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Button key={n} variant={energy === n ? "default" : "outline"} className="h-11" onClick={() => setEnergy(n)}>{n}</Button>
              ))}
            </div>
            <Button variant="outline" className="h-11" onClick={() => setBreakSignals(breakSignals + 1)}>I need a break (anonymous)</Button>
            {breakSignals > 0 && <p className="text-sm">🫶 {breakSignals === 1 ? "Someone needs" : `${breakSignals} people need`} a break</p>}
          </Section>

          <Section title="Who brings what" desc="Claim items so nobody brings three speakers." tag="S-2">
            {packing.map((p, i) => (
              <div key={p.item} className={row}>
                <span>
                  {p.item}
                  {p.by.length > 1 && <span className="ml-2 text-xs text-destructive">⚠ {p.by.length} people bringing this</span>}
                </span>
                <Button
                  size="sm"
                  variant={p.by.includes("Aarav") ? "default" : "outline"}
                  onClick={() => setPacking(packing.map((x, j) => (j === i
                    ? { ...x, by: x.by.includes("Aarav") ? x.by.filter((b) => b !== "Aarav") : [...x.by, "Aarav"] }
                    : x)))}
                >
                  {p.by.length ? p.by.join(", ") : "I'll bring it"}
                </Button>
              </div>
            ))}
          </Section>

          <Section title="My budget (only you see this)" desc="Your share so far against your private budget." tag="M-7">
            <div className="h-3 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round((spent / 8000) * 100)} aria-valuemin={0} aria-valuemax={100}>
              <div className={`h-full ${spent / 8000 >= 0.8 ? "bg-destructive" : "bg-primary"}`} style={{ width: `${Math.min(100, (spent / 8000) * 100)}%` }} />
            </div>
            <p className="text-sm">{inr(spent)} of {inr(8000)} {spent / 8000 >= 0.8 && "· ⚠ over 80%"}</p>
            <Button variant="outline" className="h-11" onClick={() => setSpent(spent + 800)}>Add ₹800 dinner share</Button>
          </Section>

          <Section title="Safety SOS" desc="One tap sends your location to the group and emergency contacts." tag="T-5">
            <a
              href={`sms:?&body=${encodeURIComponent("SOS from Kafila: I need help. My location: https://maps.google.com/?q=15.5735,73.7407")}`}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-destructive px-4 font-medium text-white"
            >
              🚨 Send SOS
            </a>
          </Section>
        </>
      )}

      {tab === "plan" && (
        <>
          <Section title="Someone dropped out?" desc="Cost per head and rooms update instantly, and every private budget is re-checked." tag="M-8 · M-4">
            <div className={row}><span>Cost per head</span><span className="font-medium">{inr(perHead)}</span></div>
            {perHead !== basePerHead && <p className="text-sm">+{inr(perHead - basePerHead)} per person since the original plan</p>}
            <p className={`text-sm ${fitsEveryone ? "" : "text-destructive"}`}>
              {fitsEveryone ? "Still fits everyone's budget ✓" : "Now over someone's budget ✗ (we never say whose)"}
            </p>
            <div className="grid gap-1 text-sm text-muted-foreground">
              {rooms.map((r, i) => <span key={i}>Room {i + 1}: {r.join(" + ")}</span>)}
            </div>
            <div className="flex flex-wrap gap-2">
              {members.filter((m) => m !== "Aarav").map((m) => (
                <Button key={m} size="sm" variant="outline" onClick={() => setMembers(members.filter((x) => x !== m))}>
                  Drop {m}
                </Button>
              ))}
            </div>
          </Section>

          <Section title="Best dates" desc="From everyone's busy days, long weekends and cheaper travel days." tag="D-7">
            {[
              ["12–15 Dec", "All 6 free · cheaper weekday flights"],
              ["25–28 Dec", "Christmas long weekend · 5 of 6 free"],
              ["9–12 Jan", "All 6 free · prices 18% higher"],
            ].map(([d, why]) => (
              <div key={d} className={row}><span className="font-medium">{d}</span><span className="text-right text-xs text-muted-foreground">{why}</span></div>
            ))}
          </Section>

          <Section title="Meet in the middle" desc="Pune, Delhi and Bengaluru: the fairest destination is the one with the smallest travel gap." tag="A-4">
            {[
              ["Goa", "Travel gap ₹1,100 · fairest ✓"],
              ["Manali", "Travel gap ₹4,800"],
              ["Pondicherry", "Travel gap ₹3,900"],
            ].map(([d, why]) => (
              <div key={d} className={row}><span>{d}</span><span className="text-xs text-muted-foreground">{why}</span></div>
            ))}
          </Section>

          <Section title="Split day on Day 3" desc="Two groups, one meet-up point picked for you." tag="A-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg border p-2">A: Dudhsagar trek</div>
              <div className="rounded-lg border p-2">B: Café trail, Panjim</div>
            </div>
            <div className={row}><span>📍 Meet at Fontainhas</span><span className="text-sm text-muted-foreground">18:30</span></div>
          </Section>

          <Section title="Coming next" desc="Built after the core flow is done." tag="Roadmap">
            <div className="flex flex-wrap gap-2 text-xs">
              {["Chat-to-plan (WhatsApp import)", "Shared photo pool", "Document vault", "Group chat", "Offline mode", "Group taste profile"].map((f) => (
                <span key={f} className="rounded-full border px-2 py-1">{f}</span>
              ))}
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
