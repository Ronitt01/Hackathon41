import type { SupabaseClient } from "@supabase/supabase-js";

export type MoneyMember = { id: string; user_id: string; display_name: string; status: string; upi_vpa: string | null };
export type Share = { member_id: string; amount_paise: number };
export type Expense = { id: string; title: string; amount_paise: number; category: string; spent_on: string; paid_by: string; expense_shares: Share[] };
export type Settlement = { id: string; from_member: string; to_member: string; amount_paise: number; kind: string; paid_at: string | null };
export type MoneyData = { members: MoneyMember[]; balances: Record<string, number>; expenses: Expense[]; settlements: Settlement[] };

export const CATEGORIES = ["food", "stay", "travel", "activity", "shopping", "other"] as const;

/** Everything the Money tab shows. Used by the server page and by the client on every realtime change. */
export async function loadMoney(supabase: SupabaseClient, tripId: string): Promise<MoneyData> {
  const [members, balances, expenses, settlements] = await Promise.all([
    supabase.from("members").select("id, user_id, display_name, status, upi_vpa").eq("trip_id", tripId).order("joined_at"),
    supabase.from("balances").select("member_id, balance_paise").eq("trip_id", tripId),
    supabase
      .from("expenses")
      .select("id, title, amount_paise, category, spent_on, paid_by, expense_shares(member_id, amount_paise)")
      .eq("trip_id", tripId)
      .order("spent_on", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("settlements")
      .select("id, from_member, to_member, amount_paise, kind, paid_at")
      .eq("trip_id", tripId)
      .eq("status", "paid")
      .order("paid_at", { ascending: false })
      .limit(20),
  ]);
  const error = members.error ?? balances.error ?? expenses.error ?? settlements.error;
  if (error) throw error;
  // bigint/numeric columns can arrive as strings; money maths needs exact integers
  return {
    members: members.data as MoneyMember[],
    balances: Object.fromEntries((balances.data ?? []).map((b) => [b.member_id, Number(b.balance_paise)])),
    expenses: (expenses.data as Expense[]).map((e) => ({
      ...e,
      amount_paise: Number(e.amount_paise),
      expense_shares: e.expense_shares.map((s) => ({ ...s, amount_paise: Number(s.amount_paise) })),
    })),
    settlements: (settlements.data as Settlement[]).map((s) => ({ ...s, amount_paise: Number(s.amount_paise) })),
  };
}

const dayMonth = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

/** "2026-11-23" or a timestamp → "23 Nov" (fixed time zone so server and phone render the same). */
export function shortDate(value: string): string {
  return dayMonth.format(new Date(value.length === 10 ? `${value}T12:00:00+05:30` : value));
}
