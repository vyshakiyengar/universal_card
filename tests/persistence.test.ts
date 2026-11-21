import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const firstId = "00000000-0000-4000-8000-000000000001";
const secondId = "00000000-0000-4000-8000-000000000002";
const draft = (title: string) => JSON.stringify({ title, type: "individual", kind: "url", value: "https://example.org/" });

test("database isolates cards by owner, protects owner_id, and cascades account deletion", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role;
      create schema auth;
      create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, last_sign_in_at timestamptz, created_at timestamptz default now(), raw_user_meta_data jsonb, raw_app_meta_data jsonb);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to authenticated;
      insert into auth.users(id) values ('${firstId}'), ('${secondId}');
    `);
    const migration = await readFile(new URL("../supabase/migrations/20261117000100_create_cards.sql", import.meta.url), "utf8");
    await db.exec(migration);
    await db.exec(await readFile(new URL("../supabase/migrations/20261118000100_launch_controls.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/migrations/20261120000100_card_limit_and_events.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/migrations/20261121000100_admin_analytics.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/migrations/20261121000200_launch_safeguards.sql", import.meta.url), "utf8"));
    await db.query("update auth.users set email = $2, email_confirmed_at = now(), last_sign_in_at = now() where id = $1",
      [secondId, "vyshakiyengar@gmail.com"]);
    await db.exec("set role anon");
    await assert.rejects(db.query("select * from public.cards"), /permission denied/);
    await db.exec("set role authenticated");
    await assert.rejects(db.query("insert into public.cards(draft) values ($1)", [draft("Anonymous")]), /row-level security/);

    async function useAccount(id: string) {
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
    }

    await useAccount(firstId);
    await assert.rejects(db.query("select * from public.read_universal_card_activity()"), /Admin access required/);
    await assert.rejects(db.query("select public.increment_card_activity('sign_in', 'all', now())"), /permission denied/);
    const localId = "10000000-0000-4000-8000-000000000001";
    const importGuest = () => db.query<{ id: string }>("select id from public.import_guest_card($1,$2)", [localId, draft("Guest")]);
    assert.equal((await importGuest()).rows[0].id, localId);
    await db.query("update public.cards set draft = $1 where id = $2", [draft("Changed"), localId]);
    await importGuest();
    assert.deepEqual((await db.query("select draft->>'title' as title from public.cards")).rows, [{ title: "Changed" }]);
    await useAccount(secondId);
    await assert.rejects(importGuest(), /duplicate key/);
    await useAccount(firstId);
    await db.query("delete from public.cards where id = $1", [localId]);
    const { rows: [card] } = await db.query<{ id: string; owner_id: string }>(
      "insert into public.cards(draft) values ($1) returning id, owner_id", [draft("Work")],
    );
    assert.equal(card.owner_id, firstId);
    await db.query("insert into public.cards(draft) values ($1)", [draft("Other")]);
    await assert.rejects(
      db.query("insert into public.cards(draft, owner_id) values ($1, $2)", [draft("Spoofed"), secondId]),
      /permission denied/,
    );
    await useAccount(secondId);
    assert.deepEqual((await db.query("select event, total::int from public.read_universal_card_activity() order by event")).rows,
      [{ event: "card_created", total: 3 }, { event: "guest_card_imported", total: 1 }, { event: "sign_in", total: 1 }]);
    assert.deepEqual((await db.query("select public.export_universal_card_data() as cards")).rows, [{ cards: [] }]);
    assert.deepEqual((await db.query("select id from public.cards")).rows, []);
    assert.deepEqual((await db.query("update public.cards set draft = $1 where id = $2 returning id", [draft("Spoofed"), card.id])).rows, []);
    assert.deepEqual((await db.query("delete from public.cards where id = $1 returning id", [card.id])).rows, []);

    await useAccount(firstId);
    const updated = await db.query<{ title: string }>(
      "update public.cards set draft = $1 where id = $2 returning draft->>'title' as title", [draft("Updated"), card.id],
    );
    assert.deepEqual(updated.rows, [{ title: "Updated" }]);
    await assert.rejects(db.query("update public.cards set owner_id = $1 where id = $2", [secondId, card.id]), /permission denied/);
    assert.deepEqual((await db.query("delete from public.cards where id = $1 returning id", [card.id])).rows, [{ id: card.id }]);
    const { rows: [exported] } = await db.query<{ cards: unknown[] }>("select public.export_universal_card_data() as cards");
    assert.equal(exported.cards.length, 1);
    for (let index = 1; index < 50; index++) await db.query("insert into public.cards(draft) values ($1)", [draft(`Card ${index}`)]);
    await assert.rejects(db.query("insert into public.cards(draft) values ($1)", [draft("One too many")]), /card_limit_reached/);
    await useAccount(secondId);
    await db.query("insert into public.cards(draft) values ($1)", [draft("Another account")]);
    await db.query("delete from public.cards");
    await useAccount(firstId);
    await assert.rejects(db.query("select public.launch_audience(7)"), /Admin access required/);
    await db.exec("reset role");
    await db.query("select public.record_activity_event('trial_card_created','email',$1,null)", [localId]);
    await db.query("select public.record_pass_issued('guest','email',null,null)");
    await db.query("select public.record_pass_issued('account','email',$1,$2)", [localId,firstId]);
    await db.exec("set role authenticated");
    await useAccount(secondId);
    assert.deepEqual((await db.query("select public.launch_audience(1) as a")).rows, [{ a: { guests: 1, accounts: 1, combined: 1 } }]);
    assert.deepEqual((await db.query("select public.export_my_activity() as a")).rows, [{ a: [] }]);
    await useAccount(firstId);
    assert.equal((await db.query<{n:number}>("select jsonb_array_length(public.export_my_activity()) as n")).rows[0].n, 1);
    await db.query("select public.delete_universal_card_account()");
    await db.exec("reset role");
    assert.deepEqual((await db.query("select id from auth.users")).rows, [{ id: secondId }]);
    assert.deepEqual((await db.query("select id from public.cards")).rows, []);
  } finally {
    await db.close();
  }
});
