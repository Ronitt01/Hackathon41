# PRD: Kafila (working name) — Group Travel Planning Platform

> *Kafila* means "a caravan, a group travelling together." The name is a placeholder; see Open Issues.

| | |
|---|---|
| **Product** | Kafila — group trip planning that handles the people, not just the logistics |
| **Context** | 7-day hackathon |
| **Team** | _[add names and roles]_ |
| **Status** | Draft v0.1 |
| **Last updated** | 20 Nov 2026 |

---

## 1. Change history

| Version | Date | Author | Change |
|---|---|---|---|
| 0.1 | 20 Nov 2026 | _[name]_ | First draft from brainstorm and competitor analysis |

---

## 2. Overview

### 2.1 Problem statement (as given)
Friends plan trips together, build itineraries, compare accommodation and split expenses. AI generates optimized travel plans based on everyone's budget and preferences.

### 2.2 The real problem
Group trips rarely fail on logistics. They fail on **group dynamics**:

- People don't admit their budget is lower, so the plan ends up too expensive for someone.
- "Anything works" turns into complaints later, because quiet preferences never get heard.
- One person ends up doing all the planning.
- People say "80% coming" and then drop out, which breaks the room split and the per-head cost.
- Splitting money is awkward and unfair: the non-drinker pays for the beer, and whoever got the best room pays the same as everyone else.
- Plans are discussed in a 400-message WhatsApp chat and nobody can find what was decided.
- Students often run short of money right when it's time to book.

### 2.3 Our solution
Kafila does the four basics (collaborative itinerary, accommodation comparison, expense splitting, AI planning) and builds on top of them a layer **for fairness and group dynamics**:

1. **Private budgets + fairness-first AI.** Everyone's budget stays private. The AI builds a plan where *nobody's* satisfaction drops below a floor, and tells each person why the plan works for them.
2. **Hinge-style voting.** People react to *specific parts* of an option, not just thumbs up/down, which gives the AI much richer signals.
3. **Trip Jar.** An SIP-style personal savings goal for each trip, so everyone can afford it by booking day.
4. **Fair money.** Item-level splits, fair room pricing, minimum-transaction settle-up with one-tap UPI.
5. **Trip Wrapped.** A shareable, Spotify Wrapped-style recap at the end.

### 2.4 Objectives
- **For the hackathon:** demo a single end-to-end story (create trip → decide → plan → save → travel → settle → recap) whose differentiators are clearly ones no competitor offers.
- **For users:** fewer arguments, fewer dropouts, no awkward money talk, and less work for the person who usually organizes.

---

## 3. Success metrics

### 3.1 Hackathon (demo-day) metrics
| Metric | Target |
|---|---|
| End-to-end demo flow works live without a crash | 100% of the P0 flow |
| Features in the demo that the 21 competitors don't offer | ≥ 4 |
| Time to produce an AI group plan from preferences | < 20 seconds |
| A judge can follow the story without explanation | Pitch ≤ 5 minutes, demo ≤ 3 minutes |

### 3.2 Product metrics (post-hackathon)
| Metric | Definition | Target (directional) |
|---|---|---|
| Decision time | Trip created → itinerary locked | 50% faster than WhatsApp-only planning |
| Participation | % of members who vote at least once | ≥ 80% |
| Dropout rate | Members who confirmed but didn't travel | < 10% (with commitment pledge) |
| Fairness score | Lowest member satisfaction in the final plan | ≥ 0.6 on a 0–1 scale |
| Jar completion | % of members who hit their savings goal by booking date | ≥ 70% |
| Settle-up speed | Trip end → all balances cleared | < 3 days |
| Virality | % of trips where Trip Wrapped gets shared | ≥ 30% |

---

## 4. Messaging

**Tagline options**
- "Plan the trip, not the drama."
- "Everyone in. Nobody left out."
- "The group trip app that's fair to everyone."

