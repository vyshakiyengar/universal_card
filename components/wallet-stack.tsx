import { AppleWalletMark } from "./apple-wallet-mark";
import { DestinationMark } from "./card-fields";

export function WalletStack() {
  return (
    <figure className="wallet-stack" role="img" aria-label="Apple Wallet illustration with HSBC, Citi, American Express, WhatsApp and LinkedIn cards">
      <div className="stack-window" aria-hidden="true">
        <div className="stack-wallet-label"><AppleWalletMark /> Apple Wallet</div>
        <div className="stack-passes">
          <div className="stack-pass stack-hsbc">
            <svg viewBox="0 0 36 18" width="26" height="13" aria-hidden="true">
              <path fill="#e21932" d="M9 0h18l9 9-9 9H9L0 9z" />
              <path fill="#fff" d="M9 0l9 9-9 9zm18 0v18l-9-9z" />
            </svg>
            <span>HSBC</span>
          </div>
          <div className="stack-pass stack-citi"><span className="stack-citi-word">citi</span></div>
          <div className="stack-pass stack-amex"><span>American Express</span></div>
          <div className="stack-pass stack-whatsapp"><DestinationMark kind="whatsapp" /> <span>WhatsApp</span></div>
          <div className="stack-pass stack-linkedin"><DestinationMark kind="linkedin" /> <span>LinkedIn</span></div>
        </div>
      </div>
    </figure>
  );
}
