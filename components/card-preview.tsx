import { Download, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CardInput } from "@/lib/cards";
import { makeCardImage } from "@/lib/card-image";
import { tryNativeShare } from "@/lib/share";
import { track } from "@/lib/track";
import { CardFace, cardText, type CardArrival, type CardCode } from "./card-face";

export type Preview = { code: CardCode; payload: string };
export type WalletAction =
  | { type: "download"; href: string }
  | { type: "sign-in"; onSignIn: () => void }
  | { type: "unavailable" };

function download(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function isAppleMobile() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

// Apple's official badge artwork, unmodified (public/add-to-apple-wallet.svg).
const badge = <img src="/add-to-apple-wallet.svg" alt="Add to Apple Wallet" width={158} height={50} />;

function WalletButton({ action, kind }: { action: WalletAction; kind: string }) {
  if (action.type === "download") {
    return <a className="wallet-badge" href={action.href} onClick={() => track("wallet_tap", kind)}>{badge}</a>;
  }
  if (action.type === "sign-in") {
    return <button className="wallet-badge" type="button" onClick={() => { track("wallet_tap", kind); action.onSignIn(); }}>{badge}</button>;
  }
  return null;
}

export function CardPreview({ draft, preview, wallet, arrival, onEdit }: {
  draft: CardInput; preview: Preview; wallet: WalletAction; arrival: Exclude<CardArrival, "live">; onEdit: () => void;
}) {
  const [sharing, setSharing] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const [appleMobile, setAppleMobile] = useState(false);
  const isUniversal = draft.type === "universal";
  const { kind, label, name, detail } = cardText(draft);
  const filename = draft.title.trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "heya-card";

  const faceRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<File>();
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const photo = draft.type === "universal" ? draft.photo : undefined;
  useEffect(() => setAppleMobile(isAppleMobile()), []);
  useEffect(() => {
    const mark = faceRef.current?.querySelector<SVGSVGElement>(".pass-platform svg");
    if (!mark) return;
    let active = true;
    setImage(undefined);
    setFailed(false);
    makeCardImage({ kind, label, name, detail, code: preview.code, photo, mark, filename })
      .then(file => { if (active) setImage(file); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [kind, label, name, detail, preview.code, photo, filename, attempt]);

  function downloadCard() {
    if (!image) return;
    download(URL.createObjectURL(image), image.name);
    track("download_image", kind);
    setShareStatus("Card image downloaded.");
  }

  async function shareCard() {
    if (!image) return;
    setSharing(true);
    setShareStatus("");
    try {
      track("share", kind);
      if (!await tryNativeShare({ files: [image], text: "Made with heya.cards" })) downloadCard();
    } finally { setSharing(false); }
  }

  const walletNote = wallet.type === "sign-in"
    ? "Sign in to add it to Apple Wallet. Your cards come with you."
    : wallet.type === "unavailable" ? "Apple Wallet is coming soon. You can share or download your card now." : "";
  const walletBlock = (
    <div className="wallet-action-card" data-prominent={appleMobile || undefined}>
      <WalletButton action={wallet} kind={kind} />
      {walletNote && <small>{walletNote}</small>}
      {arrival === "updated" && wallet.type !== "unavailable" && <small className="wallet-update-note">Add it to Wallet again to update it.</small>}
    </div>
  );
  const imageActions = (
    <div className="preview-actions">
      <button className="button secondary" type="button" disabled={!image || sharing} onClick={shareCard}><Share2 size={16} /> Share card</button>
      <button className="button secondary" type="button" disabled={!image} onClick={downloadCard}><Download size={16} /> Download card</button>
    </div>
  );

  return (
    <section className="saved-preview" aria-label="Saved card">
      <div className="result-card" ref={faceRef}>
        <CardFace draft={draft} code={preview.code} arrival={arrival} />
      </div>
      {preview.code.density === "dense" && <p className="density-note" role="status">This QR holds a lot of detail, so it’s shown larger to scan easily.</p>}
      <div className="result-actions" data-apple={appleMobile || undefined}>
        {walletBlock}
        {imageActions}
      </div>
      {failed && <p role="alert">Couldn’t prepare the card image. <button className="text-button" onClick={() => setAttempt(n => n + 1)}>Try again</button></p>}
      <p className="share-status" role="status">{shareStatus}</p>
      <div className="result-tools">
        <button className="text-button" type="button" onClick={onEdit}>Edit details</button>
        {isUniversal && <button className="text-button" type="button" onClick={() => download(
          URL.createObjectURL(new Blob([preview.payload], { type: "text/vcard;charset=utf-8" })), `${filename}.vcf`,
        )}>Download contact file (.vcf)</button>}
      </div>
    </section>
  );
}
