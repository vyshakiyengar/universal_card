import type { CardInput } from "@/lib/cards";
import { walletCardDesign } from "@/lib/wallet-card-design";
import { DestinationMark } from "./card-fields";
import { cardText, type CardCode } from "./card-face";
import { QrGraphic } from "./qr-graphic";

// A close copy of the generic Apple Wallet pass the server signs (lib/server/wallet.ts).
export function WalletPassView({ draft, code }: { draft: CardInput; code: CardCode }) {
  const { kind, label, name } = cardText(draft);
  const { background, foreground, action } = walletCardDesign(kind);
  const photo = draft.type === "universal" ? draft.photo : undefined;
  return (
    <div className="wallet-pass-view" style={{ background, color: foreground }} role="img"
      aria-label={`Apple Wallet pass for ${name}, with a QR code. ${action}.`}>
      <div className="wpv-logo"><DestinationMark kind={kind} /> {kind === "universal" ? "Heya" : label}</div>
      <div className="wpv-primary">
        <div><span className="wpv-label">NAME</span><span className="wpv-name">{name}</span></div>
        {photo && <img src={photo} alt="" />}
      </div>
      <div className="wpv-barcode">
        <div className="wpv-qr"><QrGraphic code={code} label="" maxWidth={200} /></div>
        <span>{action}</span>
      </div>
    </div>
  );
}
