import { test } from "node:test";
import assert from "node:assert/strict";
import { pickFairPlan, scoreCandidate, type FairMember, type FairOption, type FairReaction } from "./fairness.ts";
import type { Candidate, PlanStop } from "./plan-candidates.ts";

const stop = (optionId: string | null, costPaise: number, tags: string[], day = 1): PlanStop => ({
  day, position: 0, startsAt: null, title: optionId ?? "stop", kind: "activity", costPaise, tags, optionId,
});
const plan = (stops: PlanStop[], stayOptionId: string | null = null, travelPaiseByCity: Record<string, number> = {}): Candidate => ({
  stayOptionId, stops, travelPaiseByCity,
});
const member = (id: string, prefs: Record<string, number> = {}, budgetPaise: number | null = null, homeCity: string | null = null): FairMember => ({
  id, prefs, budgetPaise, homeCity,
});
const options: FairOption[] = [
  { id: "club", title: "Tito's", pricePaise: 300000, tags: ["nightlife"] },
  { id: "beach", title: "Palolem", pricePaise: 0, tags: ["beach"] },
  { id: "cafe", title: "Artjuna", pricePaise: 60000, tags: ["cafes"] },
  { id: "casa", title: "Casa Anjuna", pricePaise: 900000, tags: ["relaxed"] },
];

test("cost = own travel + equal share of group costs; stay price counted once", () => {
  const ms = [member("a", {}, null, "Delhi"), member("b", {}, null, "Pune")];
  const s = scoreCandidate(plan([stop("cafe", 60000, [])], "casa", { Delhi: 500000 }), ms, options, []);
  assert.equal(s.groupCostPaise, 960000);
  assert.deepEqual(s.members.map((m) => [m.travelPaise, m.totalPaise]), [[500000, 980000], [0, 480000]]);
  // stay already a stop → not added again
  assert.equal(scoreCandidate(plan([stop("casa", 900000, [])], "casa"), ms, options, []).groupCostPaise, 900000);
});

test("budget filter: a happier plan over anyone's budget is never picked", () => {
  const ms = [member("meera", { nightlife: 1 }, 100000), member("raj", { nightlife: 1 }, 5000000)];
  const pricey = plan([stop("club", 600000, ["nightlife"])]); // 300000 each > Meera's 100000
  const cheap = plan([stop("beach", 100000, ["beach"])]); // 50000 each
  assert.equal(pickFairPlan([pricey, cheap], ms, options, [])?.index, 1);
  assert.equal(pickFairPlan([pricey], ms, options, []), null);
  // travel counts too
  const far = plan([stop("beach", 100000, ["beach"])], null, { Delhi: 60000 });
  assert.equal(pickFairPlan([far], [member("m", {}, 100000, "Delhi")], options, []), null);
});

test("members without a budget never block a plan", () => {
  const ms = [member("a"), member("b", {}, 1000000)];
  const r = pickFairPlan([plan([stop("club", 600000, ["nightlife"])])], ms, options, []);
  assert.equal(r?.index, 0);
  assert.ok(!r!.members[0].why.includes("Fits your budget"));
  assert.ok(r!.members[1].why.includes("Fits your budget"));
});

test("maximin beats majority: the plan with the best average loses to the one fair to the least happy", () => {
  const ms = [member("a", { nightlife: 1 }), member("b", { nightlife: 1 }), member("c", { nightlife: -1, beach: 1 })];
  const likes: FairReaction[] = [
    { memberId: "a", optionId: "club", kind: "like" },
    { memberId: "b", optionId: "club", kind: "like" },
  ];
  const party = plan([stop("club", 0, ["nightlife"])]);
  const beach = plan([stop("beach", 0, ["beach"])]);
  const sParty = scoreCandidate(party, ms, options, likes);
  const sBeach = scoreCandidate(beach, ms, options, likes);
  assert.deepEqual(sParty.members.map((m) => m.satisfaction), [0.775, 0.775, 0.1]);
  assert.deepEqual(sBeach.members.map((m) => m.satisfaction), [0.4, 0.4, 0.7]);
  assert.ok(sParty.meanSatisfaction > sBeach.meanSatisfaction);
  const r = pickFairPlan([party, beach], ms, options, likes);
  assert.equal(r?.index, 1);
  assert.equal(r?.minSatisfaction, 0.4);
});

test("ties: equal minimum → higher mean; fully equal → earliest", () => {
  const ms = [member("a", { beach: 1 }), member("b", {})];
  const plain = plan([stop("cafe", 0, ["cafes"])]); // 0.4, 0.4
  const beach = plan([stop("beach", 0, ["beach"])]); // 0.7, 0.4
  assert.equal(pickFairPlan([plain, beach], ms, options, [])?.index, 1);
  assert.equal(pickFairPlan([plain, plain], ms, options, [])?.index, 0);
});

test("satisfaction stays within [0, 1] and reactions cap at 1", () => {
  const ms = [member("a", { beach: 1, cafes: 1 }), member("b", { beach: -1, cafes: -1 })];
  const rx: FairReaction[] = [
    { memberId: "a", optionId: "beach", kind: "rose" },
    { memberId: "a", optionId: "cafe", kind: "like" },
    { memberId: "a", optionId: "cafe", kind: "like" },
  ];
  const s = scoreCandidate(plan([stop("beach", 0, ["beach"]), stop("cafe", 0, ["cafes"])]), ms, options, rx);
  assert.deepEqual(s.members.map((m) => m.satisfaction), [1, 0.1]);
});

test("why lines: loved tags, their Rose, budget", () => {
  const ms = [member("meera", { cafes: 1, beach: 1, nightlife: -1 }, 2000000), member("raj", { nightlife: 1 })];
  const rx: FairReaction[] = [
    { memberId: "meera", optionId: "casa", kind: "rose" },
    { memberId: "raj", optionId: "cafe", kind: "like" },
    { memberId: "raj", optionId: "beach", kind: "like" },
  ];
  const c = plan([stop("cafe", 60000, ["cafes"]), stop("beach", 0, ["beach"])], "casa");
  const [meera, raj] = scoreCandidate(c, ms, options, rx).members;
  assert.equal(meera.why.join(" · "), "Cafés and beaches you love · Includes Casa Anjuna, your Rose · Fits your budget");
  assert.deepEqual(raj.why, ["Includes Artjuna and Palolem, which you liked"]);
  assert.deepEqual(scoreCandidate(c, [member("x")], options, []).members[0].why, ["A fair balance for the whole group"]);
});
