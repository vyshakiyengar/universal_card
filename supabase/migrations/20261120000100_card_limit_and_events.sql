begin;

-- Cap saved cards per account. The trigger also covers inserts made directly
-- through the Supabase API, which skip the app's own validation.
create function public.enforce_card_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.owner_id::text, 0));
  if (select count(*) from public.cards where owner_id = new.owner_id) >= 50 then
    raise exception 'card_limit_reached' using errcode = 'P0001',
      hint = 'Each account can keep up to 50 cards.';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_card_limit() from public, anon, authenticated;

create trigger enforce_card_limit before insert on public.cards
for each row execute function public.enforce_card_limit();

-- Anonymous launch funnel events, counted per day like the existing metrics.
alter table public.card_activity_daily drop constraint card_activity_daily_event_check;
alter table public.card_activity_daily add constraint card_activity_daily_event_check check (event in (
  'sign_in', 'card_created', 'wallet_download',
  'cta_click', 'sign_in_started', 'trial_started', 'trial_card_created', 'trial_cards_saved',
  'share', 'download_image', 'wallet_tap'
));

commit;
