-- Kafila: initial schema + Row Level Security
-- Design notes: docs/DB-SCHEMA.md · Architecture: docs/ARCHITECTURE.md
-- Conventions: uuid ids, money in paise as bigint (₹7,500 = 750000), every trip-scoped row
-- carries trip_id (one RLS rule everywhere + realtime filter `trip_id=eq.<id>`).
-- Server routes use the service-role key, which bypasses RLS; everything below governs the browser.

create extension if not exists pgcrypto with schema extensions;

-- ═══════════════════════════════ Stage 1: trips & members ═══════════════════════════════

create table public.trips (
  id               uuid primary key default gen_random_uuid(),
  name             text not null check (length(name) between 1 and 80),
  destination      text,
  start_date       date,
  end_date         date,
  booking_date     date,                                 -- Trip Jar deadline (M-1)
  pledge_paise     bigint not null default 50000 check (pledge_paise >= 0),  -- M-2, default ₹500
  status           text not null default 'planning' check (status in ('planning','booked','ongoing','done')),
  invite_code      text not null unique default encode(extensions.gen_random_bytes(10), 'hex'),
  active_plan_id   uuid,                                 -- FK added after plans
  previous_trip_id uuid references public.trips(id) on delete set null,  -- W-2 taste profile
  created_by       uuid not null references auth.users(id),
  created_at       timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create table public.members (
  id             uuid primary key default gen_random_uuid(),
  trip_id        uuid not null references public.trips(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  display_name   text not null check (length(display_name) between 1 and 40),
  avatar_color   text,
  home_city      text,                                   -- per-person travel cost, A-4
  upi_vpa        text,                                   -- needed for UPI pay links (M-6)
  role           text not null default 'member' check (role in ('organizer','member')),
  task_role      text,                                   -- S-1: Treasurer, Navigator, …
  status         text not null default 'maybe' check (status in ('maybe','confirmed','dropped')),
  pledge_paid_at timestamptz,                            -- M-2 (mocked payment)
  joined_at      timestamptz not null default now(),
  unique (trip_id, user_id)
);

-- PRIVATE: budget + preference answers. Owner and server only (D-3).
create table public.member_private (
  member_id    uuid primary key references public.members(id) on delete cascade,
  trip_id      uuid not null references public.trips(id) on delete cascade,
  budget_paise bigint check (budget_paise > 0),
  prefs        jsonb not null default '{}',              -- {"veg": 1, "cafes": 0.8, "early_mornings": -1}; read whole by lib/fairness
  updated_at   timestamptz not null default now()
);

-- ═══════════════════════════════ Stage 1: deciding together ═══════════════════════════════

create table public.decisions (                          -- D-5 deadlines; groups options
  id               uuid primary key default gen_random_uuid(),
  trip_id          uuid not null references public.trips(id) on delete cascade,
  question         text not null,
  kind             text not null check (kind in ('destination','stay','activity','food','transport','dates','other')),
  deadline         timestamptz,
  locked_option_id uuid,                                 -- FK added after options
  locked_at        timestamptz,
  created_at       timestamptz not null default now()
);

create table public.options (                            -- D-1 cards; stays for C-3 are kind='stay'
  id             uuid primary key default gen_random_uuid(),
  trip_id        uuid not null references public.trips(id) on delete cascade,
  decision_id    uuid references public.decisions(id) on delete set null,
  kind           text not null check (kind in ('destination','stay','activity','food','transport','other')),
  title          text not null,
  description    text,
  price_paise    bigint check (price_paise >= 0),        -- total price (stays: whole stay)
  image_url      text,
  lat            double precision,
  lng            double precision,
  tags           text[] not null default '{}',           -- matched against prefs by score()
  source         text not null default 'member' check (source in ('seed','ai','chat','member')),
  compat_score   smallint check (compat_score between 0 and 100),  -- D-2, written by server
  vetoed_at      timestamptz,                            -- D-4, written by server
  vetoed_by_name text,                                   -- only if the vetoer chose to show it
  created_by     uuid references public.members(id) on delete set null,
  created_at     timestamptz not null default now()
);

alter table public.decisions
  add foreign key (locked_option_id) references public.options(id) on delete set null;

create table public.option_aspects (                     -- D-1: 2–4 per option
  id        uuid primary key default gen_random_uuid(),
  trip_id   uuid not null references public.trips(id) on delete cascade,
  option_id uuid not null references public.options(id) on delete cascade,
  label     text not null,                               -- "The pool", "Location"
  kind      text not null default 'other' check (kind in ('photo','location','price','amenity','vibe','other')),
  value     text,
  image_url text,
  position  smallint not null default 0
);

create table public.reactions (                          -- D-1 likes + Roses (names visible)
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips(id) on delete cascade,
  option_id  uuid not null references public.options(id) on delete cascade,
  aspect_id  uuid references public.option_aspects(id) on delete cascade,  -- null = whole option
  member_id  uuid not null references public.members(id) on delete cascade,
  kind       text not null check (kind in ('like','rose')),
  created_at timestamptz not null default now(),
  unique nulls not distinct (member_id, option_id, aspect_id, kind)
);
create unique index one_rose_per_member on public.reactions (trip_id, member_id) where kind = 'rose';

create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips(id) on delete cascade,
  option_id  uuid not null references public.options(id) on delete cascade,
  aspect_id  uuid references public.option_aspects(id) on delete cascade,
  member_id  uuid not null references public.members(id) on delete cascade,
  body       text not null check (length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

-- PRIVATE: who vetoed. Server inserts (enforces 2/3 per trip) and sets options.vetoed_at.
create table public.vetoes (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips(id) on delete cascade,
  option_id  uuid not null references public.options(id) on delete cascade,
  member_id  uuid not null references public.members(id) on delete cascade,
  show_name  boolean not null default false,
  created_at timestamptz not null default now(),
  unique (member_id, option_id)
);

-- ═══════════════════════════════ Stage 1: plans & itinerary ═══════════════════════════════

create table public.plans (                              -- A-1 candidates; T-1 re-plans (from_day set)
  id                uuid primary key default gen_random_uuid(),
  trip_id           uuid not null references public.trips(id) on delete cascade,
  status            text not null default 'candidate' check (status in ('candidate','chosen','discarded')),
  generated_by      text not null default 'manual' check (generated_by in ('ai','manual')),
  from_day          smallint check (from_day >= 1),      -- null = whole trip
  replan_trigger    text check (replan_trigger in ('rain','tired','delay')),
  stay_option_id    uuid references public.options(id) on delete set null,
  group_cost_paise  bigint check (group_cost_paise >= 0),  -- shared costs, before travel
  min_satisfaction  numeric(4,3),                        -- fairness meter group minimum
  mean_satisfaction numeric(4,3),
  created_at        timestamptz not null default now()
);

alter table public.trips
  add foreign key (active_plan_id) references public.plans(id) on delete set null;

create table public.stops (                              -- C-2 itinerary (stops of trips.active_plan_id)
  id            uuid primary key default gen_random_uuid(),
  trip_id       uuid not null references public.trips(id) on delete cascade,
  plan_id       uuid not null references public.plans(id) on delete cascade,
  option_id     uuid references public.options(id) on delete set null,
  day           smallint not null check (day >= 1),
  position      integer not null default 0,
  starts_at     time,
  title         text not null,
  kind          text not null default 'activity' check (kind in ('activity','food','travel','stay','meetup')),
  location_name text,
  lat           double precision,
  lng           double precision,
  cost_paise    bigint not null default 0 check (cost_paise >= 0),
  tags          text[] not null default '{}',
  locked        boolean not null default false,          -- kept when the AI regenerates
  branch        text check (branch in ('A','B')),        -- A-3 split days; null = whole group
  created_at    timestamptz not null default now()
);

-- PRIVATE: per-member result of a plan. Owner reads own row; server writes.
create table public.plan_members (
  plan_id      uuid not null references public.plans(id) on delete cascade,
  member_id    uuid not null references public.members(id) on delete cascade,
  trip_id      uuid not null references public.trips(id) on delete cascade,
  travel_paise bigint not null default 0 check (travel_paise >= 0),
  total_paise  bigint not null check (total_paise >= 0),  -- travel + share of group costs
  satisfaction numeric(4,3) not null check (satisfaction between 0 and 1),
  why          text,                                     -- "why this works for you"
  primary key (plan_id, member_id)
);

-- ═══════════════════════════════ Stage 1: money ═══════════════════════════════

create table public.expenses (                           -- C-4
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references public.trips(id) on delete cascade,
  paid_by      uuid not null references public.members(id),
  title        text not null,
  amount_paise bigint not null check (amount_paise > 0),
  category     text not null default 'other' check (category in ('food','stay','travel','activity','shopping','other')),
  split_type   text not null default 'equal' check (split_type in ('equal','unequal','items')),
  receipt_path text,                                     -- storage: receipts/<trip_id>/…
  spent_on     date not null default current_date,
  created_by   uuid references public.members(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- Always written, whatever the split type, so balances are one SUM. App keeps SUM(shares) = amount.
create table public.expense_shares (
  expense_id   uuid not null references public.expenses(id) on delete cascade,
  member_id    uuid not null references public.members(id),
  trip_id      uuid not null references public.trips(id) on delete cascade,
  amount_paise bigint not null check (amount_paise >= 0),
  primary key (expense_id, member_id)
);

create table public.expense_items (                      -- M-3 receipt lines
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references public.trips(id) on delete cascade,
  expense_id   uuid not null references public.expenses(id) on delete cascade,
  name         text not null,
  amount_paise bigint not null check (amount_paise >= 0),
  kind         text not null default 'item' check (kind in ('item','tax','tip'))  -- tax/tip split in proportion
);

create table public.expense_item_claims (                -- "I had this"
  item_id   uuid not null references public.expense_items(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  trip_id   uuid not null references public.trips(id) on delete cascade,
  primary key (item_id, member_id)
);

create table public.settlements (                        -- M-5/M-6 payments; also M-2 pledges
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references public.trips(id) on delete cascade,
  from_member  uuid not null references public.members(id),
  to_member    uuid not null references public.members(id),
  amount_paise bigint not null check (amount_paise > 0),
  kind         text not null default 'settle' check (kind in ('settle','pledge','refund')),
  status       text not null default 'pending' check (status in ('pending','paid')),
  created_at   timestamptz not null default now(),
  paid_at      timestamptz,
  check (from_member <> to_member)
);

-- PRIVATE: Trip Jar (M-1). Group only sees jar_readiness().
create table public.jars (
  member_id    uuid primary key references public.members(id) on delete cascade,
  trip_id      uuid not null references public.trips(id) on delete cascade,
  goal_paise   bigint not null check (goal_paise > 0),
  weekly_paise bigint not null check (weekly_paise > 0),
  autopay      boolean not null default false,           -- mocked in MVP
  created_at   timestamptz not null default now()
);

create table public.jar_deposits (
  id           uuid primary key default gen_random_uuid(),
  member_id    uuid not null references public.members(id) on delete cascade,
  trip_id      uuid not null references public.trips(id) on delete cascade,
  amount_paise bigint not null check (amount_paise > 0),
  created_at   timestamptz not null default now()
);

-- ═══════════════════════════════ Stage 2: rooms, load sharing, during the trip ═══════════════════════════════

create table public.rooms (                              -- M-4 shared rooms
  id        uuid primary key default gen_random_uuid(),
  trip_id   uuid not null references public.trips(id) on delete cascade,
  option_id uuid references public.options(id) on delete cascade,  -- the stay
  name      text not null,
  beds      smallint not null check (beds >= 1)
);

-- PRIVATE: what a member would pay for one bed in this room.
create table public.room_valuations (
  room_id     uuid not null references public.rooms(id) on delete cascade,
  member_id   uuid not null references public.members(id) on delete cascade,
  trip_id     uuid not null references public.trips(id) on delete cascade,
  value_paise bigint not null check (value_paise >= 0),
  primary key (room_id, member_id)
);

create table public.bed_assignments (                    -- server output of envy-free pricing
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips(id) on delete cascade,
  room_id     uuid not null references public.rooms(id) on delete cascade,
  member_id   uuid not null references public.members(id) on delete cascade,
  price_paise bigint not null check (price_paise >= 0),
  accepted    boolean not null default false,
  unique (trip_id, member_id)
);

create table public.tasks (                              -- S-1
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references public.trips(id) on delete cascade,
  title        text not null,
  owner_member uuid references public.members(id) on delete set null,
  done         boolean not null default false,
  created_at   timestamptz not null default now()
);

create table public.packing_items (                      -- S-2: one row per claim; duplicates = same lower(name)
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips(id) on delete cascade,
  name       text not null,
  member_id  uuid references public.members(id) on delete set null,  -- null = unclaimed
  created_at timestamptz not null default now()
);

-- PRIVATE: mood pulse + anonymous signals (T-2). Group only sees mood_summary().
create table public.mood_checkins (
  member_id uuid not null references public.members(id) on delete cascade,
  trip_id   uuid not null references public.trips(id) on delete cascade,
  day       date not null default current_date,
  energy    smallint not null check (energy between 1 and 5),
  primary key (member_id, day)
);

create table public.signals (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips(id) on delete cascade,
  member_id  uuid not null references public.members(id) on delete cascade,
  kind       text not null check (kind in ('need_break','low_cash')),
  created_at timestamptz not null default now()
);

-- PRIVATE: parent mode (T-3). /p/[token] reads via service role.
create table public.parent_links (
  id             uuid primary key default gen_random_uuid(),
  trip_id        uuid not null references public.trips(id) on delete cascade,
  member_id      uuid not null references public.members(id) on delete cascade,
  token          text not null unique default encode(extensions.gen_random_bytes(32), 'hex'),
  share_location boolean not null default false,
  revoked_at     timestamptz,
  created_at     timestamptz not null default now()
);

create table public.locations (                          -- last known location, opt-in (T-3, T-5)
  member_id  uuid primary key references public.members(id) on delete cascade,
  trip_id    uuid not null references public.trips(id) on delete cascade,
  lat        double precision not null,
  lng        double precision not null,
  updated_at timestamptz not null default now()
);

-- ═══════════════════════════════ Stage 3: extended ═══════════════════════════════

create table public.availability (                       -- D-7 busy dates (visible to group)
  member_id uuid not null references public.members(id) on delete cascade,
  trip_id   uuid not null references public.trips(id) on delete cascade,
  busy_on   date not null,
  primary key (member_id, busy_on)
);

create table public.photos (                             -- T-4, feeds W-1
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references public.trips(id) on delete cascade,
  member_id    uuid not null references public.members(id) on delete cascade,
  storage_path text not null,                            -- photos/<trip_id>/…
  taken_at     timestamptz,                              -- from EXIF
  created_at   timestamptz not null default now()
);

create table public.documents (                          -- T-8
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references public.trips(id) on delete cascade,
  member_id    uuid not null references public.members(id) on delete cascade,
  title        text not null,
  storage_path text not null,                            -- documents/<trip_id>/…
  for_day      date,
  created_at   timestamptz not null default now()
);

create table public.messages (                           -- T-7
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips(id) on delete cascade,
  member_id  uuid not null references public.members(id) on delete cascade,
  body       text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table public.stop_ratings (                       -- W-2
  stop_id   uuid not null references public.stops(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  trip_id   uuid not null references public.trips(id) on delete cascade,
  rating    smallint not null check (rating between 1 and 5),
  primary key (stop_id, member_id)
);

create table public.emergency_contacts (                 -- T-5, per user (not per trip)
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name    text not null,
  phone   text not null
);

-- ═══════════════════════════════ Helper functions (used by RLS) ═══════════════════════════════
-- security definer so they can read members without recursing into members' own RLS.

create function public.is_trip_member(p_trip uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members where trip_id = p_trip and user_id = auth.uid());
$$;

create function public.is_trip_organizer(p_trip uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members where trip_id = p_trip and user_id = auth.uid() and role = 'organizer');
$$;

create function public.my_member_id(p_trip uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.members where trip_id = p_trip and user_id = auth.uid();
$$;

-- ═══════════════════════════════ RPCs (called from the browser) ═══════════════════════════════

create function public.create_trip(p_name text, p_display_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_trip uuid; v_plan uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into public.trips (name, created_by) values (p_name, auth.uid()) returning id into v_trip;
  insert into public.members (trip_id, user_id, display_name, role, status)
    values (v_trip, auth.uid(), p_display_name, 'organizer', 'confirmed');
  insert into public.plans (trip_id, status, generated_by) values (v_trip, 'chosen', 'manual') returning id into v_plan;
  update public.trips set active_plan_id = v_plan where id = v_trip;
  return v_trip;
end $$;

create function public.join_trip(p_code text, p_display_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_trip uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select id into v_trip from public.trips where invite_code = p_code;
  if v_trip is null then raise exception 'invalid invite link'; end if;
  if exists (select 1 from public.members where trip_id = v_trip and user_id = auth.uid()) then
    return v_trip;                                       -- already in: joining twice is a no-op
  end if;
  if (select count(*) from public.members where trip_id = v_trip and status <> 'dropped') >= 12 then
    raise exception 'trip is full (12 members max)';
  end if;
  insert into public.members (trip_id, user_id, display_name) values (v_trip, auth.uid(), p_display_name);
  return v_trip;
end $$;

-- M-2 (mocked payment): confirm + record the pledge as paid to the first organizer,
-- so it counts toward the member's share through the normal balance math.
create function public.confirm_pledge(p_trip uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public.my_member_id(p_trip); v_org uuid; v_amt bigint;
begin
  if v_me is null then raise exception 'not a member of this trip'; end if;
  select pledge_paise into v_amt from public.trips where id = p_trip;
  select id into v_org from public.members
    where trip_id = p_trip and role = 'organizer' order by joined_at limit 1;
  update public.members set status = 'confirmed', pledge_paid_at = now()
    where id = v_me and pledge_paid_at is null;
  if found and v_org <> v_me and v_amt > 0 then
    insert into public.settlements (trip_id, from_member, to_member, amount_paise, kind, status, paid_at)
      values (p_trip, v_me, v_org, v_amt, 'pledge', 'paid', now());
  end if;
end $$;

-- M-1: "X of Y on track", never amounts. On track = saved ≥ weekly × full weeks since the jar started (capped at goal).
create function public.jar_readiness(p_trip uuid) returns table (on_track integer, total integer)
language sql stable security definer set search_path = '' as $$
  select
    (select count(*)::int from public.jars j
       join public.members m on m.id = j.member_id and m.status <> 'dropped'
      where j.trip_id = p_trip
        and coalesce((select sum(d.amount_paise) from public.jar_deposits d where d.member_id = j.member_id), 0)
            >= least(j.goal_paise, j.weekly_paise * floor(extract(epoch from now() - j.created_at) / 604800)::bigint)),
    (select count(*)::int from public.members where trip_id = p_trip and status <> 'dropped')
  where public.is_trip_member(p_trip);
$$;

-- T-2: aggregates only. Average energy hidden below 3 check-ins so one person can't be singled out.
create function public.mood_summary(p_trip uuid, p_day date default current_date)
returns table (avg_energy numeric, checkins integer, need_break integer, low_cash integer)
language sql stable security definer set search_path = '' as $$
  select
    case when count(*) >= 3 then round(avg(c.energy), 1) end,
    count(*)::int,
    (select count(*)::int from public.signals s where s.trip_id = p_trip and s.kind = 'need_break' and s.created_at::date = p_day),
    (select count(*)::int from public.signals s where s.trip_id = p_trip and s.kind = 'low_cash'   and s.created_at::date = p_day)
  from public.mood_checkins c
  where c.trip_id = p_trip and c.day = p_day
  having public.is_trip_member(p_trip);                  -- no row at all for non-members
$$;

-- A-2 fairness meter: everyone's satisfaction, sorted, without member ids.
create function public.fairness_bars(p_plan uuid) returns setof numeric
language sql stable security definer set search_path = '' as $$
  select pm.satisfaction from public.plan_members pm
  where pm.plan_id = p_plan and public.is_trip_member(pm.trip_id)
  order by pm.satisfaction;
$$;

revoke execute on function
  public.is_trip_member(uuid), public.is_trip_organizer(uuid), public.my_member_id(uuid),
  public.create_trip(text, text), public.join_trip(text, text), public.confirm_pledge(uuid),
  public.jar_readiness(uuid), public.mood_summary(uuid, date), public.fairness_bars(uuid)
  from public, anon;
grant execute on function
  public.is_trip_member(uuid), public.is_trip_organizer(uuid), public.my_member_id(uuid),
  public.create_trip(text, text), public.join_trip(text, text), public.confirm_pledge(uuid),
  public.jar_readiness(uuid), public.mood_summary(uuid, date), public.fairness_bars(uuid)
  to authenticated;

-- ═══════════════════════════════ Balances ═══════════════════════════════
-- Positive = the group owes this member. security_invoker → caller's RLS applies.
create view public.balances with (security_invoker = true) as
select m.trip_id, m.id as member_id, m.display_name,
    coalesce((select sum(e.amount_paise) from public.expenses e where e.paid_by = m.id), 0)
  - coalesce((select sum(s.amount_paise) from public.expense_shares s where s.member_id = m.id), 0)
  + coalesce((select sum(t.amount_paise) from public.settlements t where t.from_member = m.id and t.status = 'paid'), 0)
  - coalesce((select sum(t.amount_paise) from public.settlements t where t.to_member   = m.id and t.status = 'paid'), 0)
  as balance_paise
from public.members m;

-- ═══════════════════════════════ Row Level Security ═══════════════════════════════
-- Table-level grants explicitly (some Supabase projects don't auto-grant new tables to the API roles).
-- Rows are still filtered by RLS below; column limits come from the revoke/grant pairs further down.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Every table gets RLS. A table with RLS on and no policy is unreadable: the safe default.
-- shortcut: friends-trust model — any member can edit shared trip data (expenses, stops…);
-- tighten to creator/organizer if abuse becomes a concern.

do $$
declare t text;
begin
  -- RLS on for all + index trip_id (Postgres doesn't index FKs; every policy filters on it)
  foreach t in array array[
    'trips','members','member_private','decisions','options','option_aspects','reactions','comments','vetoes',
    'plans','stops','plan_members','expenses','expense_shares','expense_items','expense_item_claims','settlements',
    'jars','jar_deposits','rooms','room_valuations','bed_assignments','tasks','packing_items','mood_checkins',
    'signals','parent_links','locations','availability','photos','documents','messages','stop_ratings','emergency_contacts'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    if t not in ('trips','emergency_contacts') then
      execute format('create index on public.%I (trip_id)', t);
    end if;
  end loop;

  -- SHARED: any trip member can read and write
  foreach t in array array[
    'stops','option_aspects','expenses','expense_shares','expense_items','expense_item_claims',
    'settlements','rooms','tasks','packing_items','documents'
  ] loop
    execute format('create policy "members read"   on public.%I for select to authenticated using (public.is_trip_member(trip_id))', t);
    execute format('create policy "members insert" on public.%I for insert to authenticated with check (public.is_trip_member(trip_id))', t);
    execute format('create policy "members update" on public.%I for update to authenticated using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id))', t);
    execute format('create policy "members delete" on public.%I for delete to authenticated using (public.is_trip_member(trip_id))', t);
  end loop;

  -- OWN-WRITE: everyone in the trip reads; you only write rows that are yours
  foreach t in array array['reactions','comments','messages','availability','stop_ratings','photos'] loop
    execute format('create policy "members read" on public.%I for select to authenticated using (public.is_trip_member(trip_id))', t);
    execute format('create policy "own insert"   on public.%I for insert to authenticated with check (member_id = public.my_member_id(trip_id))', t);
    execute format('create policy "own update"   on public.%I for update to authenticated using (member_id = public.my_member_id(trip_id)) with check (member_id = public.my_member_id(trip_id))', t);
    execute format('create policy "own delete"   on public.%I for delete to authenticated using (member_id = public.my_member_id(trip_id))', t);
  end loop;

  -- PRIVATE: only the owner, for everything. Nobody else, ever (server uses service role).
  foreach t in array array[
    'member_private','room_valuations','jars','jar_deposits','mood_checkins','signals','parent_links','locations'
  ] loop
    execute format('create policy "owner only" on public.%I for all to authenticated using (member_id = public.my_member_id(trip_id)) with check (member_id = public.my_member_id(trip_id))', t);
  end loop;

  -- PRIVATE, SERVER-WRITTEN: owner may read own row; only the server writes
  foreach t in array array['plan_members','vetoes'] loop
    execute format('create policy "owner reads own" on public.%I for select to authenticated using (member_id = public.my_member_id(trip_id))', t);
  end loop;

  -- SERVER-WRITTEN, GROUP-READABLE
  foreach t in array array['plans','bed_assignments'] loop
    execute format('create policy "members read" on public.%I for select to authenticated using (public.is_trip_member(trip_id))', t);
  end loop;
end $$;

-- trips: created via create_trip(); organizers edit; server sets active_plan_id
create policy "members read" on public.trips for select to authenticated using (public.is_trip_member(id));
create policy "organizer update" on public.trips for update to authenticated
  using (public.is_trip_organizer(id)) with check (public.is_trip_organizer(id));
create policy "organizer delete" on public.trips for delete to authenticated using (public.is_trip_organizer(id));
revoke update on public.trips from authenticated;
grant update (name, destination, start_date, end_date, booking_date, pledge_paise, status, previous_trip_id)
  on public.trips to authenticated;

-- members: join via join_trip(); edit own profile (organizer can edit anyone's task_role);
-- role / status / pledge change only through RPCs or the server (e.g. dropout recalculation)
create policy "members read" on public.members for select to authenticated using (public.is_trip_member(trip_id));
create policy "self or organizer update" on public.members for update to authenticated
  using (user_id = auth.uid() or public.is_trip_organizer(trip_id))
  with check (user_id = auth.uid() or public.is_trip_organizer(trip_id));
revoke update on public.members from authenticated;
grant update (display_name, avatar_color, home_city, upi_vpa, task_role) on public.members to authenticated;

-- decisions: organizers create/edit; server locks
create policy "members read" on public.decisions for select to authenticated using (public.is_trip_member(trip_id));
create policy "organizer insert" on public.decisions for insert to authenticated with check (public.is_trip_organizer(trip_id));
create policy "organizer update" on public.decisions for update to authenticated
  using (public.is_trip_organizer(trip_id)) with check (public.is_trip_organizer(trip_id));
create policy "organizer delete" on public.decisions for delete to authenticated using (public.is_trip_organizer(trip_id));
revoke update on public.decisions from authenticated;
grant update (question, kind, deadline) on public.decisions to authenticated;

-- options: anyone adds; creator or organizer edits; server owns score + veto columns
create policy "members read" on public.options for select to authenticated using (public.is_trip_member(trip_id));
create policy "members insert" on public.options for insert to authenticated
  with check (public.is_trip_member(trip_id) and created_by = public.my_member_id(trip_id)
              and compat_score is null and vetoed_at is null);
create policy "creator or organizer update" on public.options for update to authenticated
  using (created_by = public.my_member_id(trip_id) or public.is_trip_organizer(trip_id))
  with check (public.is_trip_member(trip_id));
create policy "creator or organizer delete" on public.options for delete to authenticated
  using (created_by = public.my_member_id(trip_id) or public.is_trip_organizer(trip_id));
revoke update on public.options from authenticated;
grant update (title, description, price_paise, image_url, lat, lng, tags, decision_id) on public.options to authenticated;

-- bed_assignments: you may accept your own bed
create policy "own accept" on public.bed_assignments for update to authenticated
  using (member_id = public.my_member_id(trip_id)) with check (member_id = public.my_member_id(trip_id));
revoke update on public.bed_assignments from authenticated;
grant update (accepted) on public.bed_assignments to authenticated;

-- emergency_contacts: per user
create policy "owner only" on public.emergency_contacts for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ═══════════════════════════════ Storage (private buckets, path = <trip_id>/<file>) ═══════════════════════════════

insert into storage.buckets (id, name, public) values
  ('receipts', 'receipts', false), ('photos', 'photos', false), ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "trip members read files" on storage.objects for select to authenticated
  using (bucket_id in ('receipts','photos','documents')
         and public.is_trip_member(((storage.foldername(name))[1])::uuid));
create policy "trip members upload files" on storage.objects for insert to authenticated
  with check (bucket_id in ('receipts','photos','documents')
              and public.is_trip_member(((storage.foldername(name))[1])::uuid));
create policy "uploader deletes files" on storage.objects for delete to authenticated
  using (bucket_id in ('receipts','photos','documents') and owner_id = auth.uid()::text);

-- ═══════════════════════════════ Realtime ═══════════════════════════════
-- Private tables are deliberately NOT published.
alter publication supabase_realtime add table
  public.trips, public.members, public.plans, public.stops, public.options, public.option_aspects,
  public.reactions, public.comments, public.decisions, public.expenses, public.expense_shares,
  public.expense_items, public.expense_item_claims, public.settlements, public.bed_assignments,
  public.tasks, public.packing_items, public.messages, public.photos;