**Positioning statement**
> For friend groups planning trips together, Kafila is the trip planner that handles the *people* problems: hidden budgets, unheard preferences, flaky friends and awkward money. Other apps only organize the logistics. Kafila makes the plan fair for everyone.

**Positioning against competitors**
- *Wanderlog / Plan Harmony / WePlanify:* they help a group organize a trip; we help a group **agree** on one.
- *Splitwise / YatraYaar:* they split money after the trip; we help people **save before** it and split **fairly** during it.
- *WhatsApp:* we don't replace your group chat; we **turn it into a plan** (Chat-to-plan).

---

## 5. Timeline / release planning (7-day hackathon)

| Day | Focus | Output |
|---|---|---|
| **Day 1** | Scope lock, design system, data model, repo setup, auth | Wireframes for P0 screens, DB schema, deployed skeleton |
| **Day 2** | Trip creation, invites, preference + private budget input, Hinge-style voting | Members can join a trip and react to options |
| **Day 3** | AI planning engine (fairness scoring), itinerary view, accommodation comparison | AI generates a group plan with per-person explanations |
| **Day 4** | Expenses: item-level splits, debt minimisation, UPI deep links; Trip Jar | Money flows work end to end (payments mocked where needed) |
| **Day 5** | P1 features (pick by team capacity): Chat-to-plan, dropout recalculator, parent mode, veto tokens | 2–4 P1 features shipped |
| **Day 6** | Trip Wrapped, polish, seed demo data, bug bash | Demo trip fully populated |
| **Day 7** | Pitch deck, demo rehearsal, backup video recording | Final submission |

**Rule:** P0 is frozen at the end of Day 1. Nothing new goes into P0 after that, and P1 work starts only once P0 runs end to end.

---

## 6. Personas

### 6.1 Aarav — "The Organizer" (21, engineering student, Pune)
Always ends up planning. Tired of chasing people for dates, budgets and money.
**Needs:** to share the planning work, get fast decisions and get paid back without chasing anyone.
**Key features:** Trip roles, deadlock breaker, commitment pledge, debt-minimised settle-up.

### 6.2 Meera — "The Quiet Budget" (20, student on a tight allowance, Delhi)
Wants to go but can't afford what the louder friends suggest, and won't say so in the group.
**Needs:** a plan within her budget without having to announce it, and a way to save up.
**Key features:** Private budget input, Trip Jar, fairness-first AI, private live budget tracker.

### 6.3 Kabir — "The Maybe" (22, intern, Bengaluru)
Says "I'm in" and then isn't sure. Has a different free-time schedule from everyone else.
**Needs:** clear commitment points and dates that work for him.
**Key features:** Commitment pledge, smart date finder, dropout recalculator.

### 6.4 Sana — "The Specific One" (21, design student, Mumbai)
Has strong preferences (veg food, no early mornings, loves cafés) that get lost in group decisions.
**Needs:** her preferences to actually show up in the plan.
**Key features:** Hinge-style voting, fairness-first AI with "why this works for you," split days.

### 6.5 Secondary persona: Parents
They want to know where their kid is and what the plan is, without calling every few hours.
**Key feature:** Parent mode.

---

## 7. User scenarios

**Scenario A — Planning a Goa trip (core demo story)**
Six friends from three cities want a 4-day trip in December. Aarav creates the trip and pastes in their WhatsApp chat export. Kafila pulls out the three destinations people mentioned and the rough dates. Everyone fills in preferences and a **private** budget. Meera's ₹8,000 is the lowest, but nobody sees that. Everyone swipes through stays and activities Hinge-style; Sana "Roses" a café trail. The AI produces a plan that fits under everyone's budget. Every member's satisfaction is at least 0.6, and each person sees a line explaining why the plan works for them. Kabir pays a ₹500 pledge to confirm he's in.

**Scenario B — Saving for it**
The trip is 6 weeks away and costs about ₹7,500 per head. Meera opens her Trip Jar, which suggests ₹1,250/week. She sets up AutoPay. The group screen shows "5 of 6 on track," with no amounts.

