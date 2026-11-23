"use client";

import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    if (error) setError(errorMessage(error));
    else onChange();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Settle up</CardTitle>
        <CardDescription>The fewest payments to square everyone up.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {updating ? (
          <p className="text-muted-foreground">Balances are updating…</p>
        ) : transfers.length === 0 ? (
          <p className="text-muted-foreground">All square — nobody owes anything.</p>
        ) : (
          <ul className="grid gap-3" aria-label="Suggested payments">
            {transfers.map((t) => {
              const payee = member(t.to);
              const vpa = payee?.upi_vpa?.trim() ?? "";
              const key = `${t.from}>${t.to}`;
              return (
                <li key={key} className="grid gap-3 rounded-lg border p-3">
                  <p>
                    <span className="font-medium">{name(t.from)}</span> {t.from === meId ? "pay" : "pays"}{" "}
                    <span className="font-medium">{name(t.to)}</span>{" "}
                    <span className="text-lg font-semibold">{inr(t.amount)}</span>
                  </p>
                  {t.from === meId &&
                    (isValidVpa(vpa) ? (
                      <a
                        href={upiLink({ vpa, name: payee!.display_name, amountPaise: t.amount, note: "Kafila trip settle-up" })}
                        className={buttonVariants({ className: "h-11 w-full text-base" })}
                      >
                        Pay {inr(t.amount)} with UPI
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground">Ask {name(t.to)} to add their UPI ID.</p>
                    ))}
                  {(t.from === meId || t.to === meId) && (
                    <Button variant="outline" className="h-11 w-full" disabled={busy === key} onClick={() => record(t)}>
                      {busy === key ? "Saving…" : t.from === meId ? "Mark as paid" : "Mark as received"}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

        {data.settlements.length > 0 && (
          <div className="grid gap-2">
            <h3 className="text-sm font-medium">Recent payments</h3>
            <ul className="grid gap-1 text-sm" aria-label="Recent payments">
              {data.settlements.map((s) => (
                <li key={s.id} className="flex justify-between gap-3">
                  <span>
                    {name(s.from_member)} → {name(s.to_member)}
                    {s.kind === "pledge" && <span className="text-muted-foreground"> (pledge)</span>}
                  </span>
                  <span className="text-muted-foreground">
                    {inr(s.amount_paise)}
                    {s.paid_at && ` · ${shortDate(s.paid_at)}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
