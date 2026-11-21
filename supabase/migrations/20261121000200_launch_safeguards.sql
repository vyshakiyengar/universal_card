begin;

alter table public.card_activity_daily drop constraint card_activity_daily_event_check;
alter table public.card_activity_daily add constraint card_activity_daily_event_check check (event in (
 'sign_in','card_created','wallet_download','cta_click','sign_in_started','trial_started','trial_card_created',
 'trial_cards_saved','share','download_image','wallet_tap','visit','signed_in',
 'guest_wallet_issued','account_wallet_issued','guest_card_imported'
));

-- Keep the guest UUID used as the Wallet serial number. Use the same owner lock as the cap.
create function public.import_guest_card(guest_id uuid, guest_draft jsonb)
returns public.cards language plpgsql security definer set search_path = '' as $$
declare
  owner uuid := auth.uid();
  saved public.cards;
begin
  if owner is null or guest_id is null then
    raise exception 'Sign-in and card ID required' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner::text, 0));
  select * into saved from public.cards where owner_id = owner and id = guest_id;
  if not found then
    insert into public.cards(id,owner_id,draft) values(guest_id,owner,guest_draft) returning * into saved;
    perform public.increment_card_activity('guest_card_imported',
      case when guest_draft->>'type' = 'universal' then 'universal' else coalesce(guest_draft->>'kind','other') end, saved.created_at);
  end if;
  return saved;
end;
$$;
revoke all on function public.import_guest_card(uuid,jsonb) from public, anon;
grant execute on function public.import_guest_card(uuid,jsonb) to authenticated;

-- Write the total and its audience in one transaction. The route knows the
-- audience even when the visitor declines optional browser analytics.
create function public.record_pass_issued(audience text, card_kind text, visitor uuid, account uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if audience not in ('guest','account') or audience is null then raise exception 'Invalid audience'; end if;
  if visitor is null then
    perform public.increment_card_activity('wallet_download',card_kind,now());
  else
    perform public.record_activity_event('wallet_download',card_kind,visitor,account);
  end if;
  perform public.increment_card_activity(audience || '_wallet_issued',card_kind,now());
end;
$$;
revoke all on function public.record_pass_issued(text,text,uuid,uuid) from public, anon, authenticated;
grant execute on function public.record_pass_issued(text,text,uuid,uuid) to service_role;

create function public.export_my_activity() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('at',at,'event',event,'kind',kind) order by at,id),'[]'::jsonb)
  from public.activity_events where user_id = auth.uid();
$$;
revoke all on function public.export_my_activity() from public, anon;
grant execute on function public.export_my_activity() to authenticated;

alter table public.activity_events drop constraint activity_events_user_id_fkey,
  add constraint activity_events_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

-- Guests are browsers. For Combined, count accounts once and add only guest
-- browsers with no observed sign-in in the same reporting window.
create function public.launch_audience(range_days integer)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if not public.is_universal_card_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  with recent as (
    select distinct visitor_id, user_id from public.activity_events
    where at >= (((now() at time zone 'UTC')::date - (greatest(1,least(range_days,365)) - 1))::timestamp at time zone 'UTC')
  ), guests as (select distinct visitor_id from recent where user_id is null and visitor_id is not null),
  accounts as (select count(distinct user_id) as n from recent)
  select jsonb_build_object('guests',(select count(*) from guests),'accounts',accounts.n,
    'combined',accounts.n + (select count(*) from guests g where not exists (
      select 1 from recent r where r.visitor_id=g.visitor_id and r.user_id is not null)))
  into result from accounts;
  return result;
end;
$$;
revoke all on function public.launch_audience(integer) from public, anon;
grant execute on function public.launch_audience(integer) to authenticated;
commit;
