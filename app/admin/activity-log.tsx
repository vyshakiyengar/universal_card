"use client";

import { useMemo, useState } from "react";

export type LogRow = { at: string; who: string; account: boolean; what: string };

const time = (value: string) => new Date(value).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

// Every recorded action, newest first, so each number above can be checked against it.
export function ActivityLog({ rows }: { rows: LogRow[] }) {
  const [query, setQuery] = useState("");
  const [all, setAll] = useState(false);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? rows.filter((row) => `${row.who} ${row.what}`.toLowerCase().includes(q)) : rows;
  }, [rows, query]);
  const shown = all ? filtered : filtered.slice(0, 200);
  return (
    <>
      <input className="user-search" type="search" placeholder="Filter, e.g. Guest 4, an email, Wallet, WhatsApp" value={query}
        onChange={(event) => setQuery(event.target.value)} aria-label="Filter the activity log" />
      <p className="note">{filtered.length.toLocaleString("en-GB")} actions{query ? " match" : ""}{shown.length < filtered.length ? `, newest ${shown.length} shown` : ""}</p>
      <ol className="log">
        {shown.map((row, index) => (
          <li key={index}>
            <time dateTime={row.at}>{time(row.at)}</time>
            <button type="button" className={row.account ? "who account" : "who"} onClick={() => setQuery(row.who)} title="Show only this person">{row.who}</button>
            <span>{row.what}</span>
          </li>
        ))}
      </ol>
      {shown.length < filtered.length && <button type="button" className="admin-help" onClick={() => setAll(true)}>Show all {filtered.length.toLocaleString("en-GB")}</button>}
    </>
  );
}
