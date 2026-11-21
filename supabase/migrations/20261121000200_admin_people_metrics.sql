begin;

-- Cards saved straight into an account (not a guest card moved in at sign-in) get their own
-- event, so guest cards and account cards can be added up without counting a card twice.
alter table public.card_activity_daily drop constraint card_activity_daily_event_check;
alter table public.card_activity_daily add constraint card_activity_daily_event_check check (event in (
  'sign_in', 'card_created', 'wallet_download',
  'cta_click', 'sign_in_started', 'trial_started', 'trial_card_created', 'trial_cards_saved',
  'share', 'download_image', 'wallet_tap', 'visit', 'signed_in', 'card_saved'
));

-- Every tracked action with the person behind it. A person is their account once they have
-- signed in, and their browser before that. A browser seen signed in to an account (for
-- example when sign-in completes) is the same person as that account, before and after, so
-- guests who later sign in are counted once.
create function public.heya_person_events(since timestamptz)
returns table (at timestamptz, event text, kind text, person text)
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
  select e.at, e.event, e.kind, coalesce(e.user_id::text, l.account, e.visitor_id::text)
  from public.activity_events e
  left join links l on l.visitor_id = e.visitor_id
  where e.at >= since and (e.user_id is not null or e.visitor_id is not null);
$$;
revoke all on function public.heya_person_events(timestamptz) from public, anon, authenticated;

-- Card creations: guest cards and account cards from the events, plus account cards saved
-- before the card_saved event existed (read from the cards table).
create function public.heya_card_creations(since timestamptz)
returns table (at timestamptz, kind text, person text)
language sql
stable
security definer
set search_path = ''
as $$
  with cutoff as (
    select coalesce(min(at), now()) as at from public.activity_events where event = 'card_saved'
  )
  select p.at, p.kind, p.person from public.heya_person_events(since) p
  where p.event in ('trial_card_created', 'card_saved')
  union all
  select c.created_at,
         case when c.draft->>'type' = 'universal' then 'universal' else coalesce(c.draft->>'kind', 'other') end,
         c.owner_id::text
  from public.cards c, cutoff
  where c.created_at >= since and c.created_at < cutoff.at;
$$;
revoke all on function public.heya_card_creations(timestamptz) from public, anon, authenticated;

-- The headline numbers for one window of time.
create function public.heya_admin_period(from_at timestamptz, to_at timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with ev as (select * from public.heya_person_events(from_at) where at < to_at),
  made as (select * from public.heya_card_creations(from_at) where at < to_at)
  select jsonb_build_object(
    'visitors', (select count(distinct person) from ev where event = 'visit'),
    'studioVisitors', (select count(distinct person) from ev where event = 'visit' and kind = 'studio'),
    'cardMakers', (select count(distinct person) from made),
    'cards', (select count(*) from made),
    'walletTappers', (select count(distinct person) from ev where event = 'wallet_tap'),
    'walletAdders', (select count(distinct person) from ev where event = 'wallet_download'),
    'walletPasses', (select count(*) from ev where event = 'wallet_download'),
    'newAccounts', (select count(*) from auth.users where created_at >= from_at and created_at < to_at),
    'signedIn', (select count(distinct person) from ev where event = 'signed_in')
  );
$$;
revoke all on function public.heya_admin_period(timestamptz, timestamptz) from public, anon, authenticated;

-- Numbers for the opening table and the funnel, plus the same three per day for the charts.
create function public.read_heya_admin_people(range_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  days integer := greatest(1, least(coalesce(range_days, 30), 3650));
  today timestamptz := ((now() at time zone 'UTC')::date)::timestamp at time zone 'UTC';
  since timestamptz;
begin
  if not public.is_universal_card_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  since := today - make_interval(days => days - 1);

  return jsonb_build_object(
    'generatedAt', now(),
    'trackedSince', (select min(at) from public.activity_events),
    'periods', jsonb_build_array(
      jsonb_build_object('label', 'Today', 'data', public.heya_admin_period(today, now() + interval '1 minute')),
      jsonb_build_object('label', 'Yesterday', 'data', public.heya_admin_period(today - interval '1 day', today)),
      jsonb_build_object('label', 'Last 7 days', 'data', public.heya_admin_period(today - interval '6 days', now() + interval '1 minute')),
      jsonb_build_object('label', 'Last 30 days', 'data', public.heya_admin_period(today - interval '29 days', now() + interval '1 minute')),
      jsonb_build_object('label', 'All time', 'data', public.heya_admin_period('2000-01-01'::timestamptz, now() + interval '1 minute'))
    ),
    'range', public.heya_admin_period(since, now() + interval '1 minute'),
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
revoke all on function public.read_heya_admin_people(integer) from public, anon;
grant execute on function public.read_heya_admin_people(integer) to authenticated;

commit;
