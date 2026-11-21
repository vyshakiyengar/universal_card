"use client";

import { useMemo, useState } from "react";

export type AdminUser = {
  email: string | null; name: string; provider: string; createdAt: string; lastSignInAt: string | null;
  cards: number; kinds: string[]; walletDownloads: number; events: number; lastActiveAt: string | null;
};

type SortKey = "createdAt" | "lastActiveAt" | "cards" | "walletDownloads" | "events";
const day = (value: string | null) => (value ? new Date(value).toISOString().slice(0, 10) : "–");
const ago = (value: string | null) => {
  if (!value) return "–";
  const hours = (Date.now() - Date.parse(value)) / 3_600_000;
  if (hours < 1) return "just now";
  if (hours < 24) return `${Math.floor(hours)} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
};

export function UsersTable({ users }: { users: AdminUser[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("createdAt");
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? users.filter((user) => `${user.email ?? ""} ${user.name}`.toLowerCase().includes(q)) : users;
    return [...filtered].sort((a, b) => {
      const av = a[sort], bv = b[sort];
      if (typeof av === "number" && typeof bv === "number") return bv - av;
      return String(bv ?? "").localeCompare(String(av ?? ""));
    });
  }, [users, query, sort]);
  const header = (key: SortKey, label: string) => (
    <th scope="col"><button type="button" className="sort" aria-pressed={sort === key} onClick={() => setSort(key)}>{label}{sort === key ? " ↓" : ""}</button></th>
  );
  return (
    <>
      <input className="user-search" type="search" placeholder="Search by name or email" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search users" />
      <p className="note">{rows.length.toLocaleString("en-GB")} of {users.length.toLocaleString("en-GB")} users</p>
      <div className="data-table users"><table>
        <thead><tr>
          <th scope="col">User</th><th scope="col">Method</th>{header("createdAt", "Joined")}{header("lastActiveAt", "Last active")}
          {header("cards", "Cards")}<th scope="col">Card types</th>{header("walletDownloads", "Wallet passes")}{header("events", "Events")}
        </tr></thead>
        <tbody>
          {rows.map((user) => (
            <tr key={`${user.email}-${user.createdAt}`}>
              <th scope="row"><span className="user-name">{user.name || "—"}</span><small>{user.email ?? "no email"}</small></th>
              <td>{user.provider === "apple" ? "Apple" : user.provider === "google" ? "Google" : user.provider}</td>
              <td>{day(user.createdAt)}</td>
              <td title={user.lastActiveAt ?? ""}>{ago(user.lastActiveAt)}</td>
              <td>{user.cards}</td>
              <td className="kinds">{user.kinds.join(", ") || "–"}</td>
              <td>{user.walletDownloads}</td>
              <td>{user.events}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </>
  );
}
