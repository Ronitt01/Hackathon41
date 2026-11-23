import type { SupabaseClient } from "@supabase/supabase-js";
import { vetoAllowance } from "../../lib/decisions.ts"; // relative so data.test.ts runs under node --test

export type Member = { id: string; display_name: string; status: string; role: string };
export type Option = {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  price_paise: number | null;
  image_url: string | null;
  tags: string[];
  vetoed_at: string | null;
  vetoed_by_name: string | null;
  decision_id: string | null;
};
export type Aspect = { id: string; option_id: string; label: string; value: string | null; position: number };
export type Reaction = { id: string; option_id: string; aspect_id: string | null; member_id: string; kind: "like" | "rose" };
export type Comment = { id: string; option_id: string; aspect_id: string | null; member_id: string; body: string };
export type Decision = { id: string; question: string; kind: string; deadline: string | null; locked_option_id: string | null; locked_at: string | null };

export type DecideData = {
  planId: string | null;
  members: Member[];
  options: Option[];
  aspects: Aspect[];
  reactions: Reaction[];
  comments: Comment[];
  decisions: Decision[];
  /** Options I vetoed (RLS shows only my own rows) and how many vetoes I get. */
  myVetoes: string[];
  vetoAllowance: number;
  plannedOptionIds: string[];
  /** null = RPC failed (e.g. migration 0002 not applied) → hide the badge. */
  scores: Record<string, number> | null;
  fit: Record<string, boolean | null> | null;
};

/** Everything the Decide tab shows. Works with the server or the browser client (RLS applies to both). */
export async function loadDecide(supabase: SupabaseClient, tripId: string): Promise<DecideData> {
  const [trip, members, options, aspects, reactions, comments, decisions, vetoes, scores, fit] = await Promise.all([
    supabase.from("trips").select("active_plan_id, start_date, end_date").eq("id", tripId).single(),
    supabase.from("members").select("id, display_name, status, role").eq("trip_id", tripId).order("joined_at"),
    supabase
      .from("options")
      .select("id, kind, title, description, price_paise, image_url, tags, vetoed_at, vetoed_by_name, decision_id")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false }),
    supabase.from("option_aspects").select("id, option_id, label, value, position").eq("trip_id", tripId).order("position"),
    supabase.from("reactions").select("id, option_id, aspect_id, member_id, kind").eq("trip_id", tripId).order("created_at"),
    supabase.from("comments").select("id, option_id, aspect_id, member_id, body").eq("trip_id", tripId).order("created_at"),
    supabase.from("decisions").select("id, question, kind, deadline, locked_option_id, locked_at").eq("trip_id", tripId).order("created_at"),
    supabase.from("vetoes").select("option_id").eq("trip_id", tripId),
    supabase.rpc("option_scores", { p_trip: tripId }),
    supabase.rpc("option_fit", { p_trip: tripId }),
  ]);
  const failed = [trip, members, options, aspects, reactions, comments, decisions, vetoes].find((r) => r.error);
  if (failed) throw failed.error;

  const planId: string | null = trip.data?.active_plan_id ?? null;
  let plannedOptionIds: string[] = [];
  if (planId) {
    const { data, error } = await supabase.from("stops").select("option_id").eq("plan_id", planId).not("option_id", "is", null);
    if (error) throw error;
    plannedOptionIds = data.map((s) => s.option_id as string);
  }

  return {
    planId,
    members: members.data as Member[],
    options: options.data as Option[],
    aspects: aspects.data as Aspect[],
    reactions: reactions.data as Reaction[],
    comments: comments.data as Comment[],
    decisions: decisions.data as Decision[],
    myVetoes: (vetoes.data as { option_id: string }[]).map((v) => v.option_id),
    vetoAllowance: vetoAllowance(trip.data?.start_date ?? null, trip.data?.end_date ?? null),
    plannedOptionIds,
    scores: scores.error ? null : toMap(scores.data as { option_id: string; score: number }[], "score"),
    fit: fit.error ? null : toMap(fit.data as { option_id: string; fits: boolean | null }[], "fits"),
  };
}

function toMap<R extends { option_id: string }, K extends keyof R>(rows: R[], key: K): Record<string, R[K]> {
  return Object.fromEntries(rows.map((r) => [r.option_id, r[key]]));
}

/** Reactions of one kind on an option; aspectId null = the whole option (not its aspects). */
export function reactionsOn(reactions: Reaction[], optionId: string, aspectId: string | null, kind: Reaction["kind"]) {
  return reactions.filter((r) => r.option_id === optionId && r.aspect_id === aspectId && r.kind === kind);
}
