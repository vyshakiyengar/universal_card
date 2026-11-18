"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, Check, LayoutGrid, PenLine, Plus, QrCode, Trash2 } from "lucide-react";
import { cardLimits, makeCardPayload, type CardInput, type DestinationKind } from "@/lib/cards";
import { buildCardQr } from "@/lib/qr";
import { AppleWalletMark } from "./apple-wallet-mark";
import { DestinationMark, destinations, scanDescriptions, UniversalFields } from "./card-fields";
import { CardPreview, type Preview } from "./card-preview";
import { HeyaWordmark } from "./heya-wordmark";
import { ProjectCredit } from "./project-credit";
import { WalletStack } from "./wallet-stack";

type SavedCard = { id: string; draft: CardInput; createdAt: string; updatedAt: string };
type EntryKind = DestinationKind | "universal";
type Screen =
  | { view: "create" | "manage" }
  | { view: "edit"; draft: CardInput; original: CardInput; id?: string }
  | { view: "saved"; card: SavedCard; preview: Preview; justSaved: boolean };

type StudioProps = {
  account?: { email: string | null; firstName: string };
  walletConfigured?: boolean;
  signOutFailed?: boolean;
};

const storageKey = "universal-card-studio-v1";
const types = ["linkedin", "whatsapp", "instagram", "email", "phone", "url", "website", "snapchat"] as const;

function newDraft(kind: EntryKind, name: string): CardInput {
  return kind === "universal"
    ? { type: "universal", title: "Universal contact", name, jobTitle: "", company: "", emails: [], phones: [], links: [] }
    : { type: "individual", title: destinations[kind].label, name, kind, value: "" };
}

function getKind(draft: CardInput): EntryKind {
  return draft.type === "universal" ? "universal" : draft.kind;
}

