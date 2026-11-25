import { test } from "node:test";
import assert from "node:assert/strict";
import { pickStep } from "./next-step.ts";

const base = { tripId: "t", isOrganizer: false, people: 4, hasBudget: true, budgetsIn: 2, planReady: false, options: 5, reacted: true };

test("no budget yet always comes first, even once the plan is ready", () => {
  assert.equal(pickStep({ ...base, hasBudget: false, planReady: true }).href, "/trips/t/decide/me");
});

test("a ready plan points everyone to it", () => {
  assert.equal(pickStep({ ...base, planReady: true }).href, "/trips/t/plan");
});

test("organizer alone is told to invite; with 2+ budgets in, to make the plan", () => {
  assert.equal(pickStep({ ...base, isOrganizer: true, people: 1, budgetsIn: 1 }).title, "Bring your friends in");
  const make = pickStep({ ...base, isOrganizer: true, budgetsIn: 2 });
  assert.equal(make.title, "Make the fair plan");
  assert.match(make.text, /2 of 4 budgets in/);
  assert.match(pickStep({ ...base, isOrganizer: true, budgetsIn: 4 }).text, /Everyone's ready/);
});

test("a friend with a budget who hasn't reacted is sent to the ideas; otherwise waits", () => {
  assert.equal(pickStep({ ...base, reacted: false }).title, "React to 5 ideas");
  assert.equal(pickStep({ ...base, reacted: false, options: 1 }).title, "React to 1 idea");
  const wait = pickStep(base);
  assert.equal(wait.title, "Waiting on the group");
  assert.equal(wait.href, undefined);
});

test("no server key: no budget count shown, never 'null of 4'", () => {
  assert.doesNotMatch(pickStep({ ...base, budgetsIn: null }).text, /null/);
});

test("the deadline shows in the waiting and make-it texts; a late budget after pledges asks the organizer", () => {
  assert.match(pickStep({ ...base, planByLabel: "Fri, 28 Nov" }).text, /made Fri, 28 Nov, with or without everyone/);
  assert.match(pickStep({ ...base, isOrganizer: true, planByLabel: "Fri, 28 Nov" }).text, /Kafila makes it Fri, 28 Nov/);
  assert.equal(pickStep({ ...base, isOrganizer: true, planReady: true, askReplan: true }).title, "A new budget came in");
  assert.equal(pickStep({ ...base, planReady: true, askReplan: true }).title, "The fair plan is ready"); // friends aren't asked
});
