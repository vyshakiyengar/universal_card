import { Contact, Download, QrCode, ScanLine } from "lucide-react";
import type { CardInput } from "@/lib/cards";
import { qrQuietZone as quietZone, type buildCardQr } from "@/lib/qr";
import { destinations } from "./card-fields";

export type Preview = { code: ReturnType<typeof buildCardQr>; payload: string };


function modulePath({ size, modules }: Preview["code"]) {
  const segments: string[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!modules[y * size + x]) continue;
      const start = x;
      while (x + 1 < size && modules[y * size + x + 1]) x++;
      const run = x - start + 1;
      segments.push(`M${start + quietZone} ${y + quietZone}h${run}v1h-${run}z`);
    }
  }
  return segments.join("");
}

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

export function CardPreview({ draft, preview, error, wallet }: { draft: CardInput; preview?: Preview; error?: string; wallet?: React.ReactNode }) {
  const isUniversal = draft.type === "universal";
  const name = draft.name?.trim() || (isUniversal
    ? (preview ? "Contact" : "Your name")
    : destinations[draft.kind].label);
  const linkedInId = !isUniversal && draft.kind === "linkedin" && preview
    ? preview.payload.slice(preview.payload.lastIndexOf("/") + 1)
    : null;
  const detail = isUniversal
    ? [draft.jobTitle.trim(), draft.company.trim()].filter(Boolean).join(" · ") || "Contact card"
    : linkedInId || draft.value.trim().replace(/^https?:\/\/(?:www\.)?/, "").replace(/\/$/, "") || "Direct link";
  const filename = draft.title.trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "universal-card";
  const size = preview ? preview.code.size + quietZone * 2 : 0;
  const pixelWidth = size ? size * Math.floor(216 / size) : 0;
  const Icon = isUniversal ? Contact : destinations[draft.kind].icon;

  return (
    <aside className="preview-pane" aria-label="Live preview">
      <div className="preview-heading">
        <h2>Live preview</h2>
        <ScanLine size={19} />
      </div>
      <div className="wallet-preview">
        <div className="pass-brand"><Icon size={18} /> {isUniversal ? "Universal contact" : destinations[draft.kind].label}</div>
        <div className="pass-name">{name}</div>
        <div className="pass-detail">{detail}</div>
        <div className="pass-barcode">
          {preview ? (
            <svg role="img" aria-label="Scannable card QR" width={pixelWidth} height={pixelWidth} viewBox={`0 0 ${size} ${size}`}
              shapeRendering="crispEdges" className="qr-code">
              <rect width={size} height={size} fill="white" />
              <path d={modulePath(preview.code)} fill="black" />
            </svg>
          ) : (
            <div className="empty-qr"><QrCode size={46} strokeWidth={1.3} /><span>QR code appears here</span></div>
          )}
          <span className="scan-label">{isUniversal ? "Scan to save contact" : `Scan to open ${destinations[draft.kind].label}`}</span>
        </div>
      </div>
      {preview ? (
        <>
          <div className={`qr-status ${preview.code.density === "dense" ? "dense" : ""}`} role="status">
            <span className="status-dot" /> <span>{preview.code.density === "dense" ? "Dense QR · test on another phone" : "QR ready to scan"}</span>
            <span className="byte-count">{preview.code.bytes} bytes</span>
          </div>
          <div className="preview-actions">
            <button className="button secondary" type="button" onClick={() => downloadPng(preview.code, filename)}><Download size={16} /> QR image</button>
            {isUniversal && <button className="button secondary" type="button" onClick={() => download(
              URL.createObjectURL(new Blob([preview.payload], { type: "text/vcard;charset=utf-8" })), `${filename}.vcf`,
            )}><Download size={16} /> vCard</button>}
          </div>
        </>
      ) : <p className={error ? "preview-error" : "preview-tip"}>{error ?? "Add a contact detail to generate a QR."}</p>}
      {wallet}
    </aside>
  );
}
