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
      create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, last_sign_in_at timestamptz);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to authenticated;
      insert into auth.users(id) values ('${firstId}'), ('${secondId}');
    `);
    const migration = await readFile(new URL("../supabase/migrations/20261117000100_create_cards.sql", import.meta.url), "utf8");
    await db.exec(migration);
    await db.exec(await readFile(new URL("../supabase/migrations/20261118000100_launch_controls.sql", import.meta.url), "utf8"));
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
      [{ event: "card_created", total: 2 }, { event: "sign_in", total: 1 }]);
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
    await db.query("select public.delete_universal_card_account()");
    await db.exec("reset role");
    assert.deepEqual((await db.query("select id from auth.users")).rows, [{ id: secondId }]);
    assert.deepEqual((await db.query("select id from public.cards")).rows, []);
  } finally {
    await db.close();
  }
});
