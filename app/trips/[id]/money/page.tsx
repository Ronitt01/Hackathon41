import { MoneyTab } from "@/components/money/money-tab";
import { loadMoney, type MoneyData } from "@/components/money/data";
import { errorMessage } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export default async function MoneyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  let data: MoneyData;
  try {
    data = await loadMoney(supabase, id);
  } catch (err) {
    return <p role="alert" className="text-sm text-destructive">{errorMessage(err)}</p>;
  }
  const me = data.members.find((m) => m.user_id === auth.user?.id) ?? null;
  // Trip party is in India; a fixed zone keeps "today" right for late-night expenses.
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  return <MoneyTab tripId={id} meId={me?.id ?? null} today={today} initial={data} />;
}
