# MVP Plan — Kafila (working name)

Companion to `Group-Travel-Platform-PRD.md`. Feature IDs (C-1, D-3, M-1 …) match the PRD.

Every one of the PRD's 35 features is in one of Stages 1–3. Stage 4 is UI/UX improvement across the whole product.

| Stage | Theme | Features | PRD priority | Suggested time (7-day hackathon) |
|---|---|---|---|---|
| **1** | Core loop: plan it together, fairly | 14 | P0 | Days 1–4 |
| **2** | Commitment, shared load and the trip itself | 11 | P1 | Day 5 (+ spill into Day 6) |
| **3** | Extended experience | 10 | P2 | "Lite" versions if time allows, otherwise mocked or roadmap |
| **4** | UI/UX improvement | — | — | Day 6–7, **starts on Day 6 whatever Stages 2–3 look like** |

**Rules**
1. Don't start a stage until the one before it meets its exit criteria. The exception is Stage 4, which always starts on Day 6.
2. Every feature has an **MVP scope**, the smallest version that proves the idea. Build that first, and only that.
3. If something is behind schedule, cut scope inside the feature before cutting the feature.
4. A polished demo with fewer features beats a broken one with more.

---

## Stage 1 — Core loop: plan it together, fairly

**Goal:** a group can create a trip, decide together, get a fair AI plan, split costs, save for it, and get a recap. This is the full demo story.

**Demo moment:** "Meera's budget is the lowest, but nobody knows. The AI still found a plan where everyone's satisfaction is above 0.6, and here's why it works for each person."

### 1A. Foundation (Day 1–2)

| ID | Feature | MVP scope | Done when |
|---|---|---|---|
| C-1 | Trip creation and invites | Create a trip (name, destination ideas, rough dates); invite by shareable link; join with name + email or Google login | 6 people can join one trip from their phones |
| C-2 | Collaborative itinerary builder | Day-by-day list of stops (title, time, location, cost); add/edit/reorder; realtime sync | An edit on one phone shows on another within 2 s |
| D-3 | Private budget input | Onboarding asks for max budget per person; stored server-side; only visible to its owner | No API response or screen shows another member's budget |
| D-1 | Hinge-style voting | Option cards with 2–4 aspects (photo, location, price, vibe); like or comment on an aspect; 1 Rose per member per trip | Reactions are saved per aspect and appear on the card |
| D-2 | Group compatibility score | 0–100 score on each option from reactions + quiz answers; breakdown by category, never by person | Each option shows a score that changes as people react |

### 1B. AI planning (Day 3)

| ID | Feature | MVP scope | Done when |
|---|---|---|---|
| A-1 | AI group plan from preferences and budgets | LLM generates 3–5 candidate itineraries from destination, dates, quiz answers and reactions | A full plan (stops, stay, transport, cost per head) appears in < 20 s |
| A-2 | Fairness-first planning + "why this works for you" | Score each member's satisfaction per candidate; keep only candidates with cost ≤ lowest private budget; pick the one with the highest minimum satisfaction; generate 1–3 personal lines each | Fairness meter shows anonymous bars + group minimum; every member sees a personal explanation |
| C-3 | Accommodation comparison | 3–5 stays side by side: total price, price per head, distance to key stops, compatibility score. Seeded data is fine | Group can compare and pick a stay; it's added to the plan |

### 1C. Money and recap (Day 4)

