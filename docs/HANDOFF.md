# Handoff — Group Travel Planning Platform (Hackathon)

**For the next Claude:** this file summarises an earlier conversation so you can continue without it. Please read it fully before replying. If they're attached, also read `Group-Travel-Platform-PRD.md` and `MVP.md`; they hold the full detail.

---

## 1. Who and what

- **User:** a student in India (IST, UTC+05:30) working with a team in a **7-day hackathon**. The hackathon was described as "chill"; the exact start date wasn't stated.
- **Problem statement (given by organisers):** "Group Travel Planning Platform. Friends collaboratively plan trips, build itineraries, compare accommodation and split expenses. AI generates optimized travel plans based on everyone's budget and preferences."
- **Team's task:** innovate beyond the basics. The work so far: ideation → competitor analysis → PRD → MVP plan.
- **Working product name:** *Kafila* (Hindi/Urdu for a caravan). **Placeholder only, not decided.**

## 2. Core positioning (agreed direction)

Other apps solve **logistics**. We solve **group dynamics**: hidden budgets, unheard preferences, one person doing all the planning, flaky friends, awkward money, and plans lost in WhatsApp chats.

**Tagline options:** "Plan the trip, not the drama." / "Everyone in. Nobody left out."

**Hero differentiators:**
1. **Private budgets + fairness-first AI**: budgets are never shown to other members; the AI picks the plan that maximises the *least-satisfied* member's score (maximin), with cost per head ≤ the lowest private budget; each member sees "why this works for you."
2. **Hinge-style voting** (user's idea): like or comment on a *specific aspect* of an option (pool, location, price); one "Rose" super-like per person per trip; feeds a group compatibility score.
3. **Trip Jar** (user's idea): SIP-style personal savings for the trip, with a suggested weekly amount, UPI AutoPay (mocked in the MVP) and streaks; the group sees "X of Y on track," never amounts.
4. **Fair money**: item-level receipt splits, fair room pricing (envy-free rent division), debt-minimised settle-up, one-tap UPI intent links.
5. **Trip Wrapped**: a Spotify Wrapped-style shareable recap.

The user said the team is **picking all brainstormed features**.

## 3. Full feature list (35, with PRD IDs and MVP stage)

| ID | Feature | Stage |
|---|---|---|
| C-1 | Trip creation & invites | 1 |
| C-2 | Collaborative itinerary builder | 1 |
| C-3 | Accommodation comparison | 1 |
| C-4 | Expense splitting | 1 |
| D-1 | Hinge-style voting (aspects + Rose) | 1 |
| D-2 | Group compatibility score | 1 |
| D-3 | Private budget input | 1 |
| A-1 | AI group plan from preferences & budgets | 1 |
| A-2 | Fairness-first planning + "why this works for you" | 1 |
| M-1 | Trip Jar (SIP savings) | 1 |
| M-3 | Item-level receipt splits | 1 |
| M-5 | Debt-minimised settle-up | 1 |
| M-6 | One-tap UPI settle-up | 1 |
| W-1 | Trip Wrapped | 1 |
| D-4 | Veto tokens | 2 |
| D-5 | Deadlock breaker (deadline auto-lock / AI compromise) | 2 |
| D-6 | Chat-to-plan (WhatsApp export → AI extracts plan ideas) | 2 |
| M-2 | Commitment pledge (token deposit) | 2 |
| M-4 | Fair room pricing | 2 |
| M-8 | Dropout recalculator | 2 |
| S-1 | Trip roles & task split | 2 |
| S-2 | Who-brings-what packing list | 2 |
| T-1 | Live re-planning (weather / delay / tired) | 2 |
| T-2 | Mood pulse & anonymous signals | 2 |
| T-3 | Parent mode (read-only itinerary + live location link) | 2 |
| D-7 | Smart date finder | 3 |
| A-3 | Split days & regroup point | 3 |
| A-4 | Meet in the middle (multi-city origins) | 3 |
| M-7 | Private live budget tracker | 3 |
| T-4 | Shared photo pool | 3 |
| T-5 | Safety SOS | 3 |
| T-6 | Offline mode | 3 |
| T-7 | Group chat | 3 |
| T-8 | Document vault | 3 |
| W-2 | Group taste profile | 3 |

**Stage 4** = UI/UX improvement (design system, navigation, onboarding, loading/empty/error states, animations, privacy cues, ₹ Indian number grouping, accessibility, usability testing, demo polish). **Rule: Stage 4 starts on Day 6 whatever state Stages 2–3 are in.**

**Suggested 7-day timeline:** D1 scope + design + schema + auth → D2 trips, invites, budgets, voting → D3 AI planning + accommodation → D4 money + Trip Jar → D5 Stage 2 features → D6 Trip Wrapped, polish, seeded demo data → D7 pitch, rehearsal, backup video.

If time is short in Stage 2, keep **M-8 Dropout recalculator, D-6 Chat-to-plan, T-3 Parent mode, T-1 Live re-planning**.

## 4. Competitor analysis (user-supplied list of 21)

Plan Harmony, Wanderlog, TripUnio, Troupe, WePlanify, Triplly, Stippl, Trip (AI "Pip", real-time multiplayer map), AvoSquado (bedroom assignment, activity booking), TripRelay, Mindtrip, Layla (AI + human advisor), Stardrift*, Travelry* (Stripe collection, live prices), Splitwise (indirect), **YatraYaar** (closest Indian rival: INR splits, debt minimisation, itinerary, chat, vault), TripBird (INR, offline), Tripyy†, TripShare†, TripWise†, Roamiyo†.
\* from a third-party comparison, unverified · † barely any detail / unverified

**Result (based only on the one-line descriptions):** of 34 features compared, **17 aren't described for any competitor**, 9 are twists on partial features, and 8 exist elsewhere (incl. the 4 basics).

**"Only us" features:** Trip Jar, Chat-to-plan, Meet in the middle, Live re-planning, Parent mode, Trip Wrapped, Group compatibility score, Veto tokens, Deadlock breaker, Split days, Commitment pledge, Dropout recalculator, Trip roles, Mood pulse, Safety SOS, Packing list, Shared photo pool.

⚠️ **Not verified.** Web search wasn't available when this analysis was done. "Not mentioned" ≠ "doesn't have." Verify the hero features against **Wanderlog, YatraYaar and Plan Harmony** before claiming "nobody does this" in the pitch.

## 5. Key technical decisions / approaches

- **Fairness algorithm:** preference vector per member (quiz + aspect likes + Roses ×3 + vetoes) → generate N candidate plans within cost ≤ min(private budgets) → score satisfaction s_i ∈ [0,1] → pick max(min s_i), ties broken by mean → personal explanations → anonymous fairness meter.
- **Privacy:** individual budgets, Jar amounts and anonymous signals are never returned by the API to other members. Warn users in 2-person groups that their budget could be inferred.
- **Settle-up:** greedy min-cash-flow (≤ N−1 payments); UPI intent `upi://pay?pa=<vpa>&pn=<name>&am=<amt>&cu=INR&tn=<trip>`.
- **Room pricing:** envy-free rent division.
- **Mocked in the MVP:** Trip Jar AutoPay, pledge payments, accommodation data (seeded). Real: UPI intent links, OCR with manual fallback, Open-Meteo weather (or a demo toggle).
- **Suggested stack (not decided):** Next.js PWA + Tailwind, Supabase/Firebase (auth, DB, realtime), an LLM API, OCR (Tesseract/cloud), Open-Meteo.
- **Platform:** mobile-first responsive PWA, INR default.

## 6. Personas (illustrative, invented)

Aarav (the organizer, Pune) · Meera (quiet tight budget, Delhi) · Kabir (the "maybe," Bengaluru) · Sana (specific preferences, Mumbai) · Parents (secondary). Demo story: 6 friends from 3 cities, 4-day Goa trip in December.

## 7. Files created so far

| File | What it is | How to bring it over |
|---|---|---|
| `Group-Travel-Platform-PRD.md` | Full PRD in Product School template format (overview, metrics, messaging, timeline, personas, scenarios, user stories + acceptance criteria, features out, designs, open issues, judge Q&A, other considerations) | Download and attach to the new chat |
| `MVP.md` | 4-stage MVP plan: per-feature MVP scope + "done when", stage exit criteria, Stage 4 UI/UX checklist, coverage table, mocked-vs-real table | Download and attach |
| Feature & competitor matrix (Claude Sheet, 3 tabs: Feature matrix, Only us – pitch, Competitors) | Lives in the old account and **won't be accessible from the new one** | Download as .xlsx from the Sheet page and attach |
| `HANDOFF.md` | This file | Attach first |

## 8. Open issues

1. Final product name
2. Tech stack
3. Which 2–4 Stage 2 features to commit to
4. Accommodation/price data source (API, scraped, or seeded)
5. Verify "unique" claims against competitors
6. Budget privacy in tiny groups
7. Satisfaction scoring weights
8. Team names, roles and owners aren't filled in yet

## 9. Likely next steps

- Pick hero features + sketch the demo flow
- Wireframe the 8 P0 screens (trip home, onboarding + private budget, Hinge option card, AI plan + fairness meter, accommodation comparison, expenses + settle-up, Trip Jar, Trip Wrapped)
- Pitch deck
- DB schema / system architecture
- Verify competitors now that web search may be available

## 10. How the user likes to work

- Brainstorms out loud and adds their own ideas while Claude works; builds on ideas collaboratively
- Wants concrete deliverables as files (asked for `.md` files by name)
- Short, informal messages; English, sometimes with typos; Indian context matters (UPI, SIP, INR, WhatsApp)
