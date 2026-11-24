# Kafila Architecture

Kafila is a mobile-first PWA for planning group trips fairly. Feature IDs (C-1, D-3, M-1 …) match `Group-Travel-Platform-PRD.md` and `MVP.md`.

Status: working architecture, v0.1 (23 Nov 2026). Changes go through the "Ask before changing" list at the end.

---

## Core principle

**Private data never leaves the server except to its owner.**

Private data means: personal budgets, Trip Jar amounts, room valuations, preference answers, satisfaction scores, mood check-ins, anonymous signals and who used a veto.

Other members only ever see **aggregates** ("fits everyone ✓", "5 of 6 on track", "someone needs a break"), and those aggregates are computed on the server.

The database enforces this through Row Level Security (RLS). It does not rely on the UI hiding things.

---

## Decisions

| # | Decision | Choice | Why |
|---|---|---|---|
| 1 | Frontend | **Next.js** (App Router, React, TypeScript), PWA | The team already knows it (Hospass). Server routes keep private logic off the client. |
| 2a | Backend | **Node.js**: Next.js route handlers (`app/api/**/route.ts`) and server components, on the Node.js runtime. Vercel runs them as Node.js functions. | One codebase and one deploy. Any work that reads private rows or calls Claude runs here, never in the browser. |
| 2b | Database | **Supabase**: PostgreSQL with RLS, plus Realtime, Auth and Storage | RLS enforces budget privacy inside the database. SQL suits money math. |
| 3 | Data access | **Hybrid** | Normal data goes browser → Supabase directly, under RLS, with realtime for free. Private and AI work goes through Next.js server routes. |
| 4 | LLM | **Claude** via `@anthropic-ai/sdk`, called only from the server | Structured JSON output and vision (receipts). |
| 5 | Join / auth | **Guest + Google** | Supabase anonymous sign-in with just a name. People can link Google later. |
| 6 | Rooms | **Shared rooms** | Rooms have a number of beds, and fair pricing assigns beds. |
| 7 | Trip cost | **Per person** | Each person's cost is their own travel plus their share of group costs. Each person's cost is checked against their own budget. |
| 8 | Hosting | Vercel (app) + Supabase cloud (DB) | Free tiers, so a deployed skeleton is possible on Day 1. |

---

## System overview

```text
 ┌──────────────────────────── Phone / browser (PWA) ───────────────────────────┐
 │  Next.js client components                                                   │
 │   • normal reads/writes ──────────────► Supabase (RLS)  ◄── realtime events │
 │   • private / AI actions ──► /api/* ─┐                                      │
 └──────────────────────────────────────┼──────────────────────────────────────┘
                                        ▼
 ┌──────── Backend: Next.js server on Node.js (Vercel functions) ───┐
 │  route handlers  /api/demo, /api/trips/[id]/...                  │
 │   lib/fairness   lib/settle   lib/rooms   lib/ai   lib/privacy   │
 │   uses SUPABASE_SECRET_KEY + ANTHROPIC_API_KEY (server only)      │
 └───────┬───────────────────────┬───────────────────────┬──────────┘
         ▼                       ▼                       ▼
   Database: Supabase      Claude API              Open-Meteo
   PostgreSQL (34 tables)
   (+ Storage: receipts,   (plans, chat import,    (weather, no key)
    photos, documents)      receipts, re-plan)

 UPI: the client builds upi://pay links itself, so no server or credentials are involved.
 Parent mode: /p/[token] is a server-rendered page with no login, and it reads only by token.
```

---

## Actors

| Actor | How they authenticate | What they can do |
|---|---|---|
| **Organizer** | Google or guest | Everything a member can, plus: invite people, set deadlines, the pledge amount and roles, remove members, generate the AI plan |
| **Member** | Google or guest (anonymous sign-in, name only) | Vote, add expenses, edit the itinerary, manage their own private data |
| **Parent viewer** | No login, holds a revocable token link | Read-only itinerary and opt-in location for **one** member |
| **Server** | Service-role key | The only actor that reads everyone's private rows, and only to compute aggregates |

A trip can have more than one organizer (`members.role = 'organizer'`).

---

## Modules

| Module | Features | Where the logic lives |
|---|---|---|
| Trips & members | C-1, M-2, S-1, M-8 | Client + RLS. Dropout recalculation runs in a server route. |
| Itinerary | C-2, A-3 | Client + RLS + realtime |
| Options & voting | D-1, D-2, D-4, D-5, D-6, C-3 | Client + RLS for reactions. Server routes for the score, vetoes, auto-lock and chat import. |
| **Fairness engine** | A-1, A-2, D-3, A-4 | **Server only** (`lib/fairness.ts`) |
| AI layer | A-1, D-5, D-6, M-3, T-1 | **Server only** (`lib/ai.ts`) |
| Money | C-4, M-3, M-4, M-5, M-6, M-7 | Client + RLS for expenses. `lib/settle.ts` is pure code that can run on either side. Room pricing runs on the server, because valuations are private. |
| Trip Jar | M-1 | Client + RLS (owner only). The group readiness count comes from a Postgres function. |
| During the trip | T-1 … T-8, S-2 | Client + RLS. Server for re-planning and parent links. |
| Wrapped | W-1, W-2 | Server route that computes from existing tables. No extra tables. |

