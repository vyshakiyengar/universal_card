import { Download } from "lucide-react";
import type { CardInput } from "@/lib/cards";
import { qrQuietZone as quietZone, type buildCardQr } from "@/lib/qr";
import { AppleWalletMark } from "./apple-wallet-mark";
import { destinations, scanDescriptions } from "./card-fields";
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

function downloadPng({ size, modules }: Preview["code"], filename: string) {
  const canvas = document.createElement("canvas");
  const scale = 8;
  canvas.width = canvas.height = (size + quietZone * 2) * scale;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#000";
  modules.forEach((value, index) => {
    if (value) context.fillRect((index % size + quietZone) * scale, (Math.floor(index / size) + quietZone) * scale, scale, scale);
  });
  canvas.toBlob((file) => {
    if (file) download(URL.createObjectURL(file), `${filename}.png`);
  });
}

export function CardPreview({ draft, preview, walletUrl }: { draft: CardInput; preview: Preview; walletUrl?: string }) {
  const isUniversal = draft.type === "universal";
  const label = isUniversal ? "Contact" : destinations[draft.kind].label;
  const name = draft.name?.trim() || label;
  const detail = isUniversal
    ? [draft.jobTitle.trim(), draft.company.trim()].filter(Boolean).join(" · ")
    : draft.kind === "linkedin" ? "" : draft.value.trim().replace(/^https?:\/\/(?:www\.)?/, "").replace(/\/$/, "");
  const filename = draft.title.trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "universal-card";

  return (
    <section className="saved-preview" aria-label="Saved card">
      <div className="wallet-preview">
        <span className="pass-wallet"><AppleWalletMark /> Apple Wallet</span>
        <div className="pass-name">{name}</div>
        {detail && <div className="pass-detail">{detail}</div>}
        <div className="pass-barcode">
          <QrGraphic code={preview.code} label="Scannable card QR" />
          <span className="scan-label">{scanDescriptions[isUniversal ? "universal" : draft.kind]}</span>
        </div>
        <HeyaWordmark compact />
      </div>
      {preview.code.density === "dense" && <p className="density-note" role="status">This QR is dense. Test it on another phone before sharing.</p>}
      <div className="preview-actions">
        <button className="button secondary" type="button" onClick={() => downloadPng(preview.code, filename)}><Download size={16} /> QR image</button>
        {isUniversal && <button className="button secondary" type="button" onClick={() => download(
          URL.createObjectURL(new Blob([preview.payload], { type: "text/vcard;charset=utf-8" })), `${filename}.vcf`,
        )}><Download size={16} /> vCard</button>}
      </div>
      <div className="wallet-action-card">
        <AppleWalletMark />
        <div><strong>Apple Wallet</strong><p id="wallet-preview-note">{walletUrl ? "Keep this card handy on your iPhone." : "Wallet installation coming soon."}</p></div>
        {walletUrl ? (
          <a className="button wallet-button" href={walletUrl}>Add to Apple Wallet</a>
        ) : (
          <button className="button wallet-button" type="button" disabled aria-describedby="wallet-preview-note">Add to Apple Wallet</button>
        )}
      </div>
    </section>
  );
}
