import { AppleWalletMark } from "./apple-wallet-mark";
import { DestinationMark } from "./card-fields";

export function WalletStack() {
  return (
    <figure className="wallet-stack" role="img" aria-label="Apple Wallet illustration with HSBC, Citi, American Express, WhatsApp and LinkedIn cards">
      <div className="stack-window" aria-hidden="true">
        <div className="stack-wallet-label"><AppleWalletMark /> Apple Wallet</div>
        <div className="stack-passes">
          <div className="stack-pass stack-hsbc">
            <svg viewBox="0 0 36 20" width="26" height="15" aria-hidden="true">
              <path fill="#fff" d="M8 0h20l8 10-8 10H8L0 10z" />
              <path fill="#e21932" d="m8 0 10 10L8 20 0 10zm20 0 8 10-8 10-10-10zM8 0h20L18 10zm0 20 10-10 10 10z" />
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