---

## Where code runs (the hybrid rule)

**Rule:** if an operation reads someone else's private row, or calls Claude, it runs on the server. Everything else talks to Supabase directly under RLS.

| Goes directly to Supabase (RLS) | Goes through a Next.js server route | Postgres function (`security definer`) |
|---|---|---|
| | Seed the demo trip | `create_trip`, `join_trip(code, name)`, `confirm_pledge` (mocked) |
| Trips, members, itinerary stops | Generate the AI plan (fairness) | `jar_readiness(trip)` → "X of Y on track" |
| Options, aspects, reactions, comments | Use a veto (anonymous) | `mood_summary(trip, day)` → average + counts |
| Expenses, shares, settlements | Auto-lock decision + AI compromise | `fairness_bars(plan)` → sorted scores, no IDs |
| My own budget, Jar, preferences, signals | Chat-to-plan import | `option_fit(option)` → fits everyone's budget? yes/no |
| Tasks, packing list, photos, docs, chat | Fair room pricing | `option_scores(decision)` → group fit scores |
| | Dropout recalculation | `is_trip_member`, `is_trip_organizer`, `my_member_id` (used by RLS) |
| | Live re-planning | |
| | Parent page `/p/[token]` (server component) | |
| | Trip Wrapped data (server component) | |

Not built yet: receipt scan (vision).

Server routes are **internal**. They exist for this app only and are not a public API. Unlike Hospass, Kafila has no outside integrators, so they need no versioning or public contract.

### Server routes (Node.js, as built)

```text
POST /api/demo                         seed a sample Goa trip for the caller → { tripId }
POST /api/trips/[id]/plan              generate candidates → pick fairest → save
POST /api/trips/[id]/options/[oid]/veto
POST /api/trips/[id]/decisions/[did]/lock
POST /api/trips/[id]/import-chat       body: WhatsApp .txt → proposed options (not saved until the organizer reviews them)
POST /api/trips/[id]/rooms/price       → bed assignment + prices
POST /api/trips/[id]/members/[mid]/drop  → new cost per head, rooms, budget re-check
POST /api/trips/[id]/replan            trigger: rain | tired | delay → proposal
PUT  /api/trips/[id]/replan            accept the proposal
GET  /p/[token]                        parent page (server component)
GET  /auth/callback                    Google sign-in callback
```

The budget-fit check is the Postgres function `option_fit`, not a route (migration `0002_decide.sql`). Trip Wrapped is a server component that reads existing tables.

Every route checks the following, in this order:
1. The caller has a valid Supabase session.
2. The caller is a member of the trip.
3. The caller's role allows the action.

Only after all three may the route use the service-role client.

---

## Key flows

### 1. AI plan generation (A-1, A-2, D-3): the flow the demo depends on

```text
client → POST /api/trips/:id/plan
server (service role) loads:
  members + home cities, PRIVATE budgets, PRIVATE preferences, reactions/Roses, vetoes, locked stops
Claude (structured output) → 3–5 candidate plans as JSON:
  stops[] each with tags[] + cost, stay, travel cost per origin city
code (lib/fairness.ts), no LLM:
  cost_i     = travel(home_city_i) + share of group costs
  keep candidates where cost_i ≤ budget_i for EVERY member
  s_i        = score(member_i preferences, candidate tags)  ∈ [0,1]
  pick       = argmax min(s_i), tie → highest mean(s_i)
  why_i      = template from member_i's matched tags (no second LLM call)
save: plans, stops, plan_members (cost_i, s_i, why_i: owner-only)
realtime → every phone refreshes; each member reads only their own plan_members row
```

- **No plan fits everyone:** the route returns `{ status: "no_fit" }` and the organizer sees "No plan fits everyone's budget. Try fewer days, a cheaper destination or a different stay." It never says **whose** budget failed.
- **Why the LLM only proposes and code decides:** this makes fairness deterministic, explainable and testable, and it keeps the time under 20 s because there is only one Claude call.
- **One scoring function:** `score()` is reused for the compatibility score (D-2), stay fit (C-3) and the taste profile (W-2).

### 2. Budget privacy

- `member_private` holds the budget and preference answers. Its RLS rule is `member.user_id = auth.uid()`, for select and for update.
- Other members can never read it. Only the server (service role) and that member can.
- An option card shows "fits everyone ✓/✗", computed on the server (route `fit`). It returns a yes/no answer, never a number.
- With fewer than 3 members, the budget screen warns that a budget could be inferred.
- **Known leak (accepted):** because cards show yes/no for options at different prices, members can roughly narrow down the lowest budget. We accept this for the MVP, and the budget screen says so.

### 3. Money (C-4, M-3, M-5, M-6)

