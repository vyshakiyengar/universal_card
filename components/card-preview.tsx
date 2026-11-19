import { Download, Share2 } from "lucide-react";
import { useState } from "react";
import { cardKindLabels, type CardInput } from "@/lib/cards";
import { qrQuietZone as quietZone, type buildCardQr } from "@/lib/qr";
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

function makeQrImage({ size, modules }: Preview["code"], filename: string) {
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
  // Encode synchronously so the share sheet can open under the original click.
  const base64 = canvas.toDataURL("image/png").split(",")[1];
  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  return new File([bytes], `${filename}.png`, { type: "image/png" });
}

export function CardPreview({ draft, preview, walletUrl, created }: { draft: CardInput; preview: Preview; walletUrl?: string; created: boolean }) {
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

  async function shareQr() {
    setSharing(true);
    setShareStatus("");
    try {
      const file = makeQrImage(preview.code, filename);
      if (!file) {
        setShareStatus("The QR image couldn’t be created.");
        return;
      }
      if (await tryNativeShare({ files: [file] })) return;
      download(URL.createObjectURL(file), file.name);
      setShareStatus("QR image downloaded.");
    } catch {
      setShareStatus("The QR image couldn’t be shared. Try downloading it.");
    } finally {
      setSharing(false);
    }
  }

  function downloadQr() {
    const file = makeQrImage(preview.code, filename);
    if (file) download(URL.createObjectURL(file), file.name);
    else setShareStatus("The QR image couldn’t be created.");
  }

  return (
    <section className="saved-preview" aria-label="Saved card">
      <div className="wallet-preview" data-created={created} style={walletSurfaceStyle(kind)}>
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
            <span className="pass-links" aria-hidden="true" />
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
      {preview.code.density === "dense" && <p className="density-note" role="status">This QR is dense. Test it on another phone before sharing.</p>}
      <div className="preview-actions">
        <button className="button primary" type="button" disabled={sharing} onClick={shareQr}><Share2 size={16} aria-hidden="true" /> Share QR</button>
        <button className="button secondary" type="button" onClick={downloadQr}><Download size={16} /> QR image</button>
        {isUniversal && <button className="button secondary" type="button" onClick={() => download(
          URL.createObjectURL(new Blob([preview.payload], { type: "text/vcard;charset=utf-8" })), `${filename}.vcf`,
        )}><Download size={16} /> vCard</button>}
      </div>
      <p className="share-status" role="status">{shareStatus}</p>
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
