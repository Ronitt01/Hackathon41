-- Privacy + money self-check for 0001_init.sql. Run as `postgres` against a fresh DB:
--   psql -v ON_ERROR_STOP=1 -f supabase/tests/rls.sql
-- A = organizer (Aarav), B = member (Meera), C = outsider. Every check raises 'FAIL: …' on failure.
\set ON_ERROR_STOP 1
\set A '00000000-0000-0000-0000-00000000000a'
\set B '00000000-0000-0000-0000-00000000000b'
\set C '00000000-0000-0000-0000-00000000000c'

begin;  -- everything rolls back at the end; the DB stays clean

insert into auth.users (id) values (:'A'), (:'B'), (:'C');

-- act as a signed-in user (what Supabase does per request)
create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

-- ── A creates a trip, B joins ──────────────────────────────────────────────
select pg_temp.act_as(:'A'); set local role authenticated;
select public.create_trip('Goa with friends', 'Aarav') as trip \gset
reset role;
select invite_code as code from public.trips where id = :'trip' \gset

select pg_temp.act_as(:'B'); set local role authenticated;
select public.join_trip(:'code', 'Meera') is not null as joined;
select public.join_trip(:'code', 'Meera') = :'trip'::uuid as join_twice_noop;
reset role;
select id as mem_a from public.members where user_id = :'A' \gset
select id as mem_b from public.members where user_id = :'B' \gset
select set_config('t.trip', :'trip', true), set_config('t.mem_a', :'mem_a', true), set_config('t.mem_b', :'mem_b', true);

-- ── Budgets are private (D-3) ──────────────────────────────────────────────
select pg_temp.act_as(:'A'); set local role authenticated;
insert into public.member_private (member_id, trip_id, budget_paise) values (:'mem_a', :'trip', 1500000);
reset role;
select pg_temp.act_as(:'B'); set local role authenticated;
insert into public.member_private (member_id, trip_id, budget_paise) values (:'mem_b', :'trip', 800000);
do $$ begin
  if (select count(*) from public.member_private) <> 1 then raise exception 'FAIL: B sees other budgets'; end if;
  if (select budget_paise from public.member_private) <> 800000 then raise exception 'FAIL: B cannot see own budget'; end if;
  -- B cannot write a budget row for A
  begin
    insert into public.member_private (member_id, trip_id, budget_paise)
      values (current_setting('t.mem_a')::uuid, current_setting('t.trip')::uuid, 1);
    raise exception 'FAIL: B wrote A''s private row';
  exception when insufficient_privilege then null; when unique_violation then raise exception 'FAIL: B reached A''s private row'; end;
  raise notice 'ok: budgets private';
end $$;

-- ── Locked columns ─────────────────────────────────────────────────────────
do $$ begin
  begin
    update public.members set role = 'organizer' where id = current_setting('t.mem_b')::uuid;
    raise exception 'FAIL: B promoted self to organizer';
  exception when insufficient_privilege then null; end;
  update public.members set upi_vpa = 'meera@upi' where id = current_setting('t.mem_b')::uuid;
  begin
    update public.trips set active_plan_id = null where id = current_setting('t.trip')::uuid;
    raise exception 'FAIL: member set active_plan_id';
  exception when insufficient_privilege then null; end;
  raise notice 'ok: role / active_plan_id locked, own profile editable';
end $$;

-- ── Options, Roses, server-owned columns (D-1, D-2) ────────────────────────
insert into public.options (trip_id, kind, title, price_paise, created_by)
  values (:'trip', 'stay', 'Casa Anjuna', 2400000, :'mem_b') returning id as opt \gset
select set_config('t.opt', :'opt', true);
insert into public.reactions (trip_id, option_id, member_id, kind) values (:'trip', :'opt', :'mem_b', 'rose');
do $$ begin
  begin
    insert into public.reactions (trip_id, option_id, member_id, kind)
      values (current_setting('t.trip')::uuid, current_setting('t.opt')::uuid, current_setting('t.mem_b')::uuid, 'like'),
             (current_setting('t.trip')::uuid, current_setting('t.opt')::uuid, current_setting('t.mem_b')::uuid, 'like');
    raise exception 'FAIL: duplicate like allowed';
  exception when unique_violation then null; end;
  begin
    insert into public.options (trip_id, kind, title, created_by)
      values (current_setting('t.trip')::uuid, 'activity', 'Spice farm', current_setting('t.mem_b')::uuid) ;
    insert into public.reactions (trip_id, option_id, member_id, kind)
      select current_setting('t.trip')::uuid, id, current_setting('t.mem_b')::uuid, 'rose' from public.options where title = 'Spice farm';
    raise exception 'FAIL: second Rose allowed';
  exception when unique_violation then null; end;
  begin
    insert into public.reactions (trip_id, option_id, member_id, kind)
      values (current_setting('t.trip')::uuid, current_setting('t.opt')::uuid, current_setting('t.mem_a')::uuid, 'like');
    raise exception 'FAIL: B reacted as A';
  exception when insufficient_privilege then null; end;
  begin
    update public.options set compat_score = 100 where id = current_setting('t.opt')::uuid;
    raise exception 'FAIL: member set compat_score';
  exception when insufficient_privilege then null; end;
  raise notice 'ok: one like per aspect, one Rose per trip, no impersonation, score server-only';
