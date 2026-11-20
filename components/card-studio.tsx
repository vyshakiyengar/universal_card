"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, PenLine, Plus, Trash2 } from "lucide-react";
import { cardLimits, makeCardPayload, type CardInput, type DestinationKind, type UniversalCard } from "@/lib/cards";
import { savedDetail, addIndividualDetails } from "@/lib/saved-details";
import { buildCardQr } from "@/lib/qr";
import { localCardsKey, pendingWalletKey, trialCookies } from "@/lib/trial";
import { track } from "@/lib/track";
import { DestinationMark, destinations, scanActions, scanDescriptions, UniversalFields } from "./card-fields";
import { CardPreview, type Preview, type WalletAction } from "./card-preview";
import { HowItWorksClip, hasHowItWorksClip } from "./how-it-works-clip";
import { LivePreview, LiveStrip, liveCode } from "./live-preview";
import { PhotoPicker } from "./photo-picker";
import { ProjectCredit } from "./project-credit";
import { StudioHeader } from "./studio-header";

type SavedCard = { id: string; draft: CardInput; createdAt: string; updatedAt: string };
type EntryKind = DestinationKind | "universal";
type Screen =
  | { view: "create" | "manage" }
  | { view: "edit"; draft: CardInput; original: CardInput; id?: string }
  | { view: "saved"; card: SavedCard; preview: Preview; arrival: "created" | "updated" | "opened" };

type StudioProps = {
  account?: { email: string | null; firstName: string; fullName: string; isAdmin?: boolean };
  trial?: boolean;
  walletConfigured?: boolean;
  signOutFailed?: boolean;
};

const types = ["linkedin", "whatsapp", "instagram", "email", "phone", "url", "website", "snapchat"] as const;

function newDraft(kind: EntryKind, account?: StudioProps["account"]): CardInput {
  return kind === "universal"
    ? {
      type: "universal", title: "Universal card", name: account?.fullName || account?.firstName || "", jobTitle: "", company: "",
      emails: [], phones: [], links: [],
    }
    : { type: "individual", title: destinations[kind].label, name: account?.firstName ?? "", kind, value: "" };
}

// Start a new Universal card with one work email and one mobile row ready to fill.
function withStarterRows(draft: UniversalCard): UniversalCard {
  return {
    ...draft,
    emails: draft.emails.length ? draft.emails : [{ label: "work", value: "" }],
    phones: draft.phones.length ? draft.phones : [{ label: "mobile", value: "" }],
  };
}

function getKind(draft: CardInput): EntryKind {
  return draft.type === "universal" ? "universal" : draft.kind;
}

