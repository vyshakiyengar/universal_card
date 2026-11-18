import Link from "next/link";
import { ArrowDown, ArrowRight, Check, Contact, Wallet } from "lucide-react";
import { DestinationMark } from "@/components/card-fields";
import { QrGraphic } from "@/components/qr-graphic";
import { buildCardQr } from "@/lib/qr";
import { getAccount, isAccountsConfigured } from "@/lib/server/supabase";
import "./landing.css";

export const dynamic = "force-dynamic";

const examples = [
  { kind: "whatsapp", name: "WhatsApp", code: buildCardQr("https://wa.me/447700900123") },
  { kind: "email", name: "Email", code: buildCardQr("mailto:alex@example.com") },
] as const;

export default async function Home() {
  const configured = isAccountsConfigured();
  const account = configured ? await getAccount() : null;
  const cta = configured && !account ? "/auth/sign-in" : "/studio";

  return (
    <>
      <header className="topbar landing-header">
        <div className="header-inner">
          <Link href="/" className="brand"><span className="brand-mark"><Wallet size={19} /></span> Universal Card</Link>
          <a className="landing-nav" href="#how-it-works">How it works</a>
          <Link className="button secondary account" href={cta}>{account ? "Open studio" : configured ? "Sign in" : "Try the studio"}</Link>
        </div>
      </header>
      <main className="landing">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-copy">
            <h1 id="landing-title">Your contacts.<br /><em>In your Wallet.</em></h1>
            <p>Turn your WhatsApp, email, or contact details into an Apple Wallet card. When you meet someone, open Wallet and let them scan.</p>
            <div className="landing-actions">
              <Link className="button primary" href={cta}>Create my card <ArrowRight size={19} /></Link>
              <a href="#how-it-works">How it works <ArrowDown size={16} /></a>
            </div>
          </div>
          <figure className="landing-art">
            <div className="landing-orbits" aria-hidden="true" />
            <div className="device">
              <div className="device-camera" aria-hidden="true" />
              <div className="device-screen">
                <div className="device-title"><Wallet size={18} /> Wallet</div>
                {examples.map(({ kind, name, code }) => (
                  <div className={`device-pass device-pass-${kind}`} key={kind}>
                    <div>
                      <span><DestinationMark kind={kind} /> {name}</span>
                      <strong>Alex Morgan</strong>
                      <small>{kind === "whatsapp" ? "Scan to chat" : "Scan to email"}</small>
                    </div>
                    <QrGraphic code={code} label={`Example ${name} QR`} maxWidth={78} />
                  </div>
                ))}
              </div>
            </div>
            <figcaption>Example Wallet cards</figcaption>
          </figure>
        </section>

        <section className="how-section" id="how-it-works" aria-labelledby="how-title">
          <h2 id="how-title">From hello to connected.</h2>
          <ol className="how-list">
            <li><span className="how-icon"><Wallet size={24} /></span><h3>Choose a card</h3><p>Pick an individual card for one link or a Universal card for several contact details.</p></li>
            <li><span className="how-icon"><Contact size={24} /></span><h3>Save your details</h3><p>Enter what you want to share. Saving creates the scannable QR for that card.</p></li>
            <li><span className="how-icon"><Check size={24} /></span><h3>Add it to Wallet</h3><p>Once Wallet downloads are enabled, open the saved card on your iPhone and tap Add to Apple Wallet.</p></li>
          </ol>
          <Link className="button primary landing-bottom" href={cta}>Create my card <ArrowRight size={19} /></Link>
        </section>
      </main>
    </>
  );
}
