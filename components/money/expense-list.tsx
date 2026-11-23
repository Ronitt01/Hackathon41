"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { inr } from "@/lib/money";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/supabase/auth";
import { shortDate, type Expense, type MoneyMember } from "./data";

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

  if (expenses.length === 0) return <p className="text-muted-foreground">No expenses yet — add the first one.</p>;

  return (
    <div className="grid gap-3">
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <ul className="grid gap-3" aria-label="Expenses">
        {expenses.map((e) => (
          <li key={e.id} className="grid gap-2 rounded-lg border p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{e.title}</p>
                <p className="text-xs text-muted-foreground">
                  paid by {name(e.paid_by)} · {e.category} · {shortDate(e.spent_on)}
                </p>
              </div>
              <span className="text-lg font-semibold">{inr(e.amount_paise)}</span>
            </div>
            <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground" aria-label={`Shares of ${e.title}`}>
              {e.expense_shares.map((s) => (
                <li key={s.member_id}>
                  {name(s.member_id)} {inr(s.amount_paise)}
                </li>
              ))}
            </ul>
            <Button variant="ghost" className="h-11 justify-self-end text-destructive" disabled={busy === e.id} onClick={() => remove(e)}>
              {busy === e.id ? "Deleting…" : "Delete"}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