function readLocalCards(): SavedCard[] {
  const saved: unknown = JSON.parse(localStorage.getItem(localCardsKey) ?? "[]");
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

// Cards made in this browser before signing in move into the account, oldest first.
async function moveLocalCardsToAccount(): Promise<{ moved: { localId: string; card: SavedCard }[]; failed: number }> {
  let local: SavedCard[];
  try { local = readLocalCards(); } catch { return { moved: [], failed: 0 }; }
  const moved: { localId: string; card: SavedCard }[] = [];
  const kept: SavedCard[] = [];
  for (const card of [...local].reverse()) {
    try {
      moved.push({ localId: card.id, card: (await cardsRequest<{ card: SavedCard }>("", { method: "POST", body: JSON.stringify(card.draft) })).card });
    } catch {
      kept.push(card);
    }
  }
  if (kept.length) localStorage.setItem(localCardsKey, JSON.stringify(kept.reverse()));
  else localStorage.removeItem(localCardsKey);
  return { moved, failed: kept.length };
}

function CreateCards({ ready, create, firstName }: { ready: boolean; create: (type: EntryKind) => void; firstName?: string }) {
  return (
    <>
      <section className="studio-intro" data-clip={hasHowItWorksClip || undefined} aria-labelledby="page-title">
        <div className="studio-intro-copy">
          <h1 id="page-title" tabIndex={-1}>{firstName ? `Hi ${firstName}, let’s make your card` : "Let’s make your card"}</h1>
        </div>
        {hasHowItWorksClip && <HowItWorksClip className="studio-clip" />}
      </section>

      <section id="universal-cards" className="chooser-section universal-section" aria-labelledby="universal-title">
        <div className="section-heading">
          <h2 id="universal-title">Create <span>Universal</span> Cards</h2>
          <p>(All contact details in one card)</p>
        </div>
        <button className="universal-choice" type="button" disabled={!ready} onClick={() => create("universal")}>
          <DestinationMark kind="universal" />
          <span><strong>Universal card</strong><small>Scanning saves your name, numbers, emails and links to their Contacts.</small></span>
          <span className="universal-arrow" aria-hidden="true"><ArrowRight size={18} /></span>
        </button>
      </section>

      <section id="individual-cards" className="chooser-section" aria-labelledby="individual-title">
        <div className="section-heading">
          <h2 id="individual-title">Create <span>Individual</span> Cards</h2>
          <p>(Separate cards for each)</p>
        </div>
        <div className="destination-grid">
          {types.map((kind) => (
            <button key={kind} className="destination-card" type="button" disabled={!ready} onClick={() => create(kind)}>
              <span className="tile-top"><DestinationMark kind={kind} /><ArrowRight size={18} className="tile-arrow" aria-hidden="true" /></span>
              <span className="tile-text"><strong>{destinations[kind].label}</strong><span className="tile-action">{scanActions[kind]}</span></span>
            </button>
          ))}
        </div>
      </section>
      <aside className="studio-faq" aria-label="Studio FAQ">
        <details className="faq-question">
          <summary>What will someone see when they scan my card?</summary>
          <div><p>A Universal card opens a contact they can review and save. An Individual card takes them to the destination you chose. For example, a WhatsApp card opens your chat.</p>
            <p><Link href="/faq">Explore the Heya FAQ</Link></p></div>
        </details>
      </aside>
    </>
  );
}

// Once the free card exists, the studio asks for sign-in on the next load.
function markTrialUsed() {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${trialCookies.used}=1; Max-Age=31536000; Path=/; SameSite=Lax${secure}`;
}

export function CardStudio({ account, trial = false, walletConfigured = false, signOutFailed = false }: StudioProps = {}) {
  const online = Boolean(account);
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [screen, setScreen] = useState<Screen>({ view: "create" });
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [loadError, setLoadError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [editorTab, setEditorTab] = useState<"details" | "preview">("details");
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
        if (!online) {
          const local = readLocalCards();
          if (trial && local.length) markTrialUsed();
          setCards(local);
          setReady(true);
          return;
        }
        const { moved, failed } = await moveLocalCardsToAccount();
        const saved = (await cardsRequest<{ cards: SavedCard[] }>("", { signal: controller.signal })).cards;
        if (controller.signal.aborted) return;
        setCards(saved);
        setReady(true);
        if (moved.length) {
          track("trial_cards_saved");
          setNotice(`${moved.length === 1 ? "Your card is" : `Your ${moved.length} cards are`} now saved to your account.`);
        }
        if (failed) setLoadError(`${failed === 1 ? "One card" : `${failed} cards`} from this browser couldn’t be saved. They’re still here, and we’ll try again next time.`);
        const pending = localStorage.getItem(pendingWalletKey);
        localStorage.removeItem(pendingWalletKey);
        const target = moved.find(({ localId }) => localId === pending)?.card;
        if (target) setScreen({ view: "saved", card: target, preview: getSavedPreview(target), arrival: "opened" });
      } catch {
        if (!controller.signal.aborted) setLoadError("Your cards could not be loaded. Reload the page to try again.");
      }
    }
    void readCards();
    return () => controller.abort();
  }, [online, trial]);

  function navigate(next: Screen) {
    if (busy) return;
    if (screen.view === "edit" && JSON.stringify(screen.draft) !== JSON.stringify(screen.original)
      && !window.confirm("Discard unsaved changes?")) return;
    setError(undefined);
    setNotice(undefined);
    setEditorTab("details");
    setScreen(next);
  }

  // A first-time visitor gets one free card. Anything more asks them to sign in.
  const trialUsed = trial && cards.length >= 1;
  function signInForMore() {
    track("cta_click", "trial_more");
    window.location.assign("/auth/sign-in?from=more");
  }

  function create(kind: EntryKind) {
    if (trialUsed) return signInForMore();
    let draft = newDraft(kind, account);
    if (draft.type === "individual") {
      const previous = savedDetail(cards.map(card => card.draft), draft.kind);
      if (previous) {
        draft.value = previous.value;
        draft.name = previous.name || draft.name;
      }
    }
    if (draft.type === "universal") draft = withStarterRows(addIndividualDetails(draft, cards.map(card => card.draft)));
    navigate({ view: "edit", draft, original: draft });
  }

  function edit(card: SavedCard) {
    navigate({ view: "edit", draft: card.draft, original: card.draft, id: card.id });
  }

  function open(card: SavedCard) {
    try {
      navigate({ view: "saved", card, preview: getSavedPreview(card), arrival: "opened" });
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
        const current = readLocalCards();
        const old = current.find(({ id }) => id === screen.id);
        saved = { id: old?.id ?? crypto.randomUUID(), draft: card, createdAt: old?.createdAt ?? time, updatedAt: time };
        localStorage.setItem(localCardsKey, JSON.stringify([saved, ...current.filter(({ id }) => id !== saved.id)]));
        if (trial && !old) {
          markTrialUsed();
          track("trial_card_created", getKind(card));
        }
      }
      setCards((current) => [saved, ...current.filter(({ id }) => id !== saved.id)]);
      setEditorTab("details");
      setScreen({ view: "saved", card: saved, preview, arrival: screen.id ? "updated" : "created" });
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
      else localStorage.setItem(localCardsKey, JSON.stringify(readLocalCards().filter(({ id }) => id !== card.id)));
      setCards((current) => current.filter(({ id }) => id !== card.id));
    } catch {
      setError("Your card could not be deleted. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function walletAction(card: SavedCard): WalletAction {
    if (!walletConfigured) return { type: "unavailable" };
    if (online) return { type: "download", href: `/api/cards/${card.id}/wallet` };
    // The free card goes straight to Wallet, no account needed.
    if (trial) return { type: "form", action: "/api/trial/wallet", fields: { id: card.id, card: JSON.stringify(card.draft) } };
    return { type: "unavailable" };
  }

  const manage = screen.view === "manage" || screen.view === "saved" || (screen.view === "edit" && Boolean(screen.id));

  return (
    <>
      <StudioHeader account={account} trial={trial} busy={busy} manage={manage}
        onNavigate={(view) => navigate({ view })} />

      <main ref={main} className={`studio view-${screen.view}`}>
        {signOutFailed && <p className="form-error" role="alert">You’re still signed in. Try signing out again.</p>}
        {loadError && <p className="form-error" role="alert">{loadError}</p>}
        {notice && <p className="form-notice" role="status">{notice}</p>}
        {screen.view === "create" && trialUsed && (
          <div className="trial-banner" role="status">
            <div><strong>You’ve made your free card</strong><span>Sign in to make more cards. Your first card comes with you.</span></div>
            <a className="button primary" href="/auth/sign-in?from=more">Sign in</a>
          </div>
        )}
        {screen.view === "create" && <CreateCards ready={ready} create={create} firstName={account?.firstName} />}
        {screen.view === "manage" && (
          <>
            <div className="manage-heading">
              <div><h1 tabIndex={-1}>Your cards</h1>{!online && <p>Cards saved in this browser.{trial && " Sign in to keep them and make more."}</p>}</div>
              <button type="button" className="button primary" disabled={!ready || busy} onClick={() => trialUsed ? signInForMore() : navigate({ view: "create" })}><Plus size={18} /> Create a card</button>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <ul className="manage-list" aria-label="Your cards">
              {cards.map((card) => {
                const kind = getKind(card.draft);
                const title = card.draft.title;
                return (
                  <li className="manage-card" key={card.id}>
                    <button className="managed-open" type="button" disabled={busy} aria-label={`Open ${title}`} onClick={() => open(card)}>
                      <DestinationMark kind={kind} />
                      <span className="managed-name"><strong>{title}</strong><small>{card.draft.type === "individual" ? card.draft.value : card.draft.name || "Universal card"}</small></span>
                      <ArrowRight size={16} />
                    </button>
                    <div className="manage-actions">
                      <button className="icon-button" type="button" disabled={busy} aria-label={`Edit ${title}`} title="Edit" onClick={() => edit(card)}><PenLine size={16} /></button>
                      <button className="icon-button delete-button" type="button" disabled={busy} aria-label={`Delete ${title}`} title="Delete" onClick={() => void remove(card)}><Trash2 size={16} /></button>
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
          const code = liveCode(draft);
          function change(next: CardInput) {
            setScreen({ ...editing, draft: next });
            if (error) setError(undefined);
          }
          return (
            <div className="editor-page" data-tab={editorTab}>
              <button className="back-button" type="button" disabled={busy} onClick={() => navigate({ view: screen.id ? "manage" : "create" })}><ArrowLeft size={18} /> {screen.id ? "Your cards" : "All card types"}</button>
              <div className="editor-layout">
                <div className="editor-main">
                  <div className="focused-heading">
                    <h1 tabIndex={-1}>{screen.id ? `Edit your ${label} card` : kind === "universal" ? "Create a Universal card" : `Create your ${label} card`}</h1>
                    <p>{scanDescriptions[kind]}</p>
                  </div>
                  <div className="editor-tabs" role="tablist" aria-label="Editor view">
                    <button role="tab" type="button" aria-selected={editorTab === "details"} onClick={() => setEditorTab("details")}>Details</button>
                    <button role="tab" type="button" aria-selected={editorTab === "preview"} onClick={() => setEditorTab("preview")}>Preview</button>
                  </div>
                  <div className="editor-tab-details">
                    <LiveStrip draft={draft} code={code} />
                    <form className="editor" onSubmit={save} noValidate>
                      <fieldset disabled={busy}>
                        <legend className="visually-hidden">Card details</legend>
                        {draft.type === "universal" && (
                          <PhotoPicker photo={draft.photo} disabled={busy} onBusy={setBusy} onError={setError}
                            onChange={(photo) => change({ ...draft, photo })} />
                        )}
                        {draft.type === "individual" && (
                          <label className="field">{destinations[draft.kind].field}
                            <input value={draft.value} placeholder={destinations[draft.kind].hint} type={destinations[draft.kind].inputType}
                              autoCapitalize="none" spellCheck={false}
                              maxLength={draft.kind === "email" ? cardLimits.email : draft.kind === "phone" ? cardLimits.phone : cardLimits.link}
                              onChange={(event) => change({ ...draft, value: event.target.value })} />
                          </label>
                        )}
                        <label className="field">{draft.type === "universal" ? "Full name" : "Name on card"}
                          <input value={draft.name ?? ""} maxLength={cardLimits.text} placeholder={draft.type === "universal" ? "Alan Turing" : "Your name"} autoComplete="name"
                            onChange={(event) => change({ ...draft, name: event.target.value })} />
                        </label>
                        {draft.type === "universal" && <UniversalFields draft={draft} onChange={change} />}
                        {editing.id && (
                          <details className="optional-fields">
                            <summary>Rename saved card</summary>
                            <label className="field">Name in Your cards
                              <input value={draft.title} maxLength={cardLimits.title}
                                onChange={(event) => change({ ...draft, title: event.target.value })} />
                              <span className="input-help">Only used to find this card in your list.</span>
                            </label>
                          </details>
                        )}
                        {draft.type === "universal" && <p className="privacy">Anyone who scans or photographs your QR can read and share the contact details you include.</p>}
                        {error && <p className="form-error" role="alert">{error}</p>}
                        <button className="button primary save-button" type="submit" disabled={!ready}>
                          {busy ? "Saving…" : screen.id ? "Save changes" : "Create my card"} <ArrowRight size={18} />
                        </button>
                      </fieldset>
                    </form>
                  </div>
                  <div className="editor-tab-preview">
                    <LivePreview draft={draft} code={code} />
                    <p className="input-help">This is how your card looks. Tap Details to keep editing.</p>
                  </div>
                </div>
                <div className="editor-side"><LivePreview draft={draft} code={code} /></div>
              </div>
            </div>
          );
        })()}
        {screen.view === "saved" && (
          <div className="focused-page result-page">
            <button className="back-button" type="button" onClick={() => navigate({ view: "manage" })}><ArrowLeft size={18} /> Your cards</button>
            <div className="result-heading">
              <h1 tabIndex={-1}>{screen.arrival === "opened" ? screen.card.draft.title : screen.arrival === "updated" ? "Your card is updated" : "Your card is ready"}</h1>
              {screen.arrival !== "opened" && <span className="visually-hidden" role="status">Card saved.</span>}
            </div>
            <CardPreview onEdit={() => edit(screen.card)} arrival={screen.arrival} draft={screen.card.draft} preview={screen.preview}
              wallet={walletAction(screen.card)} />
            {trial && (
              <div className="trial-banner trial-save">
                <div><strong>Keep this card</strong><span>Sign in to save it to your account and make more cards.</span></div>
                <a className="button primary" href="/auth/sign-in?from=save" onClick={() => track("cta_click", "trial_save")}>Sign in to save</a>
              </div>
            )}
          </div>
        )}
      </main>
      <ProjectCredit />
    </>
  );
}