| ID | Feature | MVP scope | Done when |
|---|---|---|---|
| C-4 | Expense splitting | Add an expense (who paid, amount, who shared); equal and unequal splits; running balances | Balances are correct for a 6-person test trip |
| M-3 | Item-level receipt splits | Upload a bill photo → OCR → line items → each member taps what they shared; tax and tip split in proportion. Manual entry as fallback | A demo bill splits correctly with one member skipping the drinks |
| M-5 | Debt-minimised settle-up | Greedy min-cash-flow algorithm | N members settle in ≤ N−1 payments |
| M-6 | One-tap UPI settle-up | "Pay" button opens a UPI intent link (`upi://pay?pa=…&am=…&cu=INR`); payer marks as paid | Tapping it on an Android phone opens a UPI app with the amount filled in |
| M-1 | Trip Jar (SIP-style savings) | Goal = estimated cost per head; suggested weekly amount up to booking date; manual "add money" entries; progress ring + streak; group sees "X of Y on track" only. **AutoPay is mocked** | A member's Jar shows progress; the group view shows readiness without amounts |
| W-1 | Trip Wrapped | 5–6 story cards from trip data: total spent, cost per head, priciest meal, top-voted place, MVP organizer; export as images | Cards generate from the demo trip and can be saved or shared |

### Stage 1 exit criteria
- [ ] The full story runs end to end on the seeded "Goa with friends" trip without errors
- [ ] Budget privacy has been checked: no other member's budget appears in any API response
- [ ] A cached AI response is ready in case the LLM is slow during the demo
- [ ] The core flow works on a phone screen (360px wide)

---

## Stage 2 — Commitment, shared load and the trip itself

**Goal:** handle the human problems of flakiness, endless debates and one person doing everything, and make the app useful *during* the trip.

**Demo moment:** "Kabir drops out a week before. Watch: per-head cost and the room split update instantly." / "It started raining, and the rest of the day re-planned itself."

### 2A. Deciding and committing

| ID | Feature | MVP scope | Done when |
|---|---|---|---|
| D-4 | Veto tokens | 2 vetoes per member (3 for trips over 5 days); a veto removes the option; vetoer is anonymous unless they choose to show their name | Veto count goes down and the option disappears from the plan |
| D-5 | Deadlock breaker | Organizer sets a deadline per decision; when it passes, the leading option locks; if tied, AI suggests a compromise | A decision locks automatically at its deadline (a demo button can trigger it early) |
| D-6 | Chat-to-plan | Upload a WhatsApp `.txt` export → LLM extracts destinations, dates, budgets and activity ideas → organizer reviews → added as options. Raw chat isn't stored | A sample chat export turns into options on the trip |
| M-2 | Commitment pledge | Organizer sets an amount (default ₹500); member "pays" (mocked) to confirm; pledge counts toward their share | Members show as Confirmed / Maybe; pledge appears in their balance |

### 2B. Fair money, continued

| ID | Feature | MVP scope | Done when |
|---|---|---|---|
| M-4 | Fair room pricing | Enter rooms + total rent; each member rates each room; envy-free rent division algorithm returns who gets which room at what price; group can accept or override | A 3-room demo gives an assignment where nobody would rather swap |
| M-8 | Dropout recalculator | Removing a member recalculates cost per head, room split and pledge handling; everyone sees the change | Removing a member shows "+₹X per person" and the new rooms |

### 2C. Sharing the load

| ID | Feature | MVP scope | Done when |
|---|---|---|---|
| S-1 | Trip roles and task split | Preset roles (Treasurer, Navigator, Food scout, Stay hunter, Memory keeper) + custom; tasks with an owner and a checkbox | Every member has a role; tasks show on the trip home |
| S-2 | Who-brings-what packing list | Shared list; members claim items; duplicates flagged ("2 people are bringing a speaker") | Claiming an item shows the claimer's name to everyone |

### 2D. During the trip

| ID | Feature | MVP scope | Done when |
|---|---|---|---|
| T-1 | Live re-planning | Triggers: weather (Open-Meteo, or a demo toggle), "we're tired" button, delay entered by a member → AI proposes a revised plan for the rest of the day → accept or reject | Toggling "rain" produces an indoor alternative that can be accepted |
| T-2 | Mood pulse and anonymous signals | Daily 1-tap energy check (1–5); anonymous "need a break" / "low on cash" signals shown only in aggregate ("someone needs a break") | Signals appear without names; the low-energy average can feed into T-1 |
| T-3 | Parent mode | Read-only link with no login: itinerary + opt-in live location; revocable | A parent link opens in a fresh browser and shows the plan |

