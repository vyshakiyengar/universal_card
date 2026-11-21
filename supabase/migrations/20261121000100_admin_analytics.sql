begin;

-- One row per tracked action, so the admin dashboard can count unique visitors and
-- users and follow them through the funnel. visitor_id is a random first-party ID
-- (heya_vid cookie); user_id is set once someone is signed in.
create table public.activity_events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  visitor_id uuid,
  user_id uuid references auth.users(id) on delete set null,
  event text not null,
  kind text not null default 'all'
);

create index activity_events_at_idx on public.activity_events (at);
create index activity_events_event_at_idx on public.activity_events (event, at);
create index activity_events_visitor_idx on public.activity_events (visitor_id) where visitor_id is not null;
create index activity_events_user_idx on public.activity_events (user_id, at) where user_id is not null;

alter table public.activity_events enable row level security;
revoke all on public.activity_events from public, anon, authenticated;

alter table public.card_activity_daily drop constraint card_activity_daily_event_check;
alter table public.card_activity_daily add constraint card_activity_daily_event_check check (event in (
  'sign_in', 'card_created', 'wallet_download',
  'cta_click', 'sign_in_started', 'trial_started', 'trial_card_created', 'trial_cards_saved',
  'share', 'download_image', 'wallet_tap', 'visit', 'signed_in'
));

