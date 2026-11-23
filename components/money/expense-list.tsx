"use client";

import { useState } from "react";
import { BedDouble, Bus, ChevronDown, Receipt, ShoppingBag, Ticket, Trash2, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inr } from "@/lib/money";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/supabase/auth";
import { shortDate, type Expense, type MoneyMember } from "./data";

const ICONS: Record<string, LucideIcon> = { food: UtensilsCrossed, stay: BedDouble, travel: Bus, activity: Ticket, shopping: ShoppingBag, other: Receipt };

export function ExpenseList({ expenses, members, onChange }: { expenses: Expense[]; members: MoneyMember[]; onChange: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const name = (id: string) => members.find((m) => m.id === id)?.display_name ?? "Someone";

  async function remove(e: Expense) {
    if (!confirm(`Delete "${e.title}" (${inr(e.amount_paise)})? This can't be undone.`)) return;
    setBusy(e.id);
    setError(null);
    const { error } = await createClient().from("expenses").delete().eq("id", e.id);
    setBusy(null);
    if (error) setError(errorMessage(error));
    else onChange();
  }

  if (expenses.length === 0) return <p className="text-[15px] text-muted-foreground">No expenses yet — add the first one.</p>;

  return (
    <div className="grid gap-2">
      {error && <p role="alert" className="text-[13px] text-destructive">{error}</p>}
      <ul className="divide-y rounded-xl border bg-card px-4" aria-label="Expenses">
        {expenses.map((e) => {
          const Icon = ICONS[e.category] ?? Receipt;
          return (
            <li key={e.id}>
              <details className="group">
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 py-3 [&::-webkit-details-marker]:hidden">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-track">
                    <Icon aria-hidden strokeWidth={1.8} className="size-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">{e.title}</span>
                    <span className="block text-[13px] text-muted-foreground">
                      paid by {name(e.paid_by)} · {e.category} · {shortDate(e.spent_on)}
                    </span>
                  </span>
                  <span className="tabular shrink-0 text-[15px] font-bold">{inr(e.amount_paise)}</span>
                  <ChevronDown aria-hidden strokeWidth={1.8} className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="flex items-end justify-between gap-3 pb-3 pl-12">
                  <ul className="grid gap-0.5 text-[13px] text-muted-foreground" aria-label={`Shares of ${e.title}`}>
                    {e.expense_shares.map((s) => (
                      <li key={s.member_id}>
                        {name(s.member_id)} <span className="tabular">{inr(s.amount_paise)}</span>
                      </li>
                    ))}
                  </ul>
                  <Button variant="ghost" className="h-11 shrink-0 text-truck-red" disabled={busy === e.id} onClick={() => remove(e)}>
                    <Trash2 aria-hidden strokeWidth={1.8} className="size-[18px]" />
                    {busy === e.id ? "Deleting…" : "Delete"}
                  </Button>
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
