import { test } from "node:test";
import assert from "node:assert/strict";
import { wrappedCards, wrappedSummary, type WrappedInput } from "./wrapped.ts";

const base: WrappedInput = {
  trip: { start_date: "2026-11-20", end_date: "2026-11-23" },
  members: [
    { id: "a", display_name: "Asha" },
    { id: "b", display_name: "Bilal" },
    { id: "c", display_name: "Chitra" },
  ],
  expenses: [
    { title: "Thalassa dinner", amount_paise: 600000, category: "food", created_by: "b" },
    { title: "Breakfast", amount_paise: 100000, category: "food", created_by: "b" },
    { title: "Villa", amount_paise: 300000, category: "stay", created_by: "a" },
  ],
  stops: [{ day: 1 }, { day: 2 }, { day: 5 }],
  options: [
    { id: "o1", title: "Butterfly Beach", created_by: "a", vetoed_at: null },
    { id: "o2", title: "Fort Aguada", created_by: "b", vetoed_at: null },
  ],
  reactions: [
    { option_id: "o1", kind: "like" },
    { option_id: "o1", kind: "like" },
    { option_id: "o1", kind: "like" },
    { option_id: "o2", kind: "rose" },
    { option_id: "o2", kind: "like" },
  ],
};

const byId = (input: WrappedInput) => Object.fromEntries(wrappedCards(input).map((c) => [c.id, c]));

test("all six cards from a full trip", () => {
  const cards = byId(base);
  assert.deepEqual(Object.keys(cards), ["total", "meal", "category", "loved", "plan", "mvp"]);
  assert.equal(cards.total.big, "₹10,000");
  assert.match(cards.total.sub, /about ₹3,333 each for 3/); // rounded to whole rupees
  assert.deepEqual([cards.meal.big, cards.meal.sub], ["₹6,000", "Thalassa dinner"]);
  assert.equal(cards.category.big, "70%");
  assert.match(cards.category.sub, /food/);
  assert.deepEqual([cards.loved.big, cards.loved.sub], ["Fort Aguada", "1 like · 1 rose"]); // 1+3 beats 3
  assert.deepEqual([cards.plan.big, cards.plan.sub], ["3 stops", "across 5 days"]); // stop on day 5 > 4-day dates
  assert.equal(cards.mvp.big, "Bilal"); // 2 expenses + 1 option
});

test("cards are skipped when their data is missing", () => {
  const cards = byId({ ...base, expenses: [], reactions: [], options: [], stops: [{ day: 1 }] });
  assert.deepEqual(Object.keys(cards), ["plan"]);
  assert.deepEqual([cards.plan.big, cards.plan.sub], ["1 stop", "across 4 days"]);
  assert.deepEqual(wrappedCards({ ...base, expenses: [], stops: [], options: [], reactions: [] }), []);
});

test("no food expenses means no priciest meal", () => {
  const cards = byId({ ...base, expenses: [{ title: "Bus", amount_paise: 5000, category: "travel", created_by: "c" }], options: [] });
  assert.equal(cards.meal, undefined);
  assert.equal(cards.category.big, "100%");
  assert.equal(cards.mvp.big, "Chitra");
});

test("money cards show whole rupees", () => {
  const cards = byId({ ...base, expenses: [{ title: "Lunch", amount_paise: 1023450, category: "food", created_by: "a" }] });
  assert.equal(cards.total.big, "₹10,235");
  assert.equal(cards.meal.big, "₹10,235");
});

test("a vetoed option is never the most loved place, but still counts for MVP", () => {
  const options = base.options.map((o) => (o.id === "o2" ? { ...o, vetoed_at: "2026-11-21T10:00:00Z" } : o));
  const cards = byId({ ...base, options });
  assert.equal(cards.loved.big, "Butterfly Beach");
  assert.equal(cards.mvp.big, "Bilal");
});

test("summary lists every card", () => {
  const text = wrappedSummary("Goa", wrappedCards(base));
  assert.match(text, /^Goa — Trip Wrapped/);
  assert.match(text, /Priciest meal: ₹6,000 \(Thalassa dinner\)/);
  assert.match(text, /Made with Kafila$/);
});