- An expense records who paid and a total. `expense_shares` holds what each member owes for it, and is **always** written, even for equal splits. That makes balances a single SQL sum.
- Item-level split: receipt image → Claude vision → draft `expense_items` → members tap the items they shared → tax and tip are split in proportion → shares are written.
- Balance = paid − owed − sent settlements + received settlements (a SQL view).
- Settle-up: `lib/settle.ts` runs greedy min-cash-flow, giving at most N−1 payments. A "Pay" button opens `upi://pay?pa=…&am=…&cu=INR&tn=…`, the payer marks it as paid, and that creates a `settlements` row.
- Money is stored in **paise as integers** (`bigint`) and never as floats. ₹7,500 is stored as `750000`.

### 4. Dropout (M-8)

Drop route: the member's status becomes `dropped`. Then the server:
1. Recomputes cost per head from the active plan.
2. Re-runs bed pricing.
3. Re-checks **every remaining member's private budget**.
4. Applies the pledge rule.

Everyone sees "+₹X per person". If someone is now over budget, the organizer sees only "This change puts the plan over someone's budget."

### 5. Parent mode (T-3)

- The member creates a `parent_links` row, and its token is a random 32-byte value.
- `/p/[token]` is a server component that uses the service role. It returns only that trip's itinerary, plus that member's last location if they turned location sharing on.
- Revoking sets `revoked_at`, after which the page returns 404.

---

## AI layer (`lib/ai.ts`)

- Kafila makes single Claude calls with **structured outputs** (`output_config.format` with a JSON schema). It doesn't need agents or tool loops.
- **Model:** `claude-opus-5-5`, read from the env var `CLAUDE_MODEL`, so changing it is a config change. Set `effort` per call: `low` for receipts and chat extraction, `medium` for plans. Tune it against the 20 s target.
- **Refusals:** use the server-side `fallbacks: "default"` option and always check `stop_reason` before reading the output.
- **Demo safety:** with `DEMO_MODE=1`, every AI function returns fixtures from `lib/ai/fixtures/*.json` (the seeded Goa trip). This is the cached response from the PRD in case the API is slow on stage.
- **What Claude sees:** the budget ceiling and preference tags, not names (members are labelled "M1…M6"). The chat import sends the raw chat, which is then discarded and never stored.
- The API key lives only in `ANTHROPIC_API_KEY` on the server. The browser never calls Claude.

---

## Realtime

Subscribe one channel per trip to: `stops`, `options`, `reactions`, `comments`, `expenses`, `expense_shares`, `settlements`, `members`, `tasks`, `packing_items`, `messages`, `plans`.

**Never** add the private tables to the realtime publication. If a private table were added, Supabase would still enforce RLS on its realtime events, but leaving them out removes the risk completely.

---

## Folder layout

```text
app/
  (auth)/join/[code]/page.tsx        invite link → guest or Google
  trips/[id]/{page,plan,money,memories}/...
  p/[token]/page.tsx                 parent view
  api/trips/[id]/.../route.ts        server routes above
lib/
  supabase/{client,server,admin}.ts  admin = service role, server-only
  fairness.ts  settle.ts  rooms.ts   pure functions + *.test.ts
  ai.ts  ai/fixtures/
  money.ts                           paise ↔ ₹ display (Indian grouping)
supabase/
  migrations/0001_init.sql           schema + RLS
  seed.sql                           "Goa with friends" demo trip
public/manifest.json                 PWA
.env.example
```

`lib/supabase/admin.ts` starts with `import "server-only"`. Next.js then fails the build if client code imports it.

---

## Environment variables

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=   # sb_publishable_… (Supabase's new name for the anon key)
SUPABASE_SECRET_KEY=              # sb_secret_… (replaces service_role), server only
ANTHROPIC_API_KEY=                # server only
CLAUDE_MODEL=claude-opus-5-5
DEMO_MODE=0
```

---

## Security principles

- Never commit `.env*` files except `.env.example`. Keep API keys, the service-role key and OAuth secrets out of the repo.
- Every table has RLS **enabled**. A table without a policy is unreadable, which is the safe default.
- The service-role client is used only in server routes, and only after the membership check.
- Uploaded receipts, photos and documents go into private Storage buckets, readable by trip members through signed URLs.
- Invite codes and parent tokens are random and unguessable. Parent tokens can be revoked.
- Live location is opt-in and can be revoked. Chat import asks the organizer to confirm the group consented, and raw chats are never stored.

---

## Ask before changing

Ask the team (owner: _[name]_) before changing:

- the database schema or RLS policies
- auth or join flow
- anything that reads or exposes private data
- the fairness algorithm or scoring weights
- payments: UPI links, pledge, Jar
- the LLM model or provider
- production infrastructure, secrets, or destructive scripts

---

## Open items

1. Git repo and workflow. The folder isn't a git repo yet. Decide whether to use a fork or a shared repo with PRs.
2. Team owners for each module.
3. Satisfaction scoring weights (quiz vs likes vs Roses ×3). Needed on Day 1.
4. Database schema: see `DB-SCHEMA.md`.
