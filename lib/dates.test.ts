import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, bestWindows, dayMonth, monthCells, todayInIndia } from "./dates.ts";

test("date helpers", () => {
  assert.equal(addDays("2026-12-30", 3), "2027-01-02");
  assert.equal(dayMonth("2026-11-23"), "23 Nov");
  assert.equal(todayInIndia(Date.parse("2026-11-23T20:00:00Z")), "2026-11-24"); // 01:30 IST
  const nov = monthCells(2026, 11); // 1 Nov 2026 is a Sunday → 6 blanks in a Monday-first grid
  assert.equal(nov.filter((c) => c === null).length, 6);
  assert.equal(nov.at(-1), "2026-11-30");
  assert.equal(nov.length, 36);
});

test("bestWindows: most free members first, holidays next, never overlapping", () => {
  // Window search starts 24 Nov 2026. Member 2 is busy over Christmas.
  const ws = bestWindows({ today: "2026-11-23", length: 4, busyByMember: [[], ["2026-12-25"], []] });
  assert.equal(ws.length, 3);
  assert.ok(ws.every((w) => w.free === 3), "everyone free beats a holiday");
  assert.ok(!ws.some((w) => w.start <= "2026-12-25" && w.end >= "2026-12-25"));
  for (let i = 0; i < ws.length; i++)
    for (let j = i + 1; j < ws.length; j++) assert.ok(ws[i].end < ws[j].start || ws[i].start > ws[j].end);
  // Guru Nanak Jayanti (Tue 24 Nov) and Republic Day 2027 (Tue 26 Jan) are holidays inside the 90 days.
  assert.ok(ws[0].holidays.length > 0);
  assert.match(ws[0].reasons[0], /^All 3 free$/);
});

test("bestWindows: holiday long weekend wins; then weekdays (cheaper) win", () => {
  const ws = bestWindows({ today: "2026-12-01", length: 4, busyByMember: [[], []], horizon: 40 });
  // Christmas is Fri 25 Dec 2026: a window with Christmas and the weekend is the long weekend.
  assert.ok(ws[0].holidays.includes("Christmas") && ws[0].longWeekend);
  assert.ok(ws[0].reasons.includes("Christmas long weekend"));
  const plain = bestWindows({ today: "2027-02-01", length: 3, busyByMember: [["2027-02-02"]], horizon: 20 });
  assert.equal(plain[0].weekendDays, 0);
  assert.deepEqual(plain[0].reasons, ["You're free", "Weekdays, cheaper stays"]);
});

test("bestWindows: a holiday on a weekend is not a long weekend", () => {
  // Independence Day 2026 is a Saturday: no day off, so no long-weekend label.
  const ws = bestWindows({ today: "2026-08-13", length: 3, busyByMember: [[]], horizon: 3 });
  const w = ws.find((x) => x.holidays.includes("Independence Day"));
  assert.ok(w && !w.longWeekend);
  assert.ok(!w.reasons.some((r) => r.includes("long weekend")));
});

test("bestWindows: partial availability is reported as a count", () => {
  const busyAll = Array.from({ length: 30 }, (_, i) => addDays("2026-11-23", i + 1));
  const ws = bestWindows({ today: "2026-11-23", length: 2, busyByMember: [busyAll, []], horizon: 30 });
  assert.equal(ws[0].free, 1);
  assert.equal(ws[0].reasons[0], "1 of 2 free");
});
