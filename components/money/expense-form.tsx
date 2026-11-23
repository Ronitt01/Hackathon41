"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inr, splitEqually, toPaise } from "@/lib/money";
import { splitItems, type SplitLine } from "@/lib/split";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/supabase/auth";
import { CATEGORIES, type MoneyMember } from "./data";

type SplitType = "equal" | "unequal" | "items";
type Kind = SplitLine["kind"];
type Line = { name: string; amount: string; kind: Kind; claimers: string[] };

const SELECT = "h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base md:text-sm dark:bg-input/30";
const CHIP = "flex h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-normal has-checked:border-primary has-checked:bg-primary/10";
const SPLITS: [SplitType, string][] = [["equal", "Equally"], ["unequal", "By amount"], ["items", "By item"]];

/** C-4 add an expense; M-3 item-level split (manual lines). Shares always add up exactly to the amount. */
export function ExpenseForm(props: { tripId: string; meId: string | null; members: MoneyMember[]; today: string; onChange: () => void }) {
  const { tripId, meId, today, onChange } = props;
  const active = props.members.filter((m) => m.status !== "dropped");
  const allIds = active.map((m) => m.id);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState(active.some((m) => m.id === meId) ? meId! : "");
  const [category, setCategory] = useState("food");
  const [spentOn, setSpentOn] = useState(today);
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [excluded, setExcluded] = useState<string[]>([]); // equal split: everyone active except these
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [lines, setLines] = useState<Line[]>(() => [{ name: "", amount: "", kind: "item", claimers: allIds }]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = toPaise(amount);
  const name = (id: string) => active.find((m) => m.id === id)?.display_name ?? "Someone";
  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  // Live: what each person owes, or why we can't save yet.
  let shares: Map<string, number> | null = null;
  let problem: string | null = null;
  let remaining: number | null = null;
  try {
    if (!title.trim()) throw new Error("Add what it was for.");
    if (!total) throw new Error("Enter the amount.");
    if (splitType === "equal") {
      const ids = allIds.filter((id) => !excluded.includes(id));
      if (ids.length === 0) throw new Error("Tick who's sharing this.");
      const parts = splitEqually(total, ids.length);
      shares = new Map(ids.map((id, i) => [id, parts[i]]));
    } else if (splitType === "unequal") {
      const parsed = allIds.map((id) => [id, custom[id]?.trim() ? toPaise(custom[id]) : 0] as const);
      const bad = parsed.find(([, p]) => p === null);
      if (bad) throw new Error(`Check ${name(bad[0])}'s amount.`);
      remaining = total - parsed.reduce((a, [, p]) => a + p!, 0);
      if (remaining !== 0) throw new Error(remaining > 0 ? `${inr(remaining)} left to assign.` : `${inr(-remaining)} too much.`);
      shares = new Map(parsed as [string, number][]);
    } else {
      const parsed = lines.map((l) => ({ ...l, paise: toPaise(l.amount) }));
      const badIdx = parsed.findIndex((l) => l.paise === null || (l.kind === "item" && !l.name.trim()));
      if (badIdx >= 0) throw new Error(`Line ${badIdx + 1} needs a name and an amount.`);
      remaining = total - parsed.reduce((a, l) => a + l.paise!, 0);
      if (remaining !== 0) throw new Error(remaining > 0 ? `Lines are ${inr(remaining)} short of the total.` : `Lines are ${inr(-remaining)} over the total.`);
      shares = splitItems(parsed.map((l) => ({ amount: l.paise!, kind: l.kind, claimers: l.claimers.filter((id) => allIds.includes(id)) })));
    }
  } catch (err) {
    shares = null;
    problem = (err as Error).message;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!shares || !total) return;
    setPending(true);
    setError(null);
    const supabase = createClient();
    try {
      const { data: expense, error } = await supabase
        .from("expenses")
        .insert({ trip_id: tripId, paid_by: paidBy, title: title.trim(), amount_paise: total, category, split_type: splitType, spent_on: spentOn, created_by: meId })
        .select("id")
        .single();
      if (error) throw error;
      try {
        const rows = [...shares].filter(([, p]) => p > 0).map(([member_id, amount_paise]) => ({ expense_id: expense.id, member_id, trip_id: tripId, amount_paise }));
        const { error: sharesError } = await supabase.from("expense_shares").insert(rows);
        if (sharesError) throw sharesError;
        if (splitType === "items") {
          for (const l of lines) {
            const { data: item, error: itemError } = await supabase
              .from("expense_items")
              .insert({ trip_id: tripId, expense_id: expense.id, name: l.name.trim() || (l.kind === "tax" ? "Tax" : "Tip"), amount_paise: toPaise(l.amount), kind: l.kind })
              .select("id")
              .single();
            if (itemError) throw itemError;
            if (l.kind !== "item") continue;
            const claims = l.claimers.filter((id) => allIds.includes(id)).map((member_id) => ({ item_id: item.id, member_id, trip_id: tripId }));
            const { error: claimError } = await supabase.from("expense_item_claims").insert(claims);
            if (claimError) throw claimError;
          }
        }
      } catch (err) {
        // Never leave an expense whose shares don't add up; cascade removes any children.
        const { error: undoError } = await supabase.from("expenses").delete().eq("id", expense.id);
        if (undoError) throw new Error(`Couldn't finish saving "${title.trim()}" — please delete it from the list.`);
        throw err;
      }
      setTitle("");
      setAmount("");
      setCustom({});
      setLines([{ name: "", amount: "", kind: "item", claimers: allIds }]);
      onChange();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="exp-title">What for</Label>
        <Input id="exp-title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={80} placeholder="Dinner at Thalassa" className="h-11" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="exp-amount">Amount (₹)</Label>
          <Input id="exp-amount" value={amount} onChange={(e) => setAmount(e.target.value)} required inputMode="decimal" placeholder="2,400" className="h-11" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="exp-date">Date</Label>
          <Input id="exp-date" type="date" value={spentOn} onChange={(e) => setSpentOn(e.target.value)} required className="h-11" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="exp-paid-by">Paid by</Label>
          <select id="exp-paid-by" value={paidBy} onChange={(e) => setPaidBy(e.target.value)} required className={SELECT}>
            {!paidBy && <option value="">Pick someone</option>}
            {active.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id === meId ? `${m.display_name} (you)` : m.display_name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="exp-category">Category</Label>
          <select id="exp-category" value={category} onChange={(e) => setCategory(e.target.value)} className={`${SELECT} capitalize`}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="grid gap-3">
        <legend className="mb-2 text-sm font-medium">Split</legend>
        <div className="grid grid-cols-3 gap-2">
          {SPLITS.map(([value, label]) => (
            <Label key={value} className={`${CHIP} justify-center`}>
              <input type="radio" name="split" value={value} checked={splitType === value} onChange={() => setSplitType(value)} className="sr-only" />
              {label}
            </Label>
          ))}
        </div>

        {splitType === "equal" && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Who's sharing">
            {active.map((m) => (
              <Label key={m.id} className={CHIP}>
                <input type="checkbox" checked={!excluded.includes(m.id)} onChange={() => setExcluded((x) => toggle(x, m.id))} />
                {m.display_name}
                {shares?.get(m.id) !== undefined && <span className="text-muted-foreground">{inr(shares.get(m.id)!)}</span>}
              </Label>
            ))}
          </div>
        )}

        {splitType === "unequal" && (
          <div className="grid gap-2">
            {active.map((m) => (
              <div key={m.id} className="grid grid-cols-[1fr_8rem] items-center gap-2">
                <Label htmlFor={`exp-custom-${m.id}`}>{m.display_name}</Label>
                <Input id={`exp-custom-${m.id}`} value={custom[m.id] ?? ""} onChange={(e) => setCustom((c) => ({ ...c, [m.id]: e.target.value }))} inputMode="decimal" placeholder="0" className="h-11" />
              </div>
            ))}
          </div>
        )}

        {splitType === "items" && (
          <div className="grid gap-3">
            {lines.map((l, i) => (
              <fieldset key={i} className="grid gap-2 rounded-lg border p-3">
                <legend className="sr-only">Line {i + 1}</legend>
                <div className="grid grid-cols-[1fr_6rem] gap-2">
                  <div className="grid gap-2">
                    <Label htmlFor={`line-${i}-name`}>{l.kind === "item" ? "Item" : "Name (optional)"}</Label>
                    <Input id={`line-${i}-name`} value={l.name} onChange={(e) => setLine(i, { name: e.target.value })} placeholder={l.kind === "item" ? "Drinks" : l.kind === "tax" ? "GST" : "Tip"} className="h-11" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`line-${i}-amount`}>₹</Label>
                    <Input id={`line-${i}-amount`} value={l.amount} onChange={(e) => setLine(i, { amount: e.target.value })} inputMode="decimal" placeholder="0" className="h-11" />
                  </div>
                </div>
                <div className="grid grid-cols-[1fr_auto] items-end gap-2">
                  <div className="grid gap-2">
                    <Label htmlFor={`line-${i}-kind`}>Type</Label>
                    <select id={`line-${i}-kind`} value={l.kind} onChange={(e) => setLine(i, { kind: e.target.value as Kind })} className={SELECT}>
                      <option value="item">Item</option>
                      <option value="tax">Tax (split by what each had)</option>
                      <option value="tip">Tip (split by what each had)</option>
                    </select>
                  </div>
                  <Button type="button" variant="ghost" className="h-11" disabled={lines.length === 1} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>
                    Remove
                  </Button>
                </div>
                {l.kind === "item" && (
                  <div className="flex flex-wrap gap-2" role="group" aria-label={`Who had line ${i + 1}`}>
                    {active.map((m) => (
                      <Label key={m.id} className={CHIP}>
                        <input type="checkbox" checked={l.claimers.includes(m.id)} onChange={() => setLine(i, { claimers: toggle(l.claimers, m.id) })} />
                        {m.display_name}
                      </Label>
                    ))}
                  </div>
                )}
              </fieldset>
            ))}
            <Button type="button" variant="outline" className="h-11" onClick={() => setLines((ls) => [...ls, { name: "", amount: "", kind: "item", claimers: allIds }])}>
              Add line
            </Button>
            {shares && (
              <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground" aria-label="Each person's share">
                {[...shares].map(([id, p]) => (
                  <li key={id}>
                    {name(id)} {inr(p)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </fieldset>

      {splitType !== "equal" && total !== null && remaining === 0 && !problem && <p className="text-sm text-emerald-700 dark:text-emerald-400">All {inr(total)} assigned ✓</p>}
      {problem && <p className="text-sm text-muted-foreground" aria-live="polite">{problem}</p>}
      <Button type="submit" className="h-11" disabled={pending || !shares || !paidBy}>
        {pending ? "Saving…" : "Add expense"}
      </Button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
