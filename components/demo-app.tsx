"use client";

// shortcut: Stage 2 + 3 PREVIEW — sample data in React state, nothing saved to Supabase.
// Replace each card with the real feature (docs/MVP.md) as it gets built.

import { useState } from "react";
import { Check, CloudRain, HeartHandshake, Info, Lock, MapPin, Siren, TriangleAlert } from "lucide-react";
import { InviteButton } from "@/components/invite-button";
import { PaintedBoard } from "@/components/kafila/painted-board";
import { ReflectorBar } from "@/components/kafila/reflector-bar";
import { Button } from "@/components/ui/button";

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
    <section className="grid gap-3 rounded-xl border bg-card p-4">
      <div className="grid gap-0.5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[17px] leading-snug font-bold">{title}</h2>
          <span className="shrink-0 text-[13px] text-muted-foreground">{tag}</span>
        </div>
        <p className="text-[13px] text-muted-foreground">{desc}</p>
      </div>
      {children}
    </section>
  );
}

// Plain rows with hairline dividers; the section's gap-3 supplies the space above each line.
const row = "flex min-h-11 items-center justify-between gap-3 border-t pt-3";
const icon = "size-5";
const secondary = "bg-card";
// Selected = the one live colour; the darker green keeps white text ≥4.5:1.
const selected = "border-truck-green-ink bg-truck-green-ink text-white hover:bg-truck-green-ink/90 hover:text-white";
const chip = "rounded-full border border-ink bg-card px-2.5 text-[13px] leading-6 font-semibold";

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
  const usedPct = (spent / 8000) * 100;

  return (
    <div className="grid gap-4">
      <p className="flex items-start gap-2 rounded-xl border bg-card px-3 py-2.5 text-[13px] text-muted-foreground">
        <Info aria-hidden strokeWidth={1.8} className="mt-px size-4 shrink-0" />
        Preview of Stage 2 + 3 with sample data. Taps work, nothing is saved.
      </p>

      <div role="tablist" aria-label="Trip sections" className="grid grid-cols-4 gap-1 rounded-xl border bg-card p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`h-11 rounded-lg text-[15px] font-semibold transition-colors ${tab === t.id ? "bg-truck-green-ink text-white" : "text-muted-foreground hover:bg-muted hover:text-ink"}`}
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
                <span className="grid min-w-0">
                  <span className="truncate font-semibold">{m}</span>
                  <span className="text-[13px] text-muted-foreground">{ROLES[m]}</span>
                </span>
                {confirmed.has(m) ? (
                  <span className="flex items-center gap-1 text-[13px] font-semibold text-truck-green-ink">
                    <Check aria-hidden strokeWidth={2.2} className="size-4" />
                    In
                  </span>
                ) : (
                  <Button variant="outline" className={secondary} onClick={() => setConfirmed(new Set(confirmed).add(m))}>
                    Pay ₹500 pledge
                  </Button>
                )}
              </div>
            ))}
            <p className="text-[13px] text-muted-foreground">The pledge counts toward your share, so it&apos;s not an extra cost. (Payment mocked.)</p>
            <InviteButton code="demo" tripName="Goa with friends" />
          </Section>

          <Section title="Parent mode" desc="A read-only itinerary link for parents. No login, can be revoked." tag="T-3">
            {parentLink === "live" ? (
              <>
                <div className={row}>
                  <span className="truncate">kafila.app/p/9f2c…e41a</span>
                  <span className="text-[13px] font-semibold text-truck-green-ink">live</span>
                </div>
                <Button variant="outline" className={secondary} onClick={() => setParentLink("revoked")}>Revoke link</Button>
              </>
            ) : (
              <Button onClick={() => setParentLink("live")}>
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
              <span className="grid min-w-0">
                <span className={`font-semibold ${o.vetoed ? "text-muted-foreground line-through" : ""}`}>{o.name}</span>
                <span className="tabular text-[13px] text-muted-foreground">{o.votes} likes</span>
              </span>
              {o.vetoed ? (
                <span className="text-[13px] text-muted-foreground">Vetoed (anonymous)</span>
              ) : (
                <Button
                  variant="outline"
                  className={secondary}
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
          <p className="tabular border-t pt-3 text-[13px] text-muted-foreground">Your vetoes left: {vetoesLeft} of 2</p>
          <Button disabled={!!locked || !leading} onClick={() => setLocked(leading?.name ?? null)}>
            {locked && <Lock aria-hidden strokeWidth={1.8} className={icon} />}
            {locked ? "Locked" : "Deadline passed: lock now"}
          </Button>
        </Section>
      )}

      {tab === "ontrip" && (
        <>
          <Section title="Day 2 plan" desc="If it rains or the group is tired, the rest of the day re-plans itself." tag="T-1">
            {(rain && replanAccepted
              ? [["10:00", "Café Bodega (indoor)"], ["13:00", "Mapusa market"], ["17:00", "Board-game café"]]
              : [["10:00", "Anjuna beach"], ["13:00", "Beach shack lunch"], ["17:00", "Chapora fort sunset"]]
            ).map(([time, what]) => (
              <div key={what} className={`${row} justify-start`}>
                <time className="tabular w-12 shrink-0 font-semibold">{time}</time>
                <span className="font-semibold">{what}</span>
              </div>
            ))}
            {!rain && (
              <Button variant="outline" className={secondary} onClick={() => setRain(true)}>
                <CloudRain aria-hidden strokeWidth={1.8} className={icon} />
                Simulate rain
              </Button>
            )}
            {rain && !replanAccepted && (
              <div className="grid gap-3 border-t pt-3">
                <p className="flex items-start gap-2">
                  <CloudRain aria-hidden strokeWidth={1.8} className="mt-0.5 size-5 shrink-0" />
                  Rain expected from 11:00. Suggested: swap the beach for a café + market plan.
                </p>
                <Button onClick={() => setReplanAccepted(true)}>Accept new plan</Button>
              </div>
            )}
          </Section>

          <Section title="Mood pulse" desc="Anonymous check-in. The group only sees totals." tag="T-2">
            <div className="grid grid-cols-5 gap-2" role="group" aria-label="Energy 1 to 5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Button
                  key={n}
                  variant="outline"
                  aria-pressed={energy === n}
                  className={`tabular ${energy === n ? selected : secondary}`}
                  onClick={() => setEnergy(n)}
                >
                  {n}
                </Button>
              ))}
            </div>
            <Button variant="outline" className={secondary} onClick={() => setBreakSignals(breakSignals + 1)}>I need a break (anonymous)</Button>
            {breakSignals > 0 && (
              <p className="flex items-center gap-2" aria-live="polite">
                <HeartHandshake aria-hidden strokeWidth={1.8} className="size-5 shrink-0 text-truck-green-ink" />
                {breakSignals === 1 ? "Someone needs" : `${breakSignals} people need`} a break
              </p>
            )}
          </Section>

          <Section title="Who brings what" desc="Claim items so nobody brings three speakers." tag="S-2">
            {packing.map((p, i) => {
              const mine = p.by.includes("Aarav");
              return (
                <div key={p.item} className={row}>
                  <span className="grid min-w-0">
                    <span className="font-semibold">{p.item}</span>
                    {p.by.length > 1 && (
                      <span className="flex items-center gap-1 text-[13px] text-destructive">
                        <TriangleAlert aria-hidden strokeWidth={1.8} className="size-4 shrink-0" />
                        {p.by.length} people bringing this
                      </span>
                    )}
                  </span>
                  <Button
                    variant="outline"
                    aria-pressed={mine}
                    className={`max-w-[55%] ${mine ? selected : secondary}`}
                    onClick={() => setPacking(packing.map((x, j) => (j === i
                      ? { ...x, by: x.by.includes("Aarav") ? x.by.filter((b) => b !== "Aarav") : [...x.by, "Aarav"] }
                      : x)))}
                  >
                    {mine && <Check aria-hidden strokeWidth={2.2} className="size-4" />}
                    <span className="truncate">{p.by.length ? p.by.join(", ") : "I'll bring it"}</span>
                  </Button>
                </div>
              );
            })}
          </Section>

          <Section title="My budget (only you see this)" desc="Your share so far against your private budget." tag="M-7">
            <div className="grid grid-cols-[1fr_auto] items-center gap-3">
              <ReflectorBar value={usedPct} label="Budget used" />
              <span className="tabular text-[13px] font-semibold">{Math.round(usedPct)}%</span>
            </div>
            <p className="tabular flex flex-wrap items-center gap-x-2">
              {inr(spent)} of {inr(8000)}
              {usedPct >= 80 && (
                <span className="flex items-center gap-1 text-[13px] font-semibold text-destructive">
                  <TriangleAlert aria-hidden strokeWidth={1.8} className="size-4" />
                  over 80%
                </span>
              )}
            </p>
            <Button variant="outline" className={secondary} onClick={() => setSpent(spent + 800)}>Add ₹800 dinner share</Button>
          </Section>

          <Section title="Safety SOS" desc="One tap sends your location to the group and emergency contacts." tag="T-5">
            <a
              href={`sms:?&body=${encodeURIComponent("SOS from Kafila: I need help. My location: https://maps.google.com/?q=15.5735,73.7407")}`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-truck-red px-4 text-[15px] font-semibold text-white hover:bg-truck-red/90"
            >
              <Siren aria-hidden strokeWidth={1.8} className={icon} />
              Send SOS
            </a>
          </Section>
        </>
      )}

      {tab === "plan" && (
        <>
          <div aria-live="polite">
            {/* key re-mounts the board so it stamps again when the verdict flips */}
            <PaintedBoard key={String(fitsEveryone)} tone={fitsEveryone ? "yellow" : "red"}>
              {fitsEveryone ? "Still fits everyone's budget" : "Now over someone's budget"}
            </PaintedBoard>
          </div>

          <Section title="Someone dropped out?" desc="Cost per head and rooms update instantly, and every private budget is re-checked." tag="M-8 · M-4">
            <div className={row}>
              <span>Cost per head</span>
              <span className="tabular text-[17px] font-bold">{inr(perHead)}</span>
            </div>
            {perHead !== basePerHead && (
              <p className="tabular text-[13px] text-muted-foreground">+{inr(perHead - basePerHead)} per person since the original plan</p>
            )}
            {!fitsEveryone && <p className="text-[13px] text-destructive">We never say whose.</p>}
            <div className="grid gap-1 border-t pt-3 text-[13px] text-muted-foreground">
              {rooms.map((r, i) => <span key={i}>Room {i + 1}: {r.join(" + ")}</span>)}
            </div>
            <div className="flex flex-wrap gap-2">
              {members.filter((m) => m !== "Aarav").map((m) => (
                <Button key={m} variant="outline" className={secondary} onClick={() => setMembers(members.filter((x) => x !== m))}>
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
              <div key={d} className={row}>
                <span className="tabular shrink-0 font-semibold">{d}</span>
                <span className="text-right text-[13px] text-muted-foreground">{why}</span>
              </div>
            ))}
          </Section>

          <Section title="Meet in the middle" desc="Pune, Delhi and Bengaluru: the fairest destination is the one with the smallest travel gap." tag="A-4">
            {([
              ["Goa", "Travel gap ₹1,100", true],
              ["Manali", "Travel gap ₹4,800", false],
              ["Pondicherry", "Travel gap ₹3,900", false],
            ] as const).map(([d, why, fairest]) => (
              <div key={d} className={row}>
                <span className="font-semibold">{d}</span>
                <span className="tabular flex items-center gap-1 text-[13px] text-muted-foreground">
                  {why}
                  {fairest && (
                    <span className="flex items-center gap-1 font-semibold text-truck-green-ink">
                      · fairest <Check aria-hidden strokeWidth={2.2} className="size-4" />
                    </span>
                  )}
                </span>
              </div>
            ))}
          </Section>

          <Section title="Split day on Day 3" desc="Two groups, one meet-up point picked for you." tag="A-3">
            <div className={`${row} justify-start`}><span className={chip}>A</span><span>Dudhsagar trek</span></div>
            <div className={`${row} justify-start`}><span className={chip}>B</span><span>Café trail, Panjim</span></div>
            <div className={row}>
              <span className="flex items-center gap-2 font-semibold">
                <MapPin aria-hidden strokeWidth={1.8} className={icon} />
                Meet at Fontainhas
              </span>
              <time className="tabular text-[13px] text-muted-foreground">18:30</time>
            </div>
          </Section>

          <Section title="Coming next" desc="Built after the core flow is done." tag="Roadmap">
            <div className="flex flex-wrap gap-2">
              {["Chat-to-plan (WhatsApp import)", "Shared photo pool", "Document vault", "Group chat", "Offline mode", "Group taste profile"].map((f) => (
                <span key={f} className={chip}>{f}</span>
              ))}
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
