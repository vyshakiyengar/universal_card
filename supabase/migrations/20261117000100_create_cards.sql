create table public.cards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  draft jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint card_draft_shape check (
    jsonb_typeof(draft) = 'object'
    and coalesce(draft->>'type' in ('universal', 'individual'), false)
    and coalesce(jsonb_typeof(draft->'title') = 'string', false)
    and char_length(draft->>'title') between 1 and 80
    and octet_length(draft::text) <= 16384
  )
);

create index cards_owner_updated_idx on public.cards (owner_id, updated_at desc, id);
alter table public.cards enable row level security;
revoke all on table public.cards from public, anon, authenticated;
grant select, delete on table public.cards to authenticated;
grant insert (draft), update (draft) on table public.cards to authenticated;

create policy "Owners read their cards" on public.cards for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "Owners insert their cards" on public.cards for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy "Owners update their cards" on public.cards for update to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "Owners delete their cards" on public.cards for delete to authenticated
  using ((select auth.uid()) = owner_id);

create function public.touch_networking_card()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.statement_timestamp();
  return new;
end;
$$;

create trigger touch_networking_card
before update of draft on public.cards
for each row execute function public.touch_networking_card();

revoke execute on function public.touch_networking_card() from public, anon, authenticated;
