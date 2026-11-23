-- Kafila 0002: private-data aggregates for Deciding (D-2 fit score, D-3 budget fit).
-- They read member_private (budgets, prefs) but only ever return a yes/no or a group score.

-- D-3: does each option fit everyone's private budget? true / false / null (= price or budgets missing).
-- Per head = option total ÷ members still in. Never returns any budget number.
create function public.option_fit(p_trip uuid)
returns table (option_id uuid, fits boolean)
language sql stable security definer set search_path = '' as $$
  with active as (
    select greatest(count(*), 1) as n from public.members where trip_id = p_trip and status <> 'dropped'
  ), lowest as (
    select min(mp.budget_paise) as b
    from public.member_private mp
    join public.members m on m.id = mp.member_id and m.status <> 'dropped'
    where mp.trip_id = p_trip and mp.budget_paise is not null
  )
  select o.id,
         case when o.price_paise is null or (select b from lowest) is null then null
              else o.price_paise / (select n from active) <= (select b from lowest) end
  from public.options o
  where o.trip_id = p_trip and public.is_trip_member(p_trip);
$$;

-- D-2: group fit score 0–100 per (non-vetoed) option = average over members still in of
--   0.4 baseline + 0.3 × preference match (sum of prefs[tag] over the option's tags, clamped −1..1)
--               + 0.3 × reactions (like = 0.25 each, Rose = 0.75 → Rose weighs 3×, capped at 1)
-- clamped to 0..1 per member. Weights are the open-issue-#7 defaults; tune here.
create function public.option_scores(p_trip uuid)
returns table (option_id uuid, score integer)
language sql stable security definer set search_path = '' as $$
  select o.id,
    round(100 * avg(
      least(1, greatest(0,
        0.4
        + 0.3 * least(1, greatest(-1, coalesce(
            (select sum(coalesce((mp.prefs ->> t)::numeric, 0)) from unnest(o.tags) as t), 0)))
        + 0.3 * least(1,
            0.25 * (select count(*) from public.reactions r where r.option_id = o.id and r.member_id = m.id and r.kind = 'like')
          + 0.75 * (select count(*) from public.reactions r where r.option_id = o.id and r.member_id = m.id and r.kind = 'rose'))
      ))
    ))::integer
  from public.options o
  join public.members m on m.trip_id = o.trip_id and m.status <> 'dropped'
  left join public.member_private mp on mp.member_id = m.id
  where o.trip_id = p_trip and o.vetoed_at is null and public.is_trip_member(p_trip)
  group by o.id;
$$;

revoke execute on function public.option_fit(uuid), public.option_scores(uuid) from public, anon;
grant execute on function public.option_fit(uuid), public.option_scores(uuid) to authenticated;