function getLocalCards(): SavedCard[] {
  const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
  if (!Array.isArray(saved)) throw new Error("Invalid saved cards.");
  return saved as SavedCard[];
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

function getSavedPreview(card: SavedCard): Preview {
  const { payload } = makeCardPayload(card.draft);
  return { payload, code: buildCardQr(payload) };
}

function CreateCards({ ready, create }: { ready: boolean; create: (type: EntryKind) => void }) {
  return (
    <>
      <section className="studio-hero" aria-labelledby="page-title">
        <div className="hero-copy">
          <h1 id="page-title" tabIndex={-1}>One <em>Apple Wallet</em> card for all your details, <span className="hero-alternative">or one for each.</span></h1>
          <a className="hero-link" href="#universal-cards">Explore Heya cards <ArrowDown size={17} aria-hidden="true" /></a>
        </div>
        <WalletStack />
      </section>

      <section id="universal-cards" className="chooser-section universal-section" aria-labelledby="universal-title">
        <div className="section-heading">
          <h2 id="universal-title">Create Universal Cards</h2>
          <p>All the details you choose, in one QR</p>
        </div>
        <button className="universal-choice" type="button" disabled={!ready} onClick={() => create("universal")}>
          <DestinationMark kind="universal" />
          <span><strong className="universal-title"><AppleWalletMark /> Universal card</strong><small>Scanning this QR shares all your contact details in one vCard.</small></span>
          <span className="universal-arrow" aria-hidden="true"><ArrowRight size={18} /></span>
        </button>
      </section>

      <section id="individual-cards" className="chooser-section" aria-labelledby="individual-title">
        <div className="section-heading">
          <h2 id="individual-title">Create Individual Cards</h2>
          <p>One card for an app, link, or contact detail</p>
        </div>
        <div className="destination-grid">
          {types.map((kind) => (
            <button key={kind} className="destination-card" type="button" disabled={!ready} onClick={() => create(kind)}>
              <span className="tile-top"><DestinationMark kind={kind} /><ArrowRight size={18} className="tile-arrow" aria-hidden="true" /></span>
              <strong>{destinations[kind].label}</strong>
              <span className="tile-action"><AppleWalletMark /> Create Apple Wallet card for {kind === "url" ? "your custom link" : kind === "website" ? "your website" : `your ${destinations[kind].label}`}</span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

export function CardStudio({ account, walletConfigured = false, signOutFailed = false }: StudioProps = {}) {
  const online = Boolean(account);
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [screen, setScreen] = useState<Screen>({ view: "create" });
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [loadError, setLoadError] = useState<string>();
  const main = useRef<HTMLElement>(null);
  const previousView = useRef(screen.view);

  useEffect(() => {
    if (previousView.current !== screen.view) {
      main.current?.querySelector("h1")?.focus();
      window.scrollTo(0, 0);
      previousView.current = screen.view;
    }
  }, [screen.view]);

  useEffect(() => {
    const controller = new AbortController();
    async function readCards() {
      try {
        const saved = online ? (await cardsRequest<{ cards: SavedCard[] }>("", { signal: controller.signal })).cards : getLocalCards();
        if (!controller.signal.aborted) {
          setCards(saved);
          setReady(true);
        }
      } catch {
        if (!controller.signal.aborted) setLoadError("Your cards could not be loaded. Reload the page to try again.");
      }
    }
    void readCards();
    return () => controller.abort();
  }, [online]);

  function navigate(next: Screen) {
    if (busy) return;
    if (screen.view === "edit" && JSON.stringify(screen.draft) !== JSON.stringify(screen.original)
      && !window.confirm("Discard unsaved changes?")) return;
    setError(undefined);
    setScreen(next);
  }

  function create(kind: EntryKind) {
    const draft = newDraft(kind, account?.firstName ?? "");
    navigate({ view: "edit", draft, original: draft });
  }

  function edit(card: SavedCard) {
    navigate({ view: "edit", draft: card.draft, original: card.draft, id: card.id });
  }

  function open(card: SavedCard) {
    try {
      navigate({ view: "saved", card, preview: getSavedPreview(card), justSaved: false });
    } catch {
      setError("This card’s QR could not be generated. Open Edit to check its details.");
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !ready || screen.view !== "edit") return;
    setBusy(true);
    setError(undefined);
    try {
      const { card, payload } = makeCardPayload(screen.draft);
      const preview = { payload, code: buildCardQr(payload) };
      const time = new Date().toISOString();
      let saved: SavedCard;
      if (online) {
        saved = (await cardsRequest<{ card: SavedCard }>(screen.id ? `/${screen.id}` : "", {
          method: screen.id ? "PATCH" : "POST", body: JSON.stringify(card),
        })).card;
      } else {
        const current = getLocalCards();
        const old = current.find(({ id }) => id === screen.id);
        saved = { id: old?.id ?? crypto.randomUUID(), draft: card, createdAt: old?.createdAt ?? time, updatedAt: time };
        localStorage.setItem(storageKey, JSON.stringify([saved, ...current.filter(({ id }) => id !== saved.id)]));
      }
      setCards((current) => [saved, ...current.filter(({ id }) => id !== saved.id)]);
      setScreen({ view: "saved", card: saved, preview, justSaved: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Your card could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(card: SavedCard) {
    if (busy || !window.confirm(`Delete “${card.draft.title}” from your saved cards?`)) return;
    setBusy(true);
    setError(undefined);
    try {
      if (online) await cardsRequest<void>(`/${card.id}`, { method: "DELETE" });
      else localStorage.setItem(storageKey, JSON.stringify(getLocalCards().filter(({ id }) => id !== card.id)));
      setCards((current) => current.filter(({ id }) => id !== card.id));
    } catch {
      setError("Your card could not be deleted. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const manage = screen.view === "manage" || screen.view === "saved" || (screen.view === "edit" && Boolean(screen.id));

  return (
    <>
      <header className="topbar">
        <div className="header-inner">
          <button className="brand" type="button" aria-label="Heya Cards" disabled={busy} onClick={() => navigate({ view: "create" })}>
            <HeyaWordmark />
          </button>
          <nav className="studio-nav" aria-label="Card studio">
            <button type="button" disabled={busy} aria-current={!manage ? "page" : undefined} onClick={() => navigate({ view: "create" })}><Plus size={17} /> Create cards</button>
            <button type="button" disabled={busy} aria-current={manage ? "page" : undefined} onClick={() => navigate({ view: "manage" })}><LayoutGrid size={16} /> Manage cards</button>
          </nav>
          {account
            ? <div className="account">
              {account.email?.toLowerCase() === "vyshakiyengar@gmail.com" && <Link className="button secondary admin-link" href="/admin">Dashboard</Link>}
              <Link className="button secondary" href="/account">Account</Link>
              <form action="/auth/sign-out" method="post"><button className="button secondary" type="submit" disabled={busy}>Sign out</button></form>
            </div>
            : <span className="local-indicator">Device preview</span>}
        </div>
      </header>

      <main ref={main} className={`studio view-${screen.view}`}>
        {signOutFailed && <p className="form-error" role="alert">You’re still signed in. Try signing out again.</p>}
        {loadError && <p className="form-error" role="alert">{loadError}</p>}
        {screen.view === "create" && <CreateCards ready={ready} create={create} />}
        {screen.view === "manage" && (
          <>
            <div className="manage-heading">
              <div><h1 tabIndex={-1}>Manage cards.</h1>{!online && <p>Cards saved in this browser.</p>}</div>
              <button type="button" className="button primary" disabled={!ready || busy} onClick={() => navigate({ view: "create" })}><Plus size={18} /> Create a card</button>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <ul className="manage-list" aria-label="Your cards">
              {cards.map((card) => {
                const kind = getKind(card.draft);
                const title = card.draft.title;
                return (
                  <li className="manage-card" key={card.id}>
                    <DestinationMark kind={kind} />
                    <div className="managed-name"><strong>{title}</strong><small>{card.draft.type === "individual" ? card.draft.value : "Universal contact"}</small><span className="managed-wallet"><AppleWalletMark /> Apple Wallet</span></div>
                    <div className="manage-actions">
                      <button className="button secondary" type="button" disabled={busy} aria-label={`Open ${title}`} onClick={() => open(card)}><QrCode size={16} /> Open</button>
                      <button className="button secondary" type="button" disabled={busy} aria-label={`Edit ${title}`} onClick={() => edit(card)}><PenLine size={16} /> Edit</button>
                      <button className="icon-button delete-button" type="button" disabled={busy} aria-label={`Delete ${title}`} onClick={() => void remove(card)}><Trash2 size={17} /></button>
                    </div>
                  </li>
                );
              })}
            </ul>
            {!cards.length && !loadError && <p className="empty-library">{ready ? "Your saved cards will appear here." : "Loading your cards…"}</p>}
          </>
        )}
        {screen.view === "edit" && (() => {
          const editing = screen;
          const { draft } = editing;
          const kind = getKind(draft);
          const label = kind === "universal" ? "Universal" : destinations[kind].label;
          function change(next: CardInput) {
            setScreen({ ...editing, draft: next });
            if (error) setError(undefined);
          }
          return (
            <div className="focused-page">
              <button className="back-button" type="button" disabled={busy} onClick={() => navigate({ view: screen.id ? "manage" : "create" })}><ArrowLeft size={18} /> {screen.id ? "Manage cards" : "All card types"}</button>
              <div className="focused-heading">
                <div className="editor-kind"><DestinationMark kind={kind} /><span><AppleWalletMark /> Apple Wallet</span></div>
                <h1 tabIndex={-1}>{screen.id ? `Edit your ${label} card` : kind === "universal" ? "Create a universal card" : `Create your ${label} card`}</h1>
                <p>{scanDescriptions[kind]}</p>
              </div>
              <form className="editor" onSubmit={save} noValidate>
                <fieldset disabled={busy}>
                  <legend className="visually-hidden">Card details</legend>
                  {draft.type === "individual" && (
                    <label className="field">{destinations[draft.kind].field}
                      <input value={draft.value} placeholder={destinations[draft.kind].hint} type={destinations[draft.kind].inputType}
                        autoCapitalize="none" spellCheck={false}
                        maxLength={draft.kind === "email" ? cardLimits.email : draft.kind === "phone" ? cardLimits.phone : cardLimits.link}
                        onChange={(event) => change({ ...draft, value: event.target.value })} />
                    </label>
                  )}
                  <label className="field">Name on card
                    <input value={draft.name ?? ""} maxLength={cardLimits.text} placeholder="First name" autoComplete="name"
                      onChange={(event) => change({ ...draft, name: event.target.value })} />
                  </label>
                  {draft.type === "universal" && <UniversalFields draft={draft} onChange={change} />}
                  {editing.id && (
                    <details className="optional-fields">
                      <summary>Rename saved card</summary>
                      <label className="field">Name in Manage cards
                        <input value={draft.title} maxLength={cardLimits.title}
                          onChange={(event) => change({ ...draft, title: event.target.value })} />
                        <span className="input-help">Only used to find this card in your list.</span>
                      </label>
                    </details>
                  )}
                  {draft.type === "universal" && <p className="privacy">Anyone who scans or photographs your QR can read and share the contact details you include.</p>}
                  {error && <p className="form-error" role="alert">{error}</p>}
                  <button className="button primary save-button" type="submit" disabled={!ready}>
                    {busy ? "Generating…" : "Generate your Apple Wallet card"} <ArrowRight size={18} />
                  </button>
                </fieldset>
              </form>
            </div>
          );
        })()}
        {screen.view === "saved" && (
          <div className="focused-page result-page">
            <button className="back-button" type="button" onClick={() => navigate({ view: "manage" })}><ArrowLeft size={18} /> Manage cards</button>
            <div className="result-heading">
              {screen.justSaved && <span className="saved-tick" aria-hidden="true"><Check size={22} /></span>}
              <h1 tabIndex={-1}>{screen.justSaved ? "Your card is ready." : screen.card.draft.title}</h1>
            </div>
            <CardPreview draft={screen.card.draft} preview={screen.preview} walletUrl={online && walletConfigured ? `/api/cards/${screen.card.id}/wallet` : undefined} />
            <button className="button secondary result-edit" type="button" onClick={() => edit(screen.card)}><PenLine size={16} /> Edit details</button>
          </div>
        )}
      </main>
      <ProjectCredit />
    </>
  );
}
