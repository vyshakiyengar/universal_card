"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowUpRight, Contact, CreditCard, Fingerprint, LockKeyhole, Plus, Save, ScanLine, Trash2 } from "lucide-react";
import { CardValidationError, cardLimits, makeCardPayload, type CardInput, type DestinationKind } from "@/lib/cards";
import { buildCardQr } from "@/lib/qr";
import { DestinationPicker, destinations, UniversalFields } from "./card-fields";
import { CardPreview, type Preview } from "./card-preview";

type SavedCard = { id: string; draft: CardInput; createdAt: string; updatedAt: string };

type StudioProps = {
  account?: { email: string | null };
  walletConfigured?: boolean;
};

const storageKey = "universal-card-studio-v1";

function newDraft(type: CardInput["type"], kind: DestinationKind = "linkedin"): CardInput {
  return type === "universal"
    ? { type, title: "", name: "", jobTitle: "", company: "", emails: [], phones: [], links: [] }
    : { type, title: "", name: "", kind, value: "" };
}

async function cardsRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/cards${path}`, {
    ...options,
    cache: "no-store",
    headers: options?.body ? { "Content-Type": "application/json" } : undefined,
  });
  if (response.status === 204) return undefined as T;
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "The request could not be completed.");
  return data as T;
}

export function CardStudio({ account, walletConfigured = false }: StudioProps = {}) {
  const online = Boolean(account);
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [draft, setDraft] = useState<CardInput>(() => newDraft("universal"));
  const [baseline, setBaseline] = useState(draft);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean }>();
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  const universal = draft.type === "universal";
  const result = useMemo<{ preview?: Preview; error?: string }>(() => {
    if (draft.type === "individual" && !draft.value.trim()) return {};
    if (draft.type === "universal" && ![
      draft.name, draft.jobTitle, draft.company,
      ...draft.emails.map(({ value }) => value), ...draft.phones.map(({ value }) => value), ...draft.links.map(({ value }) => value),
    ].some((value) => value.trim())) return {};
    try {
      const { payload } = makeCardPayload({ ...draft, title: draft.title.trim() || "Untitled card" });
      return { preview: { code: buildCardQr(payload), payload } };
    } catch (error) {
      return { error: error instanceof CardValidationError ? error.message : "The QR could not be generated." };
    }
  }, [draft]);

  useEffect(() => {
    const controller = new AbortController();
    async function readCards() {
      try {
        if (online) {
          const { cards: saved } = await cardsRequest<{ cards: SavedCard[] }>("", { signal: controller.signal });
          if (!controller.signal.aborted) setCards(saved);
        } else {
          const saved = JSON.parse(localStorage.getItem(storageKey) ?? "[]") as SavedCard[];
          if (!Array.isArray(saved)) throw new Error("Invalid saved cards.");
          setCards(saved);
        }
        if (!controller.signal.aborted) setReady(true);
      } catch {
        if (!controller.signal.aborted) {
          setMessage({ text: "Saved cards could not be loaded. Reload the page to try again.", error: true });
        }
      }
    }
    void readCards();
    return () => controller.abort();
  }, [online]);

  function open(card: SavedCard | null, type = draft.type) {
    if (dirty && !window.confirm("Discard your unsaved changes?")) return;
    const next = card?.draft ?? newDraft(type);
    setDraft(next);
    setBaseline(next);
    setActiveId(card?.id ?? null);
    setMessage(undefined);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !ready) return;
    setBusy(true);
    setMessage(undefined);
    try {
      const { card, payload } = makeCardPayload(draft);
      buildCardQr(payload);
      const existing = cards.find(({ id }) => id === activeId);
      const time = new Date().toISOString();
      const saved = online
        ? (await cardsRequest<{ card: SavedCard }>(activeId ? `/${activeId}` : "", {
            method: activeId ? "PATCH" : "POST", body: JSON.stringify(card),
          })).card
        : { id: existing?.id ?? crypto.randomUUID(), draft: card, createdAt: existing?.createdAt ?? time, updatedAt: time };
      const next = [saved, ...cards.filter(({ id }) => id !== saved.id)];
      if (!online) localStorage.setItem(storageKey, JSON.stringify(next));
      setCards(next);
      setActiveId(saved.id);
      setDraft(saved.draft);
      setBaseline(saved.draft);
      setMessage({ text: "Card saved." });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Your card could not be saved.", error: true });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!activeId || busy || !window.confirm("Delete this saved card?")) return;
    setBusy(true);
    try {
      const next = cards.filter(({ id }) => id !== activeId);
      if (online) await cardsRequest<void>(`/${activeId}`, { method: "DELETE" });
      else localStorage.setItem(storageKey, JSON.stringify(next));
      const reset = newDraft(draft.type);
      setCards(next);
      setDraft(reset);
      setBaseline(reset);
      setActiveId(null);
      setMessage({ text: "Card deleted." });
    } catch {
      setMessage({ text: "Your card could not be deleted. Try again.", error: true });
    } finally {
      setBusy(false);
    }
  }

  const wallet = online && activeId && !dirty && walletConfigured
    ? <a className="button wallet-button" href={`/api/cards/${activeId}/wallet`}><CreditCard size={17} /> Add to Apple Wallet <ArrowUpRight size={16} /></a>
    : online && <p className="wallet-note">{walletConfigured ? "Save your changes to add this card to Apple Wallet." : "Apple Wallet export is unavailable."}</p>;

  return (
    <>
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><ScanLine size={21} strokeWidth={2.25} /></span> Universal Card</div>
        {account ? (
          <form action="/auth/sign-out" method="post" className="account">
            {account.email && <span className="account-email">{account.email}</span>}
            <button className="button secondary" type="submit">Sign out</button>
          </form>
        ) : <span className="local-indicator"><LockKeyhole size={13} /> Device preview</span>}
      </header>
      <main className="studio">
        <aside className="library" aria-label="Your saved cards">
          <div className="library-title"><h2>Your cards</h2><button type="button" className="icon-button" aria-label="New card" disabled={busy || !ready} onClick={() => open(null)}><Plus size={19} /></button></div>
          {cards.length ? <ul className="card-list">
            {cards.map((card) => {
              const type = card.draft.type === "universal" ? "Universal" : destinations[card.draft.kind].label;
              const Icon = card.draft.type === "universal" ? Contact : destinations[card.draft.kind].icon;
              return <li key={card.id}>
                <button className="saved-card" type="button" aria-current={card.id === activeId ? "true" : undefined} disabled={busy}
                  onClick={() => { if (card.id !== activeId) open(card); }}>
                  <span className="saved-icon"><Icon size={17} /></span><span><strong>{card.draft.title}</strong><small>{type}</small></span>
                </button>
              </li>;
            })}
          </ul> : <p className="library-empty">{ready ? "Your saved cards will appear here." : "Loading your cards…"}</p>}
          <p className="storage-note"><LockKeyhole size={14} /> {online ? "Private to your account" : "Saved in this browser"}</p>
        </aside>

        <section className="workspace" aria-labelledby="studio-title">
          <div className="workspace-heading">
            <h1 id="studio-title">{activeId ? "Edit card" : "Create a card"}</h1>
            <p>Share your contact details or a single link in one scan.</p>
          </div>
          <div className="workspace-grid">
            <form className="editor" onSubmit={save} noValidate>
              <fieldset disabled={busy || !ready}>
                <legend className="visually-hidden">Card details</legend>
                <div className="type-switch" role="group" aria-label="Card type">
                  <button type="button" aria-pressed={universal} onClick={() => { if (!universal) open(null, "universal"); }}>
                    <Contact size={20} /><span><strong>Universal</strong><small>Share a vCard</small></span>
                  </button>
                  <button type="button" aria-pressed={!universal} onClick={() => { if (universal) open(null, "individual"); }}>
                    <ArrowUpRight size={20} /><span><strong>Individual</strong><small>Share one destination</small></span>
                  </button>
                </div>
                {draft.type === "individual" && <DestinationPicker kind={draft.kind} onChange={(kind) => {
                  if (draft.kind !== kind) setDraft({ ...draft, kind, value: "" });
                }} />}
                <div className="input-pair">
                  <label className="field">Card name <span className="field-note">Private</span>
                    <input value={draft.title} maxLength={cardLimits.title} placeholder={universal ? "e.g. Work contact" : `e.g. My ${destinations[draft.kind].label}`}
                      onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
                  </label>
                  <label className="field">Your name <span className="field-note">Optional</span>
                    <input value={draft.name ?? ""} maxLength={cardLimits.text} placeholder="Alex Morgan" autoComplete="name"
                      onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
                  </label>
                </div>
                {draft.type === "universal"
                  ? <UniversalFields draft={draft} onChange={setDraft} />
                  : (
                    <label className="field">{destinations[draft.kind].label} {draft.kind === "phone" ? "number" : draft.kind === "email" ? "address" : "destination"}
                      <input value={draft.value} placeholder={destinations[draft.kind].hint} type={destinations[draft.kind].inputType}
                        autoCapitalize="none" spellCheck={false}
                        maxLength={draft.kind === "email" ? cardLimits.email : draft.kind === "phone" ? cardLimits.phone : cardLimits.link}
                        onChange={(event) => setDraft({ ...draft, value: event.target.value })} />
                    </label>
                  )}
                <div className="privacy"><Fingerprint size={20} /><p>{universal
                  ? "Contact details are embedded in this QR. Anyone who scans or photographs it can read and share them."
                  : "Anyone with this QR can open the destination and share it."}</p></div>
                <div className="editor-actions">
                  <button className="button primary" type="submit"><Save size={17} /> {busy ? "Working…" : "Save card"}</button>
                  {activeId && <button className="button delete-button" type="button" onClick={() => void remove()}><Trash2 size={16} /> Delete</button>}
                </div>
              </fieldset>
              {message && <p className={message.error ? "form-error" : "form-success"} role={message.error ? "alert" : "status"}>{message.text}</p>}
            </form>
            <CardPreview draft={draft} {...result} wallet={wallet} />
          </div>
        </section>
      </main>
    </>
  );
}
