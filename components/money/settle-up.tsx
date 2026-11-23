"use client";

import { useState } from "react";
import { ArrowRight, Check, Smartphone } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useToast } from "@/components/kafila/toast";
import { success, tap } from "@/lib/haptics";
import { inr } from "@/lib/money";
import { minimiseTransfers, type Transfer } from "@/lib/settle";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/supabase/auth";
import { isValidVpa, upiLink } from "@/lib/upi";
import { shortDate, type MoneyData } from "./data";

/** M-5 fewest payments to square up, M-6 pay by UPI, then record it. */
export function SettleUp({ tripId, meId, data, onChange }: { tripId: string; meId: string | null; data: MoneyData; onChange: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The row just paid, tied to the data it was paid against: the next refresh retires it on its own.
  const [paid, setPaid] = useState<{ key: string; data: MoneyData } | null>(null);
  const toast = useToast();
  const member = (id: string) => data.members.find((m) => m.id === id);
  const name = (id: string) => (id === meId ? "You" : (member(id)?.display_name ?? "Someone"));

  let transfers: Transfer[] = [];
  let updating = false;
  try {
    transfers = minimiseTransfers(Object.entries(data.balances).map(([id, balance]) => ({ id, balance })));
  } catch {
    updating = true; // caught mid-write (expense saved, shares not yet); the next realtime refresh fixes it
  }

  async function record(t: Transfer) {
    if (!confirm(`Record that ${name(t.from)} paid ${name(t.to)} ${inr(t.amount)}?`)) return;
    const key = `${t.from}>${t.to}`;
    setBusy(key);
    setError(null);
    const { error } = await createClient().from("settlements").insert({
      trip_id: tripId,
      from_member: t.from,
      to_member: t.to,
      amount_paise: t.amount,
      kind: "settle",
      status: "paid",
      paid_at: new Date().toISOString(),
    });
    setBusy(null);
    if (error) return setError(errorMessage(error));
    setPaid({ key, data });
    success();
    toast("Marked paid. One less thing to chase.", { tone: "success" });
    onChange();
  }

  return (
    <section aria-labelledby="settle-h" className="grid gap-2">
      <div>
        <h2 id="settle-h" className="text-[17px] leading-snug font-bold">Settle up</h2>
        <p className="text-[13px] text-muted-foreground">The fewest payments to square everyone up.</p>
      </div>
      {updating ? (
        <p className="text-muted-foreground" aria-live="polite">Balances are updating…</p>
      ) : transfers.length === 0 ? (
        <p className="text-muted-foreground">Nothing to settle right now.</p>
      ) : (
        <ul className="divide-y rounded-xl border bg-card px-4" aria-label="Suggested payments">
          {transfers.map((t) => {
            const payee = member(t.to);
            const vpa = payee?.upi_vpa?.trim() ?? "";
            const key = `${t.from}>${t.to}`;
            const mine = t.from === meId || t.to === meId;
            const done = paid?.key === key && paid.data === data;
            return (
              <li key={key} className={`grid gap-3 py-3 transition-opacity duration-300 ${done ? "opacity-60" : ""}`}>
                <p className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0">
                    <span className="font-semibold">{name(t.from)}</span> {t.from === meId ? "pay" : "pays"}{" "}
                    <span className="font-semibold">{name(t.to)}</span>
                  </span>
                  <span className="tabular shrink-0 font-bold">{inr(t.amount)}</span>
                </p>
                {mine && (
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-2">
                    {t.from === meId &&
                      (isValidVpa(vpa) ? (
                        <a href={upiLink({ vpa, name: payee!.display_name, amountPaise: t.amount, note: "Kafila trip settle-up" })} onClick={tap} className={buttonVariants({ className: "press w-full" })}>
                          <Smartphone aria-hidden strokeWidth={1.8} className="size-[18px]" />
                          Pay {inr(t.amount)} with UPI
                        </a>
                      ) : (
                        <p className="self-center text-[13px] text-muted-foreground">Ask {name(t.to)} to add their UPI ID.</p>
                      ))}
                    <Button variant="outline" className="press w-full bg-card" disabled={busy === key || done} onClick={() => record(t)}>
                      {/* Remounts when paid so the tick draws itself in left to right (the tape-fill wipe; off under reduced motion). */}
                      <Check
                        key={done ? "done" : "idle"}
                        aria-hidden
                        strokeWidth={done ? 3 : 1.8}
                        className={done ? "tape-fill size-[18px] text-truck-green-ink" : "size-[18px]"}
                        style={done ? { animationDuration: "400ms" } : undefined} // .tape-fill is unlayered, so a utility can't retime it
                      />
                      {done ? "Paid" : busy === key ? "Saving…" : t.from === meId ? "Mark as paid" : "Mark as received"}
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}

      {data.settlements.length > 0 && (
        <div className="mt-2 grid gap-1">
          <h3 className="text-[15px] font-bold">Recent payments</h3>
          <ul className="divide-y text-[15px]" aria-label="Recent payments">
            {data.settlements.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  {name(s.from_member)}
                  <ArrowRight aria-hidden strokeWidth={1.8} className="size-4 shrink-0 text-muted-foreground" />
                  <span className="sr-only">paid</span>
                  {name(s.to_member)}
                  {s.kind === "pledge" && <span className="text-muted-foreground"> (pledge)</span>}
                </span>
                <span className="tabular shrink-0 text-[13px] text-muted-foreground">
                  {inr(s.amount_paise)}
                  {s.paid_at && ` · ${shortDate(s.paid_at)}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