**Scenario C — Someone drops out**
A week before the trip, one friend drops out. The dropout recalculator immediately shows the new per-head cost (+₹420) and proposes a new room split.

**Scenario D — On the trip**
It rains on Day 2. Live re-planning swaps the beach for an indoor café and market plan. At dinner, the group scans the bill. Two friends tag only the food, so they don't pay for the drinks.

**Scenario E — After the trip**
Settle-up reduces 14 IOUs to 4 UPI payments, each one tap. Trip Wrapped shows the total spent, the most expensive meal, the kilometres covered and the best photos. The group shares it on Instagram.

---

## 8. User stories, features and requirements

**Priority key**
- **P0:** must ship for the demo
- **P1:** ship if time allows (pick 2–4)
- **P2:** roadmap; mock it in the demo or mention it in the pitch

**Uniqueness key** (from the competitor matrix; verify before pitching)
- 🟢 none of the 21 apps is described as offering it
- 🟡 a twist on something others partly do
- ⚪ table stakes

### 8.1 Trip setup and core

| ID | Feature | Priority | Unique | User story |
|---|---|---|---|---|
| C-1 | Trip creation and invites | P0 | ⚪ | As an organizer, I want to create a trip and invite friends with a link, so everyone is in one place. |
| C-2 | Collaborative itinerary builder | P0 | ⚪ | As a member, I want to view and edit a day-by-day plan with my group. |
| C-3 | Accommodation comparison | P0 | ⚪ | As a member, I want to compare stays on price per head, location and how well they fit the group. |
| C-4 | Expense splitting | P0 | ⚪ | As a member, I want to log shared costs and see who owes what. |

**Acceptance criteria**
- C-1: The invite link works without the invitee having to install anything first (web). A trip supports 2–12 members.
- C-2: Edits appear for all members within 2 seconds. Each day has ordered stops with times.
- C-3: At least 3 stays are shown side by side with total price, price per head, distance to the itinerary's main spots, and group compatibility score (D-2).
- C-4: Supports equal, unequal and item-level splits (M-3).

### 8.2 Deciding together

| ID | Feature | Priority | Unique | User story |
|---|---|---|---|---|
| D-1 | Hinge-style voting | P0 | 🟡 | As a member, I want to like or comment on a *specific part* of an option (the pool, the location), so my exact preference is captured. |
| D-2 | Group compatibility score | P0 | 🟢 | As a member, I want to see how well each option fits the whole group. |
| D-3 | Private budget input | P0 | 🟡 | As a member on a tight budget, I want to enter my max budget privately, so the plan fits me without anyone else knowing my number. |
| D-4 | Veto tokens | P1 | 🟢 | As a member, I want a limited number of vetoes, so I can block something I really can't do without blocking everything. |
| D-5 | Deadlock breaker | P1 | 🟢 | As an organizer, I want decisions to auto-lock at a deadline, so planning doesn't drag on for weeks. |
| D-6 | Chat-to-plan | P1 | 🟢 | As an organizer, I want to import our WhatsApp chat, so the ideas we already discussed become a starting plan. |
| D-7 | Smart date finder | P2 | 🟡 | As a member, I want dates suggested from everyone's availability, long weekends and cheaper travel days. |

**Acceptance criteria**
- D-1: Each option card has 2–4 "aspects" (e.g. photo, location, price, amenities). A member can like or comment on any aspect, and gets **1 Rose per trip** (a strong preference that weighs 3× in scoring). Reactions feed the AI preference model.
- D-2: The score is 0–100, computed from the members' reactions and stated preferences. Hovering over it shows the breakdown by preference category, never by person.
- D-3: **Privacy requirement:** an individual budget is never returned by any API to anyone but its owner. The UI only shows "fits everyone's budget ✓" or "over someone's budget ✗." With fewer than 3 members, the app warns the user that their budget could be inferred.
- D-4: Each member gets 2 vetoes per trip (3 for trips longer than 5 days). A veto removes the option from the plan, and the vetoer's identity is shown only if they choose to show it.
- D-5: The organizer sets a decision deadline per question. When it passes, the leading option locks. If the vote is tied, the AI proposes a compromise.
- D-6: Accepts WhatsApp's `.txt` chat export. An LLM extracts destinations, dates, budgets mentioned and activity ideas, and the organizer reviews the results before they're added. The raw chat is not stored after extraction. The importer is told to get the group's consent first.
- D-7: Members mark busy dates. The system overlays public holidays and long weekends and ranks date windows by availability, then cost.

