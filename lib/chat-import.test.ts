import { test } from "node:test";
import assert from "node:assert/strict";
import { extractKeywords, parseChat, parseProposals } from "./chat-import.ts";

const ANDROID = `23/11/26, 9:01 pm - Messages and calls are end-to-end encrypted. No one outside of this chat can read them.
23/11/26, 9:02 pm - Rahul Sharma added Priya
23/11/26, 9:03 pm - Rahul Sharma: Goa or Gokarna for 12-15 Dec?
23/11/26, 9:04 pm - Priya: Gokarna!! budget max 10k
pls, and a trek
23/11/26, 9:05 pm - Priya: <Media omitted>
23/11/26, 9:06 pm - Aman: @Rahul call me on +91 98765 43210, Gokarna has scuba too
23/11/26, 9:07 pm - Aman: ₹6,000 is my limit`;

const IOS = `[23/11/26, 9:03:10 PM] Rahul: Manali in Jan 3 to 6?
‎[23/11/26, 9:04:00 PM] Priya: ‎image omitted`;

test("parseChat drops timestamps, names, system lines, media, mentions and phone numbers", () => {
  assert.deepEqual(parseChat(ANDROID), [
    "Goa or Gokarna for 12-15 Dec?",
    "Gokarna!! budget max 10k",
    "pls, and a trek",
    "call me on , Gokarna has scuba too",
    "₹6,000 is my limit",
  ]);
  assert.deepEqual(parseChat(IOS), ["Manali in Jan 3 to 6?"]);
  const joined = parseChat(ANDROID).join(" ");
  for (const secret of ["Rahul", "Priya", "Aman", "98765"]) assert.ok(!joined.includes(secret), secret);
});

test("parseChat strips a Name: prefix from pasted lines without timestamps", () => {
  assert.deepEqual(parseChat("Rahul: Goa?\n\nPriya: yes"), ["Goa?", "yes"]);
});

test("parseChat handles messages copied from WhatsApp (time first)", () => {
  const got = parseChat("[11:32 am, 24/11/2026] Rahul Sharma: Goa in Dec?\n[11:33 am, 24/11/2026] Priya: lets go at 10:30");
  assert.deepEqual(got, ["Goa in Dec?", "lets go at 10:30"]);
});

test("parseChat keeps times in pasted text and drops a leading [stamp]", () => {
  assert.deepEqual(parseChat("lets go at 10:30\n[odd stamp] Rahul Sharma: ok"), ["lets go at 10:30", "ok"]);
});

test("parseChat removes isolate-wrapped @mentions", () => {
  const got = parseChat("23/11/26, 9:06 pm - Aman: @⁨Rahul Sharma⁩ Goa?");
  assert.deepEqual(got, ["Goa?"]);
});

test("extractKeywords finds places by mentions, activities, date ranges and one budget range", () => {
  const got = extractKeywords(parseChat(ANDROID).concat(parseChat(IOS)));
  const titles = got.map((p) => p.title);
  assert.equal(titles[0], "Gokarna"); // 3 mentions beat Goa's 1
  assert.ok(titles.includes("Goa") && titles.includes("Manali"));
  assert.ok(titles.includes("Trek") && titles.includes("Scuba or snorkelling"));
  assert.ok(titles.includes("Dates: 12–15 Dec") && titles.includes("Dates: 3–6 Jan"));
  assert.ok(titles.includes("Budget: ₹6,000–₹10,000"), titles.join(" | "));
  assert.deepEqual(got.find((p) => p.title === "Gokarna")?.tags, ["beach", "relaxed"]);
});

test("extractKeywords returns nothing for small talk", () => {
  assert.deepEqual(extractKeywords(["hi", "kya scene hai"]), []);
});

test("parseProposals validates kinds, tags, titles and duplicates", () => {
  const got = parseProposals({
    proposals: [
      { kind: "destination", title: " Goa ", tags: ["beach", "made-up"] },
      { kind: "spaceship", title: "Dates: 12–15 Dec", tags: [] },
      { kind: "activity", title: "goa", tags: [] },
      { kind: "activity", title: "", tags: [] },
    ],
  });
  assert.deepEqual(got, [
    { kind: "destination", title: "Goa", tags: ["beach"] },
    { kind: "other", title: "Dates: 12–15 Dec", tags: [] },
  ]);
  assert.deepEqual(parseProposals(null), []);
});
