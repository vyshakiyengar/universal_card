import type { CardInput } from "@/lib/cards";
import { makeCardPayload } from "@/lib/cards";
import { buildCardQr } from "@/lib/qr";
import { walletSurfaceStyle } from "@/lib/wallet-card-design";
import { CardFace, cardKind, cardText, type CardCode } from "./card-face";
import { QrGraphic } from "./qr-graphic";

// The QR for a draft that may not be valid yet. Null until the draft can make one.
export function liveCode(draft: CardInput): CardCode | null {
  try {
    return buildCardQr(makeCardPayload(draft).payload);
  } catch {
    return null;
  }
}

export function LivePreview({ draft, code }: { draft: CardInput; code: CardCode | null }) {
  return (
    <aside className="live-preview" aria-label="Live preview">
      <div className="live-preview-heading"><span>Live preview</span><small>Updates as you type</small></div>
      <CardFace draft={draft} code={code} arrival="live" />
    </aside>
  );
}

// A compact strip for phones, above the form.
export function LiveStrip({ draft, code }: { draft: CardInput; code: CardCode | null }) {
  const { name, detail } = cardText(draft);
  return (
    <div className="live-strip" aria-hidden="true" style={walletSurfaceStyle(cardKind(draft))}>
      <span className="live-strip-qr">{code ? <QrGraphic code={code} label="" maxWidth={40} /> : null}</span>
      <span className="live-strip-text"><strong>{name}</strong>{detail && <small>{detail}</small>}</span>
      <span className="live-strip-tag">Live</span>
    </div>
  );
}