### 8.3 Fairness-first AI planning

| ID | Feature | Priority | Unique | User story |
|---|---|---|---|---|
| A-1 | AI group plan from preferences and budgets | P0 | ⚪ | As a group, we want a full draft itinerary generated from our inputs. |
| A-2 | Fairness-first optimization + "why this works for you" | P0 | 🟡 | As a member, I want a plan where my preferences aren't sacrificed for the majority, and I want to see why it works for me. |
| A-3 | Split days and regroup point | P2 | 🟢 | As a group with different interests, we want to split for part of a day and have the app pick where and when to meet back. |
| A-4 | Meet in the middle | P2 | 🟢 | As friends in different cities, we want a destination and transport that are fair to all of us. |

**A-2: how the fairness logic works (planned approach)**
1. Build a preference vector for each member from the onboarding quiz plus Hinge-style reactions (aspect likes, Roses, vetoes).
2. Generate N candidate plans (LLM + rules) within the **hard constraint**: cost per head ≤ min(private budgets).
3. Score each member's satisfaction `s_i ∈ [0,1]` for every candidate.
4. Pick the candidate that **maximizes min(s_i)** (maximin), breaking ties by mean satisfaction.
5. Generate a "why this works for you" line for each member that names the items matching their preferences.
6. Show a fairness meter: every member's satisfaction as an anonymous bar, plus the group minimum.

**Acceptance criteria**
- A-1: The plan is generated in under 20 seconds and includes day-by-day stops, a stay, transport and estimated cost per head.
- A-2: The final plan's minimum satisfaction is shown. Every member sees a personalised explanation of 1–3 lines. Regenerating keeps locked items.

### 8.4 Money

| ID | Feature | Priority | Unique | User story |
|---|---|---|---|---|
| M-1 | Trip Jar (SIP-style savings) | P0 | 🟢 | As a student, I want to save a little every week toward the trip, so I can afford it by booking day. |
| M-2 | Commitment pledge | P1 | 🟢 | As an organizer, I want people to confirm with a small token payment, so "maybe" becomes yes or no. |
| M-3 | Item-level receipt splits | P0 | 🟡 | As a non-drinker, I want to pay only for what I had. |
| M-4 | Fair room pricing | P1 | 🟡 | As a group, we want the better room to cost a bit more, so room allocation feels fair. |
| M-5 | Debt-minimised settle-up | P0 | ⚪ | As a member, I want the fewest possible payments to clear all balances. |
| M-6 | One-tap UPI settle-up | P0 | 🟡 | As a member, I want to pay what I owe in one tap through my UPI app. |
| M-7 | Private live budget tracker | P2 | 🟡 | As a member, I want to see my own spending against my budget during the trip, visible only to me. |
| M-8 | Dropout recalculator | P1 | 🟢 | As a group, we want per-head cost and rooms to update instantly when someone drops out. |

