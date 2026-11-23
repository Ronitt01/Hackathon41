"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { inr } from "@/lib/money";
import { loadMoney, type MoneyData } from "./data";
import { ExpenseForm } from "./expense-form";
import { ExpenseList } from "./expense-list";
import { SettleUp } from "./settle-up";
import { UpiForm } from "./upi-form";

const TABLES = ["expenses", "expense_shares", "settlements", "members"];

/** Money tab: balances, settle-up (M-5/M-6), add expense (C-4/M-3), expense list. Live across phones. */
export function MoneyTab({ tripId, meId, today, initial }: { tripId: string; meId: string | null; today: string; initial: MoneyData }) {
  const [data, setData] = useState(initial);
  const latest = useRef(0);

  const refresh = useCallback(async () => {
    const seq = ++latest.current;
    try {
      const d = await loadMoney(createClient(), tripId);
      if (seq === latest.current) setData(d); // drop responses that a newer reload overtook
    } catch {
      // keep showing the last good data; the next change retries
    }
  }, [tripId]);

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    // One saved expense fires many events (expense, shares, items, claims): reload once per burst.
    const soon = () => {
      clearTimeout(timer);
      timer = setTimeout(refresh, 150);
    };
    let channel = supabase.channel(`trip:${tripId}:money`);
    for (const table of TABLES) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table, filter: `trip_id=eq.${tripId}` }, soon);
    }
    // Realtime can't filter DELETEs (old row only has the id), so listen unfiltered; the reload goes through RLS.
    channel = channel.on("postgres_changes", { event: "DELETE", schema: "public", table: "expenses" }, soon);
    channel.subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [tripId, refresh]);

  const { members, balances } = data;
  const me = members.find((m) => m.id === meId) ?? null;
  const shown = members.filter((m) => m.status !== "dropped" || (balances[m.id] ?? 0) !== 0);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Balances</CardTitle>
          <CardDescription>Everything spent and paid back so far.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2" aria-label="Balances">
            {shown.map((m) => {
              const b = balances[m.id] ?? 0;
              return (
                <li key={m.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-3">
                  <span>
                    {m.display_name}
                    {m.id === meId && <span className="ml-1 text-muted-foreground">(you)</span>}
                  </span>
                  {b === 0 ? (
                    <span className="text-muted-foreground">settled up</span>
                  ) : (
                    <span className="text-right">
                      <span className="block text-xs text-muted-foreground">{b > 0 ? "gets back" : "owes"}</span>
                      <span className={`text-lg font-semibold ${b > 0 ? "text-emerald-700 dark:text-emerald-400" : ""}`}>{inr(Math.abs(b))}</span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <SettleUp tripId={tripId} meId={meId} data={data} onChange={refresh} />

      <Card>
        <CardHeader>
          <CardTitle>Add expense</CardTitle>
          <CardDescription>Who paid, how much, and who shares it.</CardDescription>
        </CardHeader>
        <CardContent>
          <ExpenseForm tripId={tripId} meId={meId} members={members} today={today} onChange={refresh} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpenseList expenses={data.expenses} members={members} onChange={refresh} />
        </CardContent>
      </Card>

      {me && (
        <Card>
          <CardHeader>
            <CardTitle>Your UPI ID</CardTitle>
            <CardDescription>So friends can pay you back in one tap.</CardDescription>
          </CardHeader>
          <CardContent>
            <UpiForm key={me.upi_vpa ?? ""} meId={me.id} current={me.upi_vpa} onChange={refresh} />
          </CardContent>
        </Card>
      )}
    </>
  );
}
