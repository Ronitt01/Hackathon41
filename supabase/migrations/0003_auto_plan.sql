-- Automatic fair plan (Kafila makes the plan itself when every budget is in, or at the "plan by" deadline).
-- Run once in the Supabase SQL Editor, after 0001 and 0002.

-- When the plan gets made with or without everyone. New and existing trips get 3 days from now; organizers can change it.
alter table public.trips add column plan_by timestamptz default (now() + interval '3 days');
grant update (plan_by) on public.trips to authenticated;

-- Server only: when an automatic attempt last started, so two page views can't both make a plan
-- and a plan that can't be made (no options, no fit) isn't retried on every visit.
alter table public.trips add column auto_plan_at timestamptz;

-- A budget's updated_at comes from the server clock, not the phone's, so "a budget changed after the plan" is reliable.
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger member_private_touch before insert or update on public.member_private
  for each row execute function public.touch_updated_at();