### Stage 2 exit criteria
- [ ] The dropout and rain scenarios both work live in the demo
- [ ] Anonymous signals and vetoes never reveal who sent them
- [ ] Nothing in Stage 1 broke (re-run the full Stage 1 flow)

> **If time is short:** commit to the 2–4 Stage 2 features with the best demo moments. Suggested: **M-8 Dropout recalculator, D-6 Chat-to-plan, T-3 Parent mode, T-1 Live re-planning**.

---

## Stage 3 — Extended experience

**Goal:** complete the picture. These are built as "lite" versions if time allows; otherwise they're mocked in the demo or shown as roadmap in the pitch.

| ID | Feature | MVP scope ("lite" version) | Done when |
|---|---|---|---|
| D-7 | Smart date finder | Members mark busy dates on a calendar; overlay Indian public holidays + long weekends; rank date windows by availability | Top 3 date windows are suggested with reasons |
| A-3 | Split days and regroup point | For one time block, the AI suggests two parallel activities and a meeting spot + time between them | The itinerary shows a fork and a "meet at" stop |
| A-4 | Meet in the middle | Members enter home cities; destinations ranked by the spread of travel time and cost across members (fairest = smallest gap) | For 3 cities, the app explains why the top destination is fair |
| M-7 | Private live budget tracker | Personal view: my share of expenses so far vs my private budget; warning at 80% | Only the owner can see it; it updates as expenses are added |
| T-4 | Shared photo pool | Members upload photos; grouped by day using photo date (EXIF) | Uploaded photos appear under the right day; they feed Trip Wrapped |
| T-5 | Safety SOS | One button sends the current location + a preset message to group members and saved emergency contacts (opens a share or SMS link) | Pressing SOS opens a pre-filled message with a map link |
| T-6 | Offline mode | PWA caches the itinerary and balances; expenses added offline sync when back online | Airplane mode still shows the itinerary; an offline expense syncs later |
| T-7 | Group chat | Basic text chat inside the trip (realtime) | Messages appear live for all members |
| T-8 | Document vault | Upload tickets/bookings (PDF/image) to the trip; shown per day | Files open from the trip page |
| W-2 | Group taste profile | Post-trip 1-tap ratings per stop; saved to the group; used as extra input for the next AI plan | Ratings from trip 1 change the scoring for a trip 2 |

### Stage 3 exit criteria
- [ ] Every Stage 3 feature is one of: built (lite), mocked with a clear screen, or on the roadmap slide
- [ ] Nothing in Stages 1–2 broke

---

## Stage 4 — UI/UX improvement

**Goal:** make it feel like a real product. Judges notice polish within seconds. **Stage 4 starts on Day 6 no matter how far Stages 2–3 got.**

### 4.1 Visual design system
- [ ] One colour palette (primary, accent, success/warning/error, neutrals) with light and dark variants
- [ ] One type scale (2 fonts at most) and consistent spacing (4/8px grid)
- [ ] Reusable components: buttons, cards, option cards, avatars, chips, bottom sheet, modals, toasts
- [ ] Consistent icon set
- [ ] Member avatars with colours, used everywhere a person appears

### 4.2 Navigation and information architecture
- [ ] Bottom tab bar on mobile: **Trip · Plan · Money · Memories**
- [ ] The trip home answers at a glance: Who's in? What needs deciding? How's the Jar? What's next?
- [ ] At most 3 taps from the trip home to any core action
- [ ] Clear "next action" prompt on the trip home ("2 decisions waiting for your vote")

### 4.3 Onboarding
- [ ] Join-from-link flow in under 60 seconds
- [ ] Preference quiz uses visual choices (pick-a-photo) instead of forms
- [ ] Private budget screen explains the privacy promise clearly ("Only you will ever see this number")
- [ ] Skippable intro showing the 3 things that make the app different