**Acceptance criteria**
- M-1: Inputs are the trip cost estimate and the booking date. The app suggests a weekly or monthly amount, which the user can edit. It shows a progress ring and a streak. The group view shows only "X of Y on track," never amounts. **AutoPay is mocked in the demo**; the real version would use a payment gateway's UPI AutoPay mandate.
- M-2: The organizer sets the pledge amount (default ₹500). The pledge counts toward the member's share once booked. Refund rules are shown before payment. **Mocked in the demo.**
- M-3: Bill photo → OCR → line items → each member taps the items they shared. Tax and tip are split in proportion. Manual entry is the fallback if OCR fails.
- M-4: Inputs are the room list, the total rent and each member's valuation of each room. The app returns an envy-free assignment and prices (rent-division algorithm). Members can accept or override.
- M-5: The greedy min-cash-flow algorithm produces ≤ N−1 transactions for N members.
- M-6: Builds a UPI intent link `upi://pay?pa=<vpa>&pn=<name>&am=<amount>&cu=INR&tn=<trip>`. Payment is marked settled when the payer confirms (a gateway webhook would replace this post-hackathon).
- M-8: When a member is removed, the app recalculates per-head cost, room split and pledge handling, and shows everyone the cost difference.

### 8.5 Sharing the load

| ID | Feature | Priority | Unique | User story |
|---|---|---|---|---|
| S-1 | Trip roles and task split | P1 | 🟢 | As an organizer, I want to hand out roles (treasurer, navigator, food scout) and tasks, so I'm not doing everything. |
| S-2 | Who-brings-what packing list | P1 | 🟢 | As a group, we want a shared list, so we don't all bring the same things. |

### 8.6 During the trip

| ID | Feature | Priority | Unique | User story |
|---|---|---|---|---|
| T-1 | Live re-planning | P1 | 🟢 | As a group, we want the rest of the day re-planned when it rains, a train is late or we're tired. |
| T-2 | Mood pulse and anonymous signals | P1 | 🟢 | As a member, I want to quietly signal "need a break" or "low on cash" without saying it out loud. |
| T-3 | Parent mode | P1 | 🟢 | As a student, I want to share a read-only itinerary and live location with my parents. |
| T-4 | Shared photo pool | P2 | 🟢 | As a group, we want everyone's photos in one album, sorted by day and place. |
| T-5 | Safety SOS | P2 | 🟢 | As a member, I want one tap to alert my group and emergency contacts with my location. |
| T-6 | Offline mode | P2 | ⚪ | As a traveller, I want the itinerary and splits to work without signal. |
| T-7 | Group chat | P2 | ⚪ | As a member, I want to chat inside the trip. (Low priority, because people already use WhatsApp; Chat-to-plan covers this need better.) |
| T-8 | Document vault | P2 | ⚪ | As a member, I want tickets and bookings in one place. |

**Acceptance criteria (P1 items)**
- T-1: Triggers are weather (API or a simulated toggle in the demo), a manual "we're tired" button, or a delay entered by a member. The app proposes a revised plan for the rest of the day that a member can accept.
- T-2: A daily 1-tap check-in (energy 1–5). Anonymous signals are aggregated before they're shown ("someone needs a break") and are never attributed to anyone.
- T-3: A shareable link with no login, showing a read-only itinerary plus opt-in live location. The student can revoke it at any time.

### 8.7 After the trip

| ID | Feature | Priority | Unique | User story |
|---|---|---|---|---|
| W-1 | Trip Wrapped | P0 | 🟢 | As a group, we want a fun, shareable recap of our trip. |
| W-2 | Group taste profile | P2 | 🟡 | As a group, we want our ratings to make our next trip's plan better. |

**Acceptance criteria**
- W-1: 5–8 animated story cards: total spent, cost per head, the most expensive meal, the biggest spender category, kilometres covered, the top-voted place, the "MVP organizer," and best photos. The cards can be exported as images or a vertical video for Instagram stories.

### 8.8 Non-functional requirements

| Area | Requirement |
|---|---|
| Privacy | Private budgets, savings amounts and anonymous signals are never exposed to other members, at the API level and in the UI. |
| Performance | AI plan in < 20 s; collaborative edits sync in < 2 s. |
| Platform | Mobile-first responsive web app (PWA) for the hackathon. |
| Localisation | INR as the default currency, Indian date formats; English first, Hindi copy as a stretch goal. |
| Reliability (demo) | Seeded demo trip, plus a fallback cached AI response in case the LLM API is slow on stage. |
| Accessibility | WCAG AA contrast; voting doesn't rely on swipe gestures alone (buttons too). |

