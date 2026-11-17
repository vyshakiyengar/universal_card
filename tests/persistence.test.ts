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
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to authenticated;
      insert into auth.users(id) values ('${firstId}'), ('${secondId}');
    `);
    const migration = await readFile(new URL("../supabase/migrations/20261117000100_create_cards.sql", import.meta.url), "utf8");
    await db.exec(migration);
    await db.exec("set role anon");
    await assert.rejects(db.query("select * from public.cards"), /permission denied/);
    await db.exec("set role authenticated");
    await assert.rejects(db.query("insert into public.cards(draft) values ($1)", [draft("Anonymous")]), /row-level security/);

    async function useAccount(id: string) {
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
    }

    await useAccount(firstId);
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
    await db.exec("reset role");
    await db.query("delete from auth.users where id = $1", [firstId]);
    assert.deepEqual((await db.query("select id from public.cards")).rows, []);
  } finally {
    await db.close();
  }
});