end $$;
reset role;

-- ── Pledge + expenses + balances (M-2, C-4) ────────────────────────────────
select pg_temp.act_as(:'B'); set local role authenticated;
select public.confirm_pledge(:'trip');
select public.confirm_pledge(:'trip');  -- second call must not double-charge
insert into public.expenses (trip_id, paid_by, title, amount_paise) values (:'trip', :'mem_a', 'Dinner', 100000)
  returning id as exp \gset
insert into public.expense_shares (expense_id, member_id, trip_id, amount_paise)
  values (:'exp', :'mem_a', :'trip', 50000), (:'exp', :'mem_b', :'trip', 50000);
do $$ declare a bigint; b bigint; begin
  select balance_paise into a from public.balances where member_id = current_setting('t.mem_a')::uuid;
  select balance_paise into b from public.balances where member_id = current_setting('t.mem_b')::uuid;
  -- A paid 1000, owes 500, received 500 pledge → 0. B owes 500, paid 500 pledge → 0.
  if a <> 0 or b <> 0 then raise exception 'FAIL: balances A=% B=% (expected 0, 0)', a, b; end if;
  if (select status from public.members where id = current_setting('t.mem_b')::uuid) <> 'confirmed' then
    raise exception 'FAIL: pledge did not confirm B'; end if;
  raise notice 'ok: pledge counted once, balances net to zero';
end $$;

-- ── Jar readiness shows counts only (M-1) ──────────────────────────────────
insert into public.jars (member_id, trip_id, goal_paise, weekly_paise) values (:'mem_b', :'trip', 750000, 125000);
do $$ declare r record; begin
  select * into r from public.jar_readiness(current_setting('t.trip')::uuid);
  if r.total <> 2 or r.on_track <> 1 then raise exception 'FAIL: jar_readiness % / %', r.on_track, r.total; end if;
  raise notice 'ok: jar readiness 1 of 2';
end $$;
reset role;

-- ── Server writes plan results; owner sees own row, group sees anonymous bars (A-2) ──
insert into public.plans (trip_id, status, generated_by) values (:'trip', 'candidate', 'ai') returning id as plan \gset
insert into public.plan_members (plan_id, member_id, trip_id, total_paise, satisfaction, why) values
  (:'plan', :'mem_a', :'trip', 750000, 0.81, 'beach'), (:'plan', :'mem_b', :'trip', 750000, 0.64, 'café trail');
select set_config('t.plan', :'plan', true);
select pg_temp.act_as(:'B'); set local role authenticated;
do $$ begin
  if (select count(*) from public.plan_members) <> 1 then raise exception 'FAIL: B sees others'' satisfaction'; end if;
  if (select count(*) from public.fairness_bars(current_setting('t.plan')::uuid)) <> 2 then raise exception 'FAIL: fairness bars'; end if;
  raise notice 'ok: own plan row only, 2 anonymous bars';
end $$;
reset role;

-- ── Mood pulse hides averages under 3 check-ins (T-2) ──────────────────────
select pg_temp.act_as(:'B'); set local role authenticated;
insert into public.mood_checkins (member_id, trip_id, energy) values (:'mem_b', :'trip', 2);
insert into public.signals (member_id, trip_id, kind) values (:'mem_b', :'trip', 'need_break');
do $$ declare r record; begin
  select * into r from public.mood_summary(current_setting('t.trip')::uuid);
  if r.avg_energy is not null or r.need_break <> 1 then raise exception 'FAIL: mood_summary %', r; end if;
  raise notice 'ok: mood summary anonymous';
end $$;
reset role;

-- ── Outsider C sees nothing ────────────────────────────────────────────────
select pg_temp.act_as(:'C'); set local role authenticated;
do $$ begin
  if exists (select 1 from public.trips) or exists (select 1 from public.members)
     or exists (select 1 from public.options) or exists (select 1 from public.balances) then
    raise exception 'FAIL: outsider can read trip data'; end if;
  if exists (select 1 from public.jar_readiness(current_setting('t.trip')::uuid))
     or exists (select 1 from public.mood_summary(current_setting('t.trip')::uuid))
     or exists (select 1 from public.fairness_bars(current_setting('t.plan')::uuid)) then
    raise exception 'FAIL: outsider can call trip RPCs'; end if;
  begin
    perform public.confirm_pledge(current_setting('t.trip')::uuid);
    raise exception 'FAIL: outsider pledged';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  raise notice 'ok: outsider sees nothing';
end $$;
reset role;

-- ── anon (logged out) cannot call RPCs ─────────────────────────────────────
set local role anon;
do $$ begin
  begin
    perform public.join_trip('x', 'x');
    raise exception 'FAIL: anon can call join_trip';
  exception when insufficient_privilege then null; end;
  raise notice 'ok: anon blocked';
end $$;
reset role;

\echo 'ALL RLS CHECKS PASSED'
rollback;
