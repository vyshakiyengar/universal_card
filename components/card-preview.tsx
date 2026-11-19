import { Download, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cardKindLabels, type CardInput } from "@/lib/cards";
import { makeCardImage } from "@/lib/card-image";
import { type buildCardQr } from "@/lib/qr";
import { tryNativeShare } from "@/lib/share";
import { walletCardDesign, walletSurfaceStyle } from "@/lib/wallet-card-design";
import { AppleWalletMark } from "./apple-wallet-mark";
import { DestinationMark, scanDescriptions } from "./card-fields";
import { HeyaWordmark } from "./heya-wordmark";
import { QrGraphic } from "./qr-graphic";

export type Preview = { code: ReturnType<typeof buildCardQr>; payload: string };

function download(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function CardPreview({ draft, preview, walletUrl, arrival, onEdit }: { draft: CardInput; preview: Preview; walletUrl?: string; arrival: "created" | "updated" | "opened"; onEdit: () => void }) {
  const [sharing, setSharing] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const isUniversal = draft.type === "universal";
  const kind = isUniversal ? "universal" : draft.kind;
  const label = isUniversal ? "Universal card" : cardKindLabels[kind];
  const name = draft.name?.trim() || (isUniversal ? "Contact" : label);
  const detail = isUniversal
    ? [draft.jobTitle.trim(), draft.company.trim()].filter(Boolean).join(" · ")
    : draft.kind === "linkedin" ? "" : draft.value.trim().replace(/^https?:\/\/(?:www\.)?/, "").replace(/\/$/, "");
  const filename = draft.title.trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "universal-card";

  const cardRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<File>();
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const photo = draft.type === "universal" ? draft.photo : undefined;
  useEffect(() => {
    const mark = cardRef.current?.querySelector<SVGSVGElement>(".pass-platform svg");
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
    setShareStatus("Card image downloaded.");
  }

  async function shareCard() {
    if (!image) return;
    setSharing(true);
    setShareStatus("");
    try {
      if (!await tryNativeShare({ files: [image] })) downloadCard();
    } finally { setSharing(false); }
  }

  return (
    <section className="saved-preview" aria-label="Saved card">
      <div ref={cardRef} className="wallet-preview" data-arrival={arrival} style={walletSurfaceStyle(kind)}>
        <div className="pass-face">
          <div className="pass-brand-row">
            <span className="pass-platform"><DestinationMark kind={kind} /> {label}</span>
            <span className="pass-wallet"><AppleWalletMark /> Apple Wallet</span>
          </div>
          <div className="pass-identity">
            <div className="pass-holder">
              <div className="pass-name" data-long={name.length > 28}>{name}</div>
              {detail && <div className="pass-detail" title={detail}>{detail}</div>}
            </div>
            {photo && <img className="pass-photo" src={photo} alt="Card photo" />}
          </div>
        </div>
        <div className="pass-paper" data-density={preview.code.density}>
          <div className="pass-barcode"><QrGraphic code={preview.code} label="Scannable card QR" maxWidth={preview.code.density === "dense" ? 250 : 184} /></div>
          <div className="pass-invitation">
            <span className="pass-action" title={scanDescriptions[kind]}>{walletCardDesign(kind).action}</span>
            <span className="scan-label visually-hidden">{scanDescriptions[kind]}</span>
            <HeyaWordmark compact />
          </div>
        </div>
      </div>
      {preview.code.density === "dense" && <p className="density-note" role="status">This QR is enlarged to make your details easier to scan.</p>}
      <div className="preview-actions">
        <button className="button primary" type="button" disabled={!image || sharing} onClick={shareCard}><Share2 size={16} /> Share card</button>
        <button className="button secondary" type="button" disabled={!image} onClick={downloadCard}><Download size={16} /> Download card</button>
      </div>
      {failed && <p role="alert">Couldn’t prepare the card image. <button className="text-button" onClick={() => setAttempt(n => n + 1)}>Try again</button></p>}
      <p className="share-status" role="status">{shareStatus}</p>
      <div className="wallet-action-card">
        {walletUrl ? (
          <a className="button wallet-button" href={walletUrl}><AppleWalletMark /> Add to Apple Wallet</a>
        ) : (
          <><button className="button wallet-button" type="button" disabled aria-describedby="wallet-preview-note"><AppleWalletMark /> Add to Apple Wallet</button>
          <small id="wallet-preview-note">Wallet installation coming soon.</small></>
        )}
      </div>
      <div className="result-tools">
        <button className="text-button" type="button" onClick={onEdit}>Edit details</button>
        {isUniversal && <button className="text-button" type="button" onClick={() => download(
          URL.createObjectURL(new Blob([preview.payload], { type: "text/vcard;charset=utf-8" })), `${filename}.vcf`,
        )}>vCard</button>}
      </div>
    </section>
  );
}
