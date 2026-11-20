"use client";

import Link from "next/link";
import { LayoutGrid, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { HeyaWordmark } from "./heya-wordmark";

type Account = { email: string | null; firstName: string; isAdmin?: boolean };

function AccountMenu({ account, busy }: { account: Account; busy: boolean }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", close); };
  }, [open]);
  const initial = Array.from(account.firstName || account.email || "?")[0]?.toUpperCase();
  return (
    <div className="account-menu" ref={root}>
      <button type="button" className="account-avatar" aria-label="Account menu" aria-expanded={open} aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}>{initial}</button>
      {open && <div className="account-popover" role="menu">
        {account.email && <span className="account-email">{account.email}</span>}
        {account.isAdmin && <Link role="menuitem" href="/admin">Dashboard</Link>}
        <Link role="menuitem" href="/account">Account</Link>
        <form action="/auth/sign-out" method="post"><button role="menuitem" type="submit" disabled={busy}>Sign out</button></form>
      </div>}
    </div>
  );
}

export function StudioHeader({ account, trial, busy, manage, onNavigate }: {
  account?: Account; trial?: boolean; busy: boolean; manage: boolean;
  onNavigate: (view: "create" | "manage") => void;
}) {
  return (
    <header className="topbar studio-topbar">
      <div className="header-inner">
        <button className="brand" type="button" aria-label="Heya Cards" disabled={busy} onClick={() => onNavigate("create")}>
          <HeyaWordmark />
        </button>
        <nav className="studio-nav" aria-label="Card studio">
          <button type="button" disabled={busy} aria-current={!manage ? "page" : undefined} onClick={() => onNavigate("create")}><Plus size={16} /> Create</button>
          <button type="button" disabled={busy} aria-current={manage ? "page" : undefined} onClick={() => onNavigate("manage")}><LayoutGrid size={15} /> Your cards</button>
        </nav>
        {account
          ? <AccountMenu account={account} busy={busy} />
          : trial
            ? <Link className="button secondary header-sign-in" href="/auth/sign-in">Sign in</Link>
            : <span className="local-indicator">Device preview</span>}
      </div>
    </header>
  );
}
