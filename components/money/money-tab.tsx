"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PaintedBoard } from "@/components/kafila/painted-board";
import { createClient } from "@/lib/supabase/client";
import { perHead } from "@/lib/dropout";
import { inr } from "@/lib/money";
import { BudgetTracker } from "./budget-tracker";
import { loadMoney, type MoneyData } from "./data";
import { ExpenseForm } from "./expense-form";
import { ExpenseList } from "./expense-list";
import { RemoveMember } from "./remove-member";
import { Rooms } from "./rooms";
import { SettleUp } from "./settle-up";
import { UpiForm } from "./upi-form";

// rooms isn't in the realtime publication; bed_assignments is, so a new split still shows up live.
const TABLES = ["expenses", "expense_shares", "settlements", "members", "bed_assignments"];

/** Money tab: my budget (M-7), balances, settle-up (M-5/M-6), add expense (C-4/M-3), expenses, rooms (M-4), dropouts (M-8). Live across phones. */
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
  const mine = meId ? (balances[meId] ?? 0) : 0;
  const allSquare = Object.values(balances).every((b) => b === 0);
  const settledUp = allSquare && data.expenses.length > 0;
  const mySpend = data.expenses.reduce((sum, e) => sum + (e.expense_shares.find((s) => s.member_id === meId)?.amount_paise ?? 0), 0);
  // M-8 for everyone: same maths as the drop route (plan's shared cost, else the room rent), from group-readable data.
  const dropped = members.filter((m) => m.status === "dropped");
  const going = members.length - dropped.length;
  const shared = data.groupCost || data.beds.reduce((s, b) => s + b.price_paise, 0);
  const dropDelta = perHead(shared, going) - perHead(shared, members.length);

  return (
    <>
      {/* Celebrate a real squaring-up only (not an empty trip). The key changes with each new expense or
          payment, so the burst fires once per genuine "all square", not on every revisit. */}
      <PaintedBoard
        note={allSquare ? "Nobody owes anything" : undefined}
        celebrate={settledUp ? `all-square-${tripId}-${data.expenses.length}-${data.settlements.length}` : undefined}
      >
        {settledUp ? "All square — paisa vasool" : allSquare ? "All square" :mine > 0 ? `You get back ${inr(mine)}` : mine < 0 ? `You owe ${inr(-mine)}` : "You're square"}
      </PaintedBoard>

      {me && <BudgetTracker tripId={tripId} spent={mySpend} budget={data.myBudget} />}

      <section aria-labelledby="balances-h" className="grid gap-2">
        <div>
          <h2 id="balances-h" className="text-[17px] leading-snug font-bold">Balances</h2>
          <p className="text-[13px] text-muted-foreground">Everything spent and paid back so far.</p>
        </div>
        <ul className="divide-y rounded-xl border bg-card px-4" aria-label="Balances">
          {shown.map((m) => {
            const b = balances[m.id] ?? 0;
            return (
              <li key={m.id} className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-3 py-3">
                <span className="min-w-0 truncate font-semibold">
                  {m.display_name}
                  {m.id === meId && <span className="ml-1 font-normal text-muted-foreground">(you)</span>}
                </span>
                {b === 0 ? (
                  <span className="col-span-2 text-[13px] text-muted-foreground">settled up</span>
                ) : (
                  <>
                    <span className="text-[13px] text-muted-foreground">{b > 0 ? "gets back" : "owes"}</span>
                    <span className={`tabular text-right font-bold ${b > 0 ? "text-truck-green-ink" : "text-truck-red"}`}>{inr(Math.abs(b))}</span>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <SettleUp tripId={tripId} meId={meId} data={data} onChange={refresh} />

      <section aria-labelledby="add-expense-h" className="grid gap-4 rounded-xl border bg-card p-4">
        <div>
          <h2 id="add-expense-h" className="text-[17px] leading-snug font-bold">Add expense</h2>
          <p className="text-[13px] text-muted-foreground">Who paid, how much, and who shares it.</p>
        </div>
        <ExpenseForm tripId={tripId} meId={meId} members={members} today={today} onChange={refresh} />
      </section>

      <section aria-labelledby="expenses-h" className="grid gap-2">
        <h2 id="expenses-h" className="text-[17px] leading-snug font-bold">Expenses</h2>
        <ExpenseList expenses={data.expenses} members={members} onChange={refresh} />
      </section>

      <Rooms tripId={tripId} meId={meId} isOrganizer={me?.role === "organizer"} data={data} onChange={refresh} />

      {dropped.length > 0 && (
        <p role="status" className="tabular text-[15px]">
          Since {dropped.map((m) => m.display_name).join(", ")} dropped out:{" "}
          <span className="font-bold">{dropDelta > 0 ? `+${inr(dropDelta)} per person` : "no change per person"}</span>
        </p>
      )}

      {me?.role === "organizer" && <RemoveMember tripId={tripId} meId={meId} members={members} onChange={refresh} />}

      {me && (
        <section aria-labelledby="upi-h" className="grid gap-2">
          <div>
            <h2 id="upi-h" className="text-[17px] leading-snug font-bold">Your UPI ID</h2>
            <p className="text-[13px] text-muted-foreground">So friends can pay you back in one tap.</p>
          </div>
          <UpiForm key={me.upi_vpa ?? ""} meId={me.id} current={me.upi_vpa} onChange={refresh} />
        </section>
      )}
    </>
  );
}
