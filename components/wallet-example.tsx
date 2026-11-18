"use client";

import { useState } from "react";
import { ArrowUp, BatteryFull, Signal, Wifi } from "lucide-react";
import { buildCardQr } from "@/lib/qr";
import { AppleWalletMark } from "./apple-wallet-mark";
import { DestinationMark } from "./card-fields";
import { QrGraphic } from "./qr-graphic";

const examples = {
  whatsapp: { label: "WhatsApp", action: "Scan to chat", qr: buildCardQr("https://wa.me/447700900123") },
  email: { label: "Email", action: "Scan to email", qr: buildCardQr("mailto:alex@example.com") },
} as const;

export function WalletExample() {
  const [kind, setKind] = useState<keyof typeof examples>("whatsapp");
  const active = examples[kind];
  const other = kind === "whatsapp" ? "email" : "whatsapp";

  return (
    <figure className="landing-art" aria-label="Sample Apple Wallet passes">
      <div className="device">
        <div className="device-screen">
          <div className="device-status" aria-hidden="true">
            <span>9:41</span><span className="device-camera" />
            <span><Signal size={10} /><Wifi size={11} /><BatteryFull size={13} /></span>
          </div>
          <div className="device-wallet-label"><AppleWalletMark /> Apple Wallet</div>
          <div className={`device-pass device-pass-${kind}`} key={kind}>
            <div className="device-pass-brand"><DestinationMark kind={kind} /> {active.label}</div>
            <div className="device-pass-name"><span>Name</span><strong>Alex Morgan</strong></div>
            <div className="device-pass-qr">
              <QrGraphic code={active.qr} label={`Example ${active.label} QR`} maxWidth={91} />
              <small>{active.action}</small>
            </div>
          </div>
          <button className={`device-stack device-stack-${other}`} type="button" onClick={() => setKind(other)}
            aria-label={`Show ${examples[other].label} Wallet example`}>
            <DestinationMark kind={other} /><strong>{examples[other].label}</strong><ArrowUp size={15} />
          </button>
        </div>
      </div>
    </figure>
  );
}