### 4.4 Feedback, states and micro-interactions
- [ ] Loading states for AI: skeleton screens + rotating progress messages ("Checking everyone's budget…", "Balancing preferences…")
- [ ] Empty states with a helpful action (no expenses yet → "Add the first expense")
- [ ] Error states in plain language with a retry
- [ ] Animations: card swipe / like, Rose, veto, plan reveal, Jar progress fill, confetti when someone hits their Jar goal, settle-up success tick
- [ ] Optimistic updates for votes and expenses (no waiting on the network)
- [ ] Undo for destructive actions (remove expense, use veto)

### 4.5 Trust and clarity
- [ ] A lock icon wherever data is private (budget, Jar amount, anonymous signals)
- [ ] Fairness meter explained with one tap ("We pick the plan where the least happy person is as happy as possible")
- [ ] Every AI suggestion shows *why* (preferences matched, budget fit)
- [ ] Money screens are easy to scan: who owes whom, with big amounts and clear direction arrows

### 4.6 Indian context and copy
- [ ] ₹ amounts in Indian grouping (₹1,00,000, not ₹100,000)
- [ ] Dates as DD MMM (23 Nov)
- [ ] Friendly, short microcopy in a consistent tone ("Kabir's in! 🎉", "Meera's Jar is on track")
- [ ] Hindi UI strings for core screens (stretch goal)

### 4.7 Accessibility
- [ ] WCAG AA colour contrast in light and dark mode
- [ ] Every swipe gesture also has a button
- [ ] Tap targets at least 44×44px
- [ ] Labels for screen readers on icons and buttons
- [ ] Information never shown by colour alone (fairness bars also show numbers)

### 4.8 Performance and responsiveness
- [ ] Works well from 360px phones up to desktop
- [ ] First load under 3 s on 4G; images compressed and lazy-loaded
- [ ] Installable PWA with app icon and splash screen

### 4.9 Usability testing
- [ ] 3–5 friends outside the team try the core flow without help
- [ ] Note every point where they hesitate or ask a question; fix the top 5
- [ ] Re-test the fixed flow once

### 4.10 Demo polish
- [ ] Seeded demo trip with realistic names, photos, expenses and votes
- [ ] Demo accounts pre-logged-in on 2 devices to show realtime sync
- [ ] Trip Wrapped shown as the final screen of the demo
- [ ] Backup screen recording of the full demo

### Stage 4 exit criteria
- [ ] A new user can complete the core flow without explanation
- [ ] No unstyled screens, broken layouts or placeholder text in the demo path
- [ ] Light/dark and mobile/desktop all look intentional

---

## Feature coverage checklist (all 35 PRD features)

| Area | Stage 1 | Stage 2 | Stage 3 |
|---|---|---|---|
| Core | C-1, C-2, C-3, C-4 | — | — |
| Deciding | D-1, D-2, D-3 | D-4, D-5, D-6 | D-7 |
| AI planning | A-1, A-2 | — | A-3, A-4 |
| Money | M-1, M-3, M-5, M-6 | M-2, M-4, M-8 | M-7 |
| Sharing the load | — | S-1, S-2 | — |
| During the trip | — | T-1, T-2, T-3 | T-4, T-5, T-6, T-7, T-8 |
| After the trip | W-1 | — | W-2 |
| **Count** | **14** | **11** | **10** |

---

## Mocked vs real (for honesty in the pitch)

| Thing | In the MVP | Production version |
|---|---|---|
| Trip Jar AutoPay | Mocked; manual "add money" | UPI AutoPay mandate via a licensed payment gateway |
| Commitment pledge payment | Mocked | Gateway escrow with clear refund rules |
| UPI settle-up | Real UPI intent link; payer confirms manually | Gateway webhook confirms payment automatically |
| Accommodation data | Seeded / sample data | Partner or affiliate API |
| Weather for re-planning | Open-Meteo, or a demo toggle | Open-Meteo + transport delay feeds |
| Receipt OCR | OCR with manual fallback | Same, with better item parsing |
