import type { CardInput } from "@/lib/cards";
import { cardText } from "@/lib/card-text";
export { cardKind, cardText } from "@/lib/card-text";
import { type buildCardQr } from "@/lib/qr";
import { walletCardDesign, walletSurfaceStyle } from "@/lib/wallet-card-design";
import { DestinationMark, scanDescriptions } from "./card-fields";
import { HeyaWordmark } from "./heya-wordmark";
import { QrGraphic } from "./qr-graphic";

export type CardCode = ReturnType<typeof buildCardQr>;
export type CardArrival = "created" | "updated" | "opened" | "live";

// The styled card used for the shareable image and the studio's previews.
export function CardFace({ draft, code, arrival = "opened" }: { draft: CardInput; code: CardCode | null; arrival?: CardArrival }) {
  const { kind, label, name, detail } = cardText(draft);
  const photo = draft.type === "universal" ? draft.photo : undefined;
  return (
    <div className="wallet-preview" data-arrival={arrival} style={walletSurfaceStyle(kind)}>
      <div className="pass-face">
        <div className="pass-brand-row">
          <span className="pass-platform"><DestinationMark kind={kind} /> {label}</span>
          <span className="pass-site">heya.cards</span>
        </div>
        <div className="pass-identity">
          <div className="pass-holder">
            <div className="pass-name" data-long={name.length > 28}>{name}</div>
            {detail && <div className="pass-detail" title={detail}>{detail}</div>}
          </div>
          {photo && <img className="pass-photo" src={photo} alt="" />}
        </div>
      </div>
      <div className="pass-paper" data-density={code?.density ?? "normal"}>
        <div className="pass-barcode">
          {code
            ? <QrGraphic code={code} label="Scannable card QR" maxWidth={260} />
            : <span className="pass-barcode-empty">Add a detail to see your QR</span>}
        </div>
        <div className="pass-invitation">
          <span className="pass-action" title={scanDescriptions[kind]}>{walletCardDesign(kind).action}</span>
          <span className="scan-label visually-hidden">{scanDescriptions[kind]}</span>
          <HeyaWordmark compact />
        </div>
      </div>
    </div>
  );
}
