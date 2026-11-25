import { test } from "node:test";
import assert from "node:assert/strict";
import { autoPlanDecision, type AutoPlanState } from "./auto-plan-rules.ts";

const now = Date.parse("2026-11-26T12:00:00Z");
const before: AutoPlanState = { fair: false, people: 4, budgets: 2, planBy: "2026-11-28T12:30:00Z", lateBudget: false, pledged: false, now };

test("no plan yet: waits until everyone's budget is in", () => {
  assert.equal(autoPlanDecision(before), "wait");
  assert.equal(autoPlanDecision({ ...before, budgets: 4 }), "make");
});

test("no plan yet: the deadline makes it with whoever is in, but never for one budget", () => {
  const due = { ...before, planBy: "2026-11-26T11:00:00Z" };
  assert.equal(autoPlanDecision(due), "make");
  assert.equal(autoPlanDecision({ ...due, budgets: 1 }), "wait");
  assert.equal(autoPlanDecision({ ...before, people: 1, budgets: 1 }), "wait"); // alone: "all in" but not a group
});

test("no deadline set (or migration not run): only 'everyone is in' triggers it", () => {
  assert.equal(autoPlanDecision({ ...before, planBy: null }), "wait");
  assert.equal(autoPlanDecision({ ...before, planBy: null, budgets: 4 }), "make");
});

test("plan exists: a late budget re-makes it, unless someone already pledged", () => {
  const fair = { ...before, fair: true, budgets: 4 };
  assert.equal(autoPlanDecision(fair), "wait");
  assert.equal(autoPlanDecision({ ...fair, lateBudget: true }), "make");
  assert.equal(autoPlanDecision({ ...fair, lateBudget: true, pledged: true }), "ask_organizer");
});
