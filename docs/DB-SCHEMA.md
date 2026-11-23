# Kafila DB Schema

The runnable source of truth is `supabase/migrations/0001_init.sql`. This page is the overview for reviewing it.

**Conventions**
- Every id is a `uuid`.
- **Money is stored in paise as `bigint`.** For example, ₹7,500 is stored as `750000`. Never use floats for money.
- **Every trip-scoped table has a `trip_id` column.** This gives one RLS rule everywhere, and realtime can filter with `trip_id=eq.<id>`.
- Status-like columns are `text` + `check (...)` rather than Postgres enums, because they're easier to change mid-hackathon.

## Decisions behind this schema

| Question | Choice |
|---|---|
| Scope | All stages (1–3) in one migration |
| Preference answers | **Private** (owner and server only) |
| Likes and Roses | **Named** (Hinge-style). Vetoes are anonymous. |
| Rooms | Shared rooms with a number of `beds`. Fair pricing assigns beds. |
| Trip cost | Per person: `travel_paise` + share of group costs, in `plan_members` |
| Pledge | Mocked as a `settlements` row (`kind='pledge'`), so it counts toward the member's share automatically |

## Tables (34)

```text
trips ─┬─ members ─┬─ member_private 🔒          (budget, prefs)
       │           ├─ jars 🔒 ── jar_deposits 🔒
       │           ├─ mood_checkins 🔒, signals 🔒
       │           ├─ parent_links 🔒, locations 🔒
       │           └─ availability
       ├─ decisions ── options ─┬─ option_aspects
       │                        ├─ reactions (like / rose), comments
       │                        ├─ vetoes 🔒
       │                        └─ rooms ─┬─ room_valuations 🔒
       │                                  └─ bed_assignments
       ├─ plans ─┬─ stops ── stop_ratings
       │         └─ plan_members 🔒       (cost, satisfaction, "why")
       ├─ expenses ─┬─ expense_shares
       │            └─ expense_items ── expense_item_claims
       ├─ settlements                      (settle / pledge / refund)
       ├─ tasks, packing_items
       └─ photos, documents, messages
emergency_contacts 🔒 (per user, not per trip)
view: balances        (positive = the group owes this member)
```

🔒 = private: the owner and the server only.

| Stage | Tables |
|---|---|
| 1 | trips, members, member_private, decisions, options, option_aspects, reactions, comments, vetoes, plans, stops, plan_members, expenses, expense_shares, expense_items, expense_item_claims, settlements, jars, jar_deposits |
| 2 | rooms, room_valuations, bed_assignments, tasks, packing_items, mood_checkins, signals, parent_links, locations |
| 3 | availability, photos, documents, messages, stop_ratings, emergency_contacts (+ `trips.previous_trip_id` for W-2) |

Features with **no table** (computed instead): D-2 score (a cached column on `options`), D-6 Chat-to-plan (its output becomes `options`), A-3 split days (`stops.branch`), A-4 meet in the middle (`members.home_city`), M-7 private budget tracker (own budget vs own shares), M-8 dropout (a server route), W-1 Wrapped (computed from the existing tables).

## Who can see what (RLS)

| Access group | Tables | Read | Write |
|---|---|---|---|
| Shared | stops, option_aspects, expenses, expense_shares, expense_items, expense_item_claims, settlements, rooms, tasks, packing_items, documents | Trip members | Trip members |
| Own-write | reactions, comments, messages, availability, stop_ratings, photos | Trip members | Only your own rows |
| **Private** | member_private, room_valuations, jars, jar_deposits, mood_checkins, signals, parent_links, locations, emergency_contacts | **Owner only** | Owner only |
| **Private, server-written** | plan_members, vetoes | **Owner reads own** | Server only |
| Server-written | plans, bed_assignments | Trip members | Server (members can set `accepted` on their own bed) |
| Special | trips, members, decisions, options | Trip members | Column-limited (below) |

Column limits are enforced with column `GRANT`s, so RLS can't be bypassed by sending extra fields:
- **trips:** organizers can edit the name, dates, destination, `booking_date`, pledge and status. `active_plan_id` is set by the server only.
- **members:** you edit your own name, colour, `home_city`, `upi_vpa` and `task_role`. An organizer can edit anyone's. `role`, `status` and the pledge change only through RPCs or the server.
- **options:** the creator or an organizer edits content. `compat_score` and the veto columns are set by the server only.
- **decisions:** organizers create them and edit the question, kind and deadline. Locking happens on the server.

## Functions (browser-callable RPCs)

| Function | What it does |
|---|---|
| `create_trip(name, display_name)` | Creates the trip, makes you its organizer and creates an empty manual plan |
| `join_trip(code, display_name)` | Joins by invite code (max 12 members). Joining twice does nothing. |
| `confirm_pledge(trip)` | Mocked payment. Sets you to confirmed and records the pledge as paid to the organizer. |
| `jar_readiness(trip)` | Returns `(on_track, total)`, never amounts |
| `mood_summary(trip, day)` | Returns the average energy (hidden below 3 check-ins) and signal counts, never names |
| `fairness_bars(plan)` | Returns sorted satisfaction scores with no member ids |

`is_trip_member`, `is_trip_organizer` and `my_member_id` are helpers used by RLS. Every function is `security definer` with an empty `search_path`, and every one is revoked from `anon`.

## Storage

The private buckets are `receipts`, `photos` and `documents`. Each object path has to start with `<trip_id>/`. Trip members can read and upload, and only the uploader can delete.

## Realtime

Published: trips, members, plans, stops, options, option_aspects, reactions, comments, decisions, expenses, expense_shares, expense_items, expense_item_claims, settlements, bed_assignments, tasks, packing_items, messages, photos.
**Private tables are deliberately not published.**

## Known shortcuts

- **Friends-trust model:** any member can edit shared rows (expenses, stops), not only the person who created them. Tighten this if it gets abused.
- **`SUM(expense_shares) = expense.amount` is kept by the app, not by a constraint.** `lib/money.ts` needs a test for it.
- **`trip_id` consistency on child rows isn't enforced with composite foreign keys.** A row's `trip_id` could point to a different trip than its parent row's.
- **The 12-member cap in `join_trip` can race** if two people join at the same instant. This is harmless at hackathon scale.

## Tests

`supabase/tests/rls.sql` checks budget privacy, locked columns, Rose limits, the pledge and balances, Jar readiness, the fairness bars, the mood summary, and that outsiders and logged-out users are blocked. It runs inside a transaction and rolls back at the end, so it leaves nothing behind. Run it after any schema change:

```text
psql "<db url>" -v ON_ERROR_STOP=1 -f supabase/tests/rls.sql   →   ALL RLS CHECKS PASSED
```

Last run: 23 Nov 2026 on `supabase/postgres:17.12.0.002`. All checks passed. I also added a fake budget leak on purpose, and the test caught it. Storage policies weren't tested, because that image has no storage schema.

## Not yet

- `supabase/seed.sql`, the "Goa with friends" demo trip (Day 6).
- Indian public holidays for D-7 will be a static JSON file in code, not a table.
