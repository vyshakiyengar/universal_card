"use client";

import { useEffect, useState } from "react";
import { BatteryFull, Signal, Wifi } from "lucide-react";
import { makeCardPayload } from "@/lib/cards";
import { buildCardQr } from "@/lib/qr";
import { AppleWalletMark } from "./apple-wallet-mark";
import { DestinationMark, destinations } from "./card-fields";
import { HeyaWordmark } from "./heya-wordmark";
import { QrGraphic } from "./qr-graphic";

const examples = {
  whatsapp: { action: "Scan to chat", qr: buildCardQr("https://wa.me/447700900123") },
  email: { action: "Scan to email", qr: buildCardQr("mailto:alex@example.com") },
  linkedin: { action: "Scan to open LinkedIn", qr: buildCardQr("https://www.linkedin.com/company/linkedin") },
  instagram: { action: "Scan to open Instagram", qr: buildCardQr("https://www.instagram.com/instagram/") },
  phone: { action: "Scan to call", qr: buildCardQr("tel:+447700900123") },
  website: { action: "Scan to visit", qr: buildCardQr("https://example.com") },
  url: { action: "Scan to open the link", qr: buildCardQr("https://example.com/hello") },
  universal: {
    action: "Scan to save contact",
    qr: buildCardQr(makeCardPayload({
      type: "universal", title: "Universal card", name: "Alex Morgan",
      emails: [{ label: "work", value: "alex@example.com" }],
      phones: [{ label: "mobile", value: "+447700900123" }],
    }).payload),
  },
  snapchat: { action: "Scan to open Snapchat", qr: buildCardQr("https://www.snapchat.com/") },
} as const;

const exampleKinds = ["whatsapp", "universal", "email", "linkedin", "instagram", "phone", "website", "url", "snapchat"] as const;
const rotationDelay = 2_000;

function exampleLabel(kind: (typeof exampleKinds)[number]) {
  return kind === "universal" ? "Universal card" : destinations[kind].label;
}

export function WalletExample() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const kind = exampleKinds[index];
  const active = examples[kind];
  const label = exampleLabel(kind);
  const rotationLabel = playing ? "Pause card examples" : "Play card examples";

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setIndex((index) => (index + 1) % exampleKinds.length);
    }, rotationDelay);
    return () => window.clearInterval(timer);
  }, [playing]);

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
            <div className="device-pass-brand"><DestinationMark kind={kind} /> {label}</div>
            <div className="device-pass-name"><span>Name</span><strong>Alex Morgan</strong></div>
            <div className="device-pass-qr">
              <QrGraphic code={active.qr} label={`Example ${label} QR`} maxWidth={91} />
              <small>{active.action}</small>
            </div>
            <HeyaWordmark compact />
          </div>
          <button className="device-platforms" type="button" title={rotationLabel} aria-label={rotationLabel}
            onClick={() => setPlaying((enabled) => !enabled)}>
            {exampleKinds.map((type) => (
              <span key={type} data-active={type === kind}><DestinationMark kind={type} /></span>
            ))}
          </button>
        </div>
      </div>
    </figure>
  );
}
