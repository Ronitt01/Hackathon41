// A-2 fairness engine (server only: it reads every member's private budget and prefs).
// Code decides, not the LLM: keep candidates that fit EVERY budget, then maximise the least happy member.
// Weights match option_scores in supabase/migrations/0002_decide.sql.
import type { Candidate } from "./plan-candidates.ts";
import { tagLabel } from "./tags.ts";

export type FairMember = { id: string; homeCity: string | null; budgetPaise: number | null; prefs: Record<string, number> };
export type FairOption = { id: string; title: string; pricePaise: number | null; tags: string[] };
export type FairReaction = { memberId: string; optionId: string; kind: string };

export type MemberResult = { memberId: string; travelPaise: number; totalPaise: number; satisfaction: number; why: string[] };
export type Scored = { feasible: boolean; groupCostPaise: number; minSatisfaction: number; meanSatisfaction: number; members: MemberResult[] };

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const round3 = (x: number) => Math.round(x * 1000) / 1000; // plan_members.satisfaction is numeric(4,3)

/** Scores one candidate for every member: cost, budget fit, satisfaction in [0,1] and "why this works for you". */
export function scoreCandidate(c: Candidate, members: FairMember[], options: FairOption[], reactions: FairReaction[]): Scored {
  const byId = new Map(options.map((o) => [o.id, o]));
  const stay = c.stayOptionId && !c.stops.some((s) => s.optionId === c.stayOptionId) ? byId.get(c.stayOptionId) : undefined;
  const groupCostPaise = c.stops.reduce((sum, s) => sum + s.costPaise, 0) + (stay?.pricePaise ?? 0);
  const share = Math.round(groupCostPaise / Math.max(members.length, 1));
  const tags = [...new Set([...c.stops.flatMap((s) => s.tags), ...(stay?.tags ?? [])])];
  const planOptionIds = [...new Set([...c.stops.map((s) => s.optionId), c.stayOptionId])].filter((id): id is string => !!id);

  const results = members.map((m): MemberResult => {
    const travelPaise = c.travelPaiseByCity[m.homeCity ?? ""] ?? 0;
    const mine = reactions.filter((r) => r.memberId === m.id && planOptionIds.includes(r.optionId));
    const likes = mine.filter((r) => r.kind === "like");
    const roses = mine.filter((r) => r.kind === "rose");
    const prefMatch = clamp(tags.reduce((sum, t) => sum + (Number(m.prefs[t]) || 0), 0), -1, 1);
    const reactionMatch = clamp(0.25 * likes.length + 0.75 * roses.length, 0, 1);

    const why: string[] = [];
    const loved = tags.filter((t) => (Number(m.prefs[t]) || 0) > 0).sort((a, b) => m.prefs[b] - m.prefs[a]).slice(0, 2);
    if (loved.length) why.push(`${loved.map((t, i) => (i ? tagLabel(t).toLowerCase() : tagLabel(t))).join(" and ")} you love`);
    const title = (id: string) => byId.get(id)?.title ?? "a stop";
    const liked = [...new Set(likes.map((r) => r.optionId))].slice(0, 2).map(title);
    if (roses.length) why.push(`Includes ${title(roses[0].optionId)}, your Rose`);
    else if (liked.length) why.push(`Includes ${liked.join(" and ")}, which you liked`);
    if (m.budgetPaise) why.push("Fits your budget");
    if (!why.length) why.push("A fair balance for the whole group");

    return {
      memberId: m.id,
      travelPaise,
      totalPaise: travelPaise + share,
      satisfaction: round3(clamp(0.4 + 0.3 * prefMatch + 0.3 * reactionMatch, 0, 1)),
      why,
    };
  });

  const s = results.map((r) => r.satisfaction);
  return {
    feasible: results.every((r, i) => !members[i].budgetPaise || r.totalPaise <= members[i].budgetPaise!),
    groupCostPaise,
    minSatisfaction: s.length ? Math.min(...s) : 0,
    meanSatisfaction: s.length ? round3(s.reduce((a, b) => a + b, 0) / s.length) : 0,
    members: results,
  };
}

/** Maximin: among candidates that fit every budget, the highest minimum satisfaction; tie → highest mean, then earliest. Null = nothing fits. */
export function pickFairPlan(candidates: Candidate[], members: FairMember[], options: FairOption[], reactions: FairReaction[]) {
  let best: (Scored & { index: number }) | null = null;
  candidates.forEach((c, index) => {
    const s = scoreCandidate(c, members, options, reactions);
    if (!s.feasible) return;
    if (!best || s.minSatisfaction > best.minSatisfaction || (s.minSatisfaction === best.minSatisfaction && s.meanSatisfaction > best.meanSatisfaction)) {
      best = { ...s, index };
    }
  });
  return best as (Scored & { index: number }) | null;
}
