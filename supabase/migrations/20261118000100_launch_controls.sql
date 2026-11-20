begin;

create table public.card_activity_daily (
  day date not null,
  event text not null check (event in ('sign_in', 'card_created', 'wallet_download')),
  kind text not null,
  total bigint not null default 0,
  primary key (day, event, kind)
);

alter table public.card_activity_daily enable row level security;
revoke all on public.card_activity_daily from public, anon, authenticated;

create function public.increment_card_activity(event_name text, card_kind text, occurred_at timestamptz)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.card_activity_daily (day, event, kind, total)
  values ((occurred_at at time zone 'UTC')::date, event_name, card_kind, 1)
  on conflict (day, event, kind) do update set total = public.card_activity_daily.total + 1;
$$;
revoke all on function public.increment_card_activity(text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.increment_card_activity(text, text, timestamptz) to service_role;

create function public.capture_card_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_schema = 'auth' then
    if new.last_sign_in_at is not null and
       (tg_op = 'INSERT' or new.last_sign_in_at is distinct from old.last_sign_in_at) then
      perform public.increment_card_activity('sign_in', 'all', new.last_sign_in_at);
    end if;
  else
    perform public.increment_card_activity(
      'card_created',
      case when new.draft->>'type' = 'universal' then 'universal' else coalesce(new.draft->>'kind', 'other') end,
      new.created_at
    );
  end if;
  return new;
end;
$$;
revoke all on function public.capture_card_activity() from public, anon, authenticated;

lock table public.cards in share row exclusive mode;
insert into public.card_activity_daily (day, event, kind, total)
select (created_at at time zone 'UTC')::date, 'card_created',
       case when draft->>'type' = 'universal' then 'universal' else coalesce(draft->>'kind', 'other') end,
       count(*)
from public.cards
group by 1, 2, 3;

create trigger capture_created_card after insert on public.cards
for each row execute function public.capture_card_activity();

create trigger capture_account_sign_in after insert or update of last_sign_in_at on auth.users
for each row execute function public.capture_card_activity();

create function public.is_universal_card_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users
    where id = auth.uid()
      and lower(email) = 'vyshakiyengar@gmail.com'
      and email_confirmed_at is not null
  );
$$;
revoke all on function public.is_universal_card_admin() from public, anon;
grant execute on function public.is_universal_card_admin() to authenticated;

create function public.read_universal_card_activity()
returns setof public.card_activity_daily
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_universal_card_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  return query select * from public.card_activity_daily
    where day >= (now() at time zone 'UTC')::date - 29
    order by day;
end;
$$;
revoke all on function public.read_universal_card_activity() from public, anon;
grant execute on function public.read_universal_card_activity() to authenticated;

create function public.delete_universal_card_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign-in required' using errcode = '42501';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.delete_universal_card_account() from public, anon;
grant execute on function public.delete_universal_card_account() to authenticated;

create function public.export_universal_card_data()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'draft', draft, 'createdAt', created_at, 'updatedAt', updated_at
  ) order by created_at, id), '[]'::jsonb)
  from public.cards where owner_id = auth.uid();
$$;
revoke all on function public.export_universal_card_data() from public, anon;
grant execute on function public.export_universal_card_data() to authenticated;

commit;