---

## 9. Features out (not in this release)

- Real booking and payment of stays, flights or trains inside the app (link out instead).
- Real money custody: holding pledges or Jar savings needs payment-gateway escrow and regulatory compliance. Mocked for the hackathon.
- Native iOS/Android apps (PWA only).
- Real-time multiplayer map editing (Trip offers this; not a priority for us).
- A human travel advisor (Layla's model).
- Public social feed or trip marketplace.

---

## 10. Designs

_[Link Figma / Design artifact here]_

**P0 screens to design on Day 1**
1. Trip home (members, status, Jar readiness, next decision)
2. Onboarding quiz + private budget
3. Hinge-style option card (aspects, like, comment, Rose)
4. AI plan view with fairness meter and "why this works for you"
5. Accommodation comparison
6. Expense log + item-level split + settle-up with UPI buttons
7. Trip Jar
8. Trip Wrapped story cards

---

## 11. Open issues

| # | Issue | Owner | Status |
|---|---|---|---|
| 1 | Final product name (Kafila is a placeholder) | _[ ]_ | Open |
| 2 | Tech stack: frontend, backend, DB, LLM provider | _[ ]_ | Open |
| 3 | Which 2–4 P1 features do we commit to on Day 5? | Team | Open |
| 4 | Data source for accommodation and prices: real API, scraped, or seeded mock data? | _[ ]_ | Open |
| 5 | Verify the "unique" claims against Wanderlog, YatraYaar and Plan Harmony before the pitch | _[ ]_ | Open |
| 6 | Budget privacy with very small groups (2 people): is a warning enough? | _[ ]_ | Open |
| 7 | How satisfaction `s_i` is scored: weights for quiz answers vs reactions vs Roses | _[ ]_ | Open |

---

## 12. Q&A (anticipated judge questions)

**Q: Isn't this just Wanderlog + Splitwise?**
A: Those apps organize logistics and split bills afterwards. We solve the group-dynamics problems: private budgets, fairness-first planning, savings before the trip, commitment, and fair splits. None of the 21 competitors we mapped is described as offering 17 of our features.

**Q: How is the AI actually "fair"?**
A: It treats budgets as a hard constraint (cost ≤ the lowest private budget) and picks the plan that maximizes the *least-satisfied* member's score (maximin). Plain majority voting would ignore the quiet minority; this doesn't.

**Q: Can't someone work out who has the low budget?**
A: The API never returns individual budgets, and the UI only shows whether a plan fits. With 2-person groups we warn users that their budget could be inferred.

**Q: Will people really hand over money for the pledge or Jar?**
A: Students already use UPI and SIPs every day. The pledge counts toward their share, so it's not an extra cost. In the demo both are mocked; production would use a regulated payment gateway.

**Q: Why not just use WhatsApp?**
A: We don't fight WhatsApp; we read from it. Chat-to-plan turns the chat you already have into a structured plan.

---

## 13. Other considerations

- **Suggested stack (for discussion):** Next.js PWA + Tailwind; Supabase or Firebase for auth, DB and realtime sync; an LLM API for planning, Chat-to-plan extraction and explanations; Tesseract or a cloud OCR service for receipts; Open-Meteo for weather (free, no key).
- **Algorithms to implement:** maximin plan selection; greedy min-cash-flow debt simplification; envy-free rent division (for fair room pricing).
- **Demo risk mitigation:** seed a complete "Goa with friends" trip; cache AI responses; record a backup demo video on Day 7.
- **Legal/compliance (post-hackathon):** holding user funds (pledge, Jar) would need a licensed payment partner; WhatsApp chat import needs consent from the group; live location needs explicit opt-in that can be revoked.
- **Monetisation ideas (if judges ask):** commission on stays booked via affiliate links; premium Trip Wrapped templates; partnerships with student travel brands.
