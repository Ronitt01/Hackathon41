# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Indian friend groups, aged 18–30 — college students and young professionals planning a trip together, mostly on their phones, usually coordinating in a WhatsApp group. Budgets inside one group vary, and the people with the tightest budgets rarely say so. One person tends to end up organising everything.

Hackathon judges are the audience for the demo, not the users: they must understand the value within seconds.

## Product Purpose

A group trip planner that handles the people, not just the logistics: friends create a trip, decide together, get a fair plan, save for it, travel, settle money and get a shareable recap. Success = fewer arguments, fewer dropouts, no awkward money talk, and less work for the organiser.

## Positioning

Other apps organise a trip; Kafila helps a group **agree** on one, fairly. Each person's budget stays private, and the plan is chosen so the least happy person is as happy as possible (maximin), within every private budget — with a personal "why this works for you" line. Competitors split money after the trip; Kafila also helps people save before it (Trip Jar) and split fairly during it (item-level splits, fewest payments, one-tap UPI).

The single moment a judge must feel in the first 30 seconds: **"Meera's budget is the lowest and nobody knows — yet the plan fits everyone."**

## Operating Context

- Joining happens from an invite link shared in WhatsApp; no install, guest (name only) or Google sign-in.
- Used on phones (360px and up) during planning and on the trip itself; desktop for the demo screen.
- Money is INR in Indian digit grouping (₹1,00,000); payments go through UPI apps via upi:// links.
- A 7-day hackathon build with a live demo and a backup "/demo" preview of later-stage features.

## Capabilities and Constraints

- Built: create/join trip, live member list, day-by-day itinerary, options with aspect likes / Rose / comments, group fit score and "fits everyone's budget" (aggregates only), private budget + preferences, stay comparison, expenses (equal / unequal / item-level), balances, fewest-payments settle-up, UPI pay links. In progress: fair AI plan, Trip Jar, Trip Wrapped.
- Privacy is enforced in the database (RLS): budgets, Jar amounts, satisfaction scores, vetoes and mood signals are visible only to their owner; the group only sees aggregates.
- Stack: Next.js 16 (App Router) + Tailwind v4 + shadcn (base-nova / Base UI) + Supabase; Claude for plan generation when a key is present.
- Mocked in the MVP: Trip Jar AutoPay, pledge payments, accommodation data. No real money is ever held.
- Undecided: the final product name (Kafila is a placeholder — see Brand Commitments).

## Brand Commitments

- **Name is still open.** "Kafila" (a caravan travelling together) is a working placeholder; keep the wordmark easy to swap.
- Working tagline: "Plan the trip, not the drama."

## Evidence on Hand

- Product docs: docs/Group-Travel-Platform-PRD.md, docs/MVP.md, docs/ARCHITECTURE.md, docs/DB-SCHEMA.md.
- Personas (illustrative, invented): Aarav the organiser, Meera the quiet budget, Kabir the maybe, Sana the specific one.
- No real users, testimonials, press or usage data exist yet — do not fabricate any.

## Product Principles

1. **Fair to the quietest person.** Every decision surface should protect the person least likely to speak up.
2. **Private by default, aggregate in public.** Never reveal one person's numbers; show the group only what it needs to decide.
3. **Less work for the organiser.** Share the load; automate the chasing.
4. **No awkward money moments.** Make paying, splitting and saving feel normal and quick.
5. **Value in seconds.** The core flow must be obvious to a first-time user and to a judge.
