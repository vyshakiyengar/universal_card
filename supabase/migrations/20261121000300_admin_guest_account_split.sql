begin;

-- Each tracked action now also says whether its person has a Heya account. A person with an
-- account is counted as signed in for everything they did, including what they did on the same
-- browser before signing in; everyone else is a guest. So guests + signed in = total, always.
drop function public.heya_card_creations(timestamptz);
drop function public.heya_person_events(timestamptz);

create function public.heya_person_events(since timestamptz)
returns table (at timestamptz, event text, kind text, person text, account boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with links as (
    select visitor_id, min(user_id::text) as account
    from public.activity_events
    where visitor_id is not null and user_id is not null
    group by visitor_id
  )
  select e.at, e.event, e.kind,
         coalesce(e.user_id::text, l.account, e.visitor_id::text),
         (e.user_id is not null or l.account is not null)
  from public.activity_events e
  left join links l on l.visitor_id = e.visitor_id
  where e.at >= since and (e.user_id is not null or e.visitor_id is not null);
$$;
revoke all on function public.heya_person_events(timestamptz) from public, anon, authenticated;

create function public.heya_card_creations(since timestamptz)
returns table (at timestamptz, kind text, person text, account boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with cutoff as (
    select coalesce(min(at), now()) as at from public.activity_events where event = 'card_saved'
  )
  select p.at, p.kind, p.person, p.account from public.heya_person_events(since) p
  where p.event in ('trial_card_created', 'card_saved')
  union all
  select c.created_at,
         case when c.draft->>'type' = 'universal' then 'universal' else coalesce(c.draft->>'kind', 'other') end,
         c.owner_id::text, true
  from public.cards c, cutoff
  where c.created_at >= since and c.created_at < cutoff.at;
$$;
revoke all on function public.heya_card_creations(timestamptz) from public, anon, authenticated;

-- People who came, made a card and added to Wallet, split into guests and signed-in users.
create function public.heya_admin_split(from_at timestamptz, to_at timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with ev as (select * from public.heya_person_events(from_at) where at < to_at),
  made as (select * from public.heya_card_creations(from_at) where at < to_at)
  select jsonb_build_object(
    'came', (select jsonb_build_object('guests', count(distinct person) filter (where not account),
      'accounts', count(distinct person) filter (where account), 'total', count(distinct person)) from ev where event = 'visit'),
    'made', (select jsonb_build_object('guests', count(distinct person) filter (where not account),
      'accounts', count(distinct person) filter (where account), 'total', count(distinct person)) from made),
    'tapped', (select jsonb_build_object('guests', count(distinct person) filter (where not account),
      'accounts', count(distinct person) filter (where account), 'total', count(distinct person)) from ev where event = 'wallet_tap'),
    'added', (select jsonb_build_object('guests', count(distinct person) filter (where not account),
      'accounts', count(distinct person) filter (where account), 'total', count(distinct person)) from ev where event = 'wallet_download'),
    'cards', (select jsonb_build_object('guests', count(*) filter (where not account),
      'accounts', count(*) filter (where account), 'total', count(*)) from made),
    'passes', (select jsonb_build_object('guests', count(*) filter (where not account),
      'accounts', count(*) filter (where account), 'total', count(*)) from ev where event = 'wallet_download'),
    'newAccounts', (select count(*) from auth.users where created_at >= from_at and created_at < to_at)
  );
$$;
revoke all on function public.heya_admin_split(timestamptz, timestamptz) from public, anon, authenticated;

-- The dashboard read, now with the guest / signed-in split for each period.
create or replace function public.read_heya_admin_people(range_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  days integer := greatest(1, least(coalesce(range_days, 30), 3650));
  today timestamptz := ((now() at time zone 'UTC')::date)::timestamp at time zone 'UTC';
  later timestamptz := now() + interval '1 minute';
  since timestamptz;
begin
  if not public.is_universal_card_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  since := today - make_interval(days => days - 1);

  return jsonb_build_object(
    'generatedAt', now(),
    'trackedSince', (select min(at) from public.activity_events),
    'split', jsonb_build_array(
      jsonb_build_object('key', 'today', 'label', 'Today', 'data', public.heya_admin_split(today, later)),
      jsonb_build_object('key', 'yesterday', 'label', 'Yesterday', 'data', public.heya_admin_split(today - interval '1 day', today)),
      jsonb_build_object('key', '7', 'label', 'Last 7 days', 'data', public.heya_admin_split(today - interval '6 days', later)),
      jsonb_build_object('key', '30', 'label', 'Last 30 days', 'data', public.heya_admin_split(today - interval '29 days', later)),
      jsonb_build_object('key', 'all', 'label', 'All time', 'data', public.heya_admin_split('2000-01-01'::timestamptz, later))
    ),
    -- Kept for the previous dashboard build while the new one deploys.
    'periods', jsonb_build_array(
      jsonb_build_object('label', 'Today', 'data', public.heya_admin_period(today, later)),
      jsonb_build_object('label', 'Yesterday', 'data', public.heya_admin_period(today - interval '1 day', today)),
      jsonb_build_object('label', 'Last 7 days', 'data', public.heya_admin_period(today - interval '6 days', later)),
      jsonb_build_object('label', 'Last 30 days', 'data', public.heya_admin_period(today - interval '29 days', later)),
      jsonb_build_object('label', 'All time', 'data', public.heya_admin_period('2000-01-01'::timestamptz, later))
    ),
    'range', public.heya_admin_period(since, later),
    'cardsByKind', (select coalesce(jsonb_object_agg(kind, n), '{}'::jsonb) from (
      select kind, count(*) as n from public.heya_card_creations(since) group by 1) k),
    'daily', (
      with calendar as (
        select ((generate_series(since, today, interval '1 day')) at time zone 'UTC')::date as day
      ),
      ev as (
        select (at at time zone 'UTC')::date as day,
               count(distinct person) filter (where event = 'visit') as visitors,
               count(distinct person) filter (where event = 'wallet_download') as wallet_adders
        from public.heya_person_events(since) group by 1
      ),
      made as (
        select (at at time zone 'UTC')::date as day, count(distinct person) as makers, count(*) as cards
        from public.heya_card_creations(since) group by 1
      )
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', c.day,
        'visitors', coalesce(ev.visitors, 0),
        'cardMakers', coalesce(made.makers, 0),
        'cards', coalesce(made.cards, 0),
        'walletAdders', coalesce(ev.wallet_adders, 0)
      ) order by c.day), '[]'::jsonb)
      from calendar c
      left join ev on ev.day = c.day
      left join made on made.day = c.day
    )
  );
end;
$$;

commit;