create function public.record_activity_event(event_name text, card_kind text, visitor uuid, account uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.activity_events (visitor_id, user_id, event, kind)
  values (visitor, account, event_name, coalesce(nullif(card_kind, ''), 'all'));
  perform public.increment_card_activity(event_name, coalesce(nullif(card_kind, ''), 'all'), now());
end;
$$;
revoke all on function public.record_activity_event(text, text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.record_activity_event(text, text, uuid, uuid) to service_role;

-- Everything the admin dashboard shows, for the last range_days days (UTC).
create function public.read_heya_admin_dashboard(range_days integer default 365)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  days integer := greatest(1, least(coalesce(range_days, 365), 3650));
  first_day date := (now() at time zone 'UTC')::date - (greatest(1, least(coalesce(range_days, 365), 3650)) - 1);
  since timestamptz := ((now() at time zone 'UTC')::date - (greatest(1, least(coalesce(range_days, 365), 3650)) - 1))::timestamp at time zone 'UTC';
  result jsonb;
begin
  if not public.is_universal_card_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  with
  calendar as (
    select generate_series(first_day, (now() at time zone 'UTC')::date, interval '1 day')::date as day
  ),
  signups as (
    select (created_at at time zone 'UTC')::date as day, count(*) as n
    from auth.users where created_at >= since group by 1
  ),
  cards_made as (
    select (created_at at time zone 'UTC')::date as day, count(*) as n, count(distinct owner_id) as makers
    from public.cards where created_at >= since group by 1
  ),
  counters as (
    select day, event, sum(total) as n
    from public.card_activity_daily where day >= first_day group by 1, 2
  ),
  uniques as (
    select (at at time zone 'UTC')::date as day,
           count(distinct visitor_id) filter (where event = 'visit') as visitors,
           count(distinct user_id) as active_users
    from public.activity_events where at >= since group by 1
  ),
  daily as (
    select jsonb_agg(jsonb_build_object(
      'day', c.day,
      'signups', coalesce(s.n, 0),
      'cards', coalesce(m.n, 0),
      'cardMakers', coalesce(m.makers, 0),
      'signIns', coalesce((select n from counters k where k.day = c.day and k.event = 'sign_in'), 0),
      'walletDownloads', coalesce((select n from counters k where k.day = c.day and k.event = 'wallet_download'), 0),
      'walletTaps', coalesce((select n from counters k where k.day = c.day and k.event = 'wallet_tap'), 0),
      'visits', coalesce((select n from counters k where k.day = c.day and k.event = 'visit'), 0),
      'visitors', coalesce(u.visitors, 0),
      'activeUsers', coalesce(u.active_users, 0)
    ) order by c.day) as rows
    from calendar c
    left join signups s on s.day = c.day
    left join cards_made m on m.day = c.day
    left join uniques u on u.day = c.day
  ),
  event_totals as (
    select coalesce(jsonb_agg(jsonb_build_object('event', event, 'kind', kind, 'total', total) order by event, total desc), '[]'::jsonb) as rows
    from (
      select event, kind, sum(total) as total
      from public.card_activity_daily where day >= first_day group by 1, 2
    ) t
  ),
  funnel as (
    select jsonb_build_object(
      'visitors', count(distinct visitor_id) filter (where event = 'visit'),
      'ctaClickers', count(distinct visitor_id) filter (where event = 'cta_click'),
      'trialStarters', count(distinct visitor_id) filter (where event = 'trial_started'),
      'trialCardMakers', count(distinct visitor_id) filter (where event = 'trial_card_created'),
      'signInStarters', count(distinct visitor_id) filter (where event = 'sign_in_started'),
      'signedInUsers', count(distinct user_id) filter (where event = 'signed_in'),
      'walletTappers', count(distinct coalesce(user_id::text, visitor_id::text)) filter (where event = 'wallet_tap'),
      'walletDownloaders', count(distinct coalesce(user_id::text, visitor_id::text)) filter (where event = 'wallet_download'),
      'sharers', count(distinct coalesce(user_id::text, visitor_id::text)) filter (where event in ('share', 'download_image')),
      'trackedSince', (select min(at) from public.activity_events)
    ) as data
    from public.activity_events where at >= since
  ),
  user_rows as (
    select coalesce(jsonb_agg(row_data order by created desc), '[]'::jsonb) as rows
    from (
      select u.created_at as created, jsonb_build_object(
        'email', u.email,
        'name', coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''),
        'provider', coalesce(u.raw_app_meta_data->>'provider', 'unknown'),
        'createdAt', u.created_at,
        'lastSignInAt', u.last_sign_in_at,
        'cards', (select count(*) from public.cards c where c.owner_id = u.id),
        'kinds', (select coalesce(jsonb_agg(distinct case when c.draft->>'type' = 'universal' then 'universal' else coalesce(c.draft->>'kind', 'other') end), '[]'::jsonb)
                  from public.cards c where c.owner_id = u.id),
        'walletDownloads', (select count(*) from public.activity_events e where e.user_id = u.id and e.event = 'wallet_download'),
        'events', (select count(*) from public.activity_events e where e.user_id = u.id),
        'lastActiveAt', greatest(u.last_sign_in_at, (select max(e.at) from public.activity_events e where e.user_id = u.id),
                                 (select max(c.updated_at) from public.cards c where c.owner_id = u.id))
      ) as row_data
      from auth.users u
      order by u.created_at desc
      limit 1000
    ) t
  )
  select jsonb_build_object(
    'generatedAt', now(),
    'rangeDays', days,
    'since', since,
    'users', (select jsonb_build_object(
      'total', count(*),
      'new', count(*) filter (where created_at >= since),
      'active1', count(*) filter (where last_sign_in_at >= now() - interval '1 day'),
      'active7', count(*) filter (where last_sign_in_at >= now() - interval '7 days'),
      'active30', count(*) filter (where last_sign_in_at >= now() - interval '30 days'),
      'returning', count(*) filter (where last_sign_in_at > created_at + interval '1 hour'),
      'withCards', (select count(distinct owner_id) from public.cards),
      'providers', (select coalesce(jsonb_object_agg(provider, n), '{}'::jsonb) from (
        select coalesce(raw_app_meta_data->>'provider', 'unknown') as provider, count(*) as n from auth.users group by 1) p)
    ) from auth.users),
    'cards', jsonb_build_object(
      'total', (select count(*) from public.cards),
      'new', (select count(*) from public.cards where created_at >= since),
      'byKind', (select coalesce(jsonb_object_agg(kind, n), '{}'::jsonb) from (
        select case when draft->>'type' = 'universal' then 'universal' else coalesce(draft->>'kind', 'other') end as kind, count(*) as n
        from public.cards where created_at >= since group by 1) k),
      'perUser', (select coalesce(jsonb_object_agg(bucket, n), '{}'::jsonb) from (
        select case when n >= 5 then '5+' else n::text end as bucket, count(*) as n
        from (select owner_id, count(*) as n from public.cards group by 1) o group by 1) b)
    ),
    'daily', (select coalesce(rows, '[]'::jsonb) from daily),
    'eventTotals', (select rows from event_totals),
    'funnel', (select data from funnel),
    'recentUsers', (select rows from user_rows)
  ) into result;

  return result;
end;
$$;
revoke all on function public.read_heya_admin_dashboard(integer) from public, anon;
grant execute on function public.read_heya_admin_dashboard(integer) to authenticated;

commit;
