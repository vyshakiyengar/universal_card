import { buildCardQr } from "@/lib/qr";
import { AppleWalletMark } from "./apple-wallet-mark";
import { DestinationMark } from "./card-fields";
import { QrGraphic } from "./qr-graphic";

const exampleQr = buildCardQr("https://wa.me/447700900123");

export function WalletStack() {
  return (
    <figure
      className="wallet-stack"
      role="img"
      aria-label="Apple Wallet illustration with a partly open WhatsApp card in front of Universal, LinkedIn, Citi and HSBC cards"
    >
      <div className="stack-window" aria-hidden="true">
        <div className="stack-screen">
          <div className="stack-status"><span>9:41</span><span className="stack-camera" /><span className="stack-battery" /></div>
          <div className="stack-wallet-label"><AppleWalletMark /> Apple Wallet</div>
          <div className="stack-passes">
            <div className="stack-pass stack-hsbc">
              <div className="stack-pass-label">
                <svg viewBox="0 0 36 18">
                  <path fill="#e21932" d="M9 0h18l9 9-9 9H9L0 9z" />
                  <path fill="#fff" d="M9 0l9 9-9 9zm18 0v18l-9-9z" />
                </svg>
                HSBC
              </div>
            </div>
            <div className="stack-pass stack-citi"><div className="stack-pass-label"><span className="stack-citi-word">citi</span></div></div>
            <div className="stack-pass stack-linkedin"><div className="stack-pass-label"><DestinationMark kind="linkedin" /> LinkedIn</div></div>
            <div className="stack-pass stack-universal"><div className="stack-pass-label"><DestinationMark kind="universal" /> Universal card</div></div>
            <div className="stack-pass stack-whatsapp">
              <div className="stack-pass-label"><DestinationMark kind="whatsapp" /> WhatsApp</div>
              <div className="stack-details">
                <strong>Alan Turing</strong>
                <div className="stack-qr"><QrGraphic code={exampleQr} label="Sample WhatsApp QR" maxWidth={90} /></div>
              </div>
            </div>
          </div>
          <div className="stack-home" />
        </div>
      </div>
    </figure>
  );
}
