import Image from "next/image";
import Link from "next/link";
import { ArrowRight, QrCode, Scan, Send } from "lucide-react";
import { DestinationMark } from "@/components/card-fields";
import { ConnectionMark } from "@/components/connection-mark";
import { ProjectCredit } from "@/components/project-credit";
import { WalletExample } from "@/components/wallet-example";
import { getAccount, isAccountsConfigured } from "@/lib/server/supabase";
import "./landing.css";

export const dynamic = "force-dynamic";

const createLabel = "Create My Card";

export default async function Home() {
  const configured = isAccountsConfigured();
  const account = configured ? await getAccount() : null;
  const cta = configured && !account ? "/auth/sign-in" : "/studio";

  return (
    <>
      <header className="topbar landing-header">
        <div className="header-inner">
          <Link href="/" className="brand"><ConnectionMark /> Universal Card</Link>
          <Link className="create-card-link" href={cta}>{createLabel}</Link>
        </div>
      </header>
      <main className="landing">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-copy">
            <h1 id="landing-title">Create your free contact QR cards on <em>Apple Wallet</em></h1>
            <Link className="create-card-link landing-cta" href={cta}>{createLabel} <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
          <WalletExample />
        </section>

        <p className="hero-description">Keep your contact QR in Apple Wallet, ready to share at your next meeting or networking event.</p>

        <section className="how-section" aria-label="How it works">
          <ol className="how-list">
            <li><span aria-hidden="true">1</span><h2>Add your contact details</h2></li>
            <li><span aria-hidden="true">2</span><h2>Create your QR code</h2></li>
            <li><span aria-hidden="true">3</span><h2>Add it to Apple Wallet</h2></li>
          </ol>
        </section>

        <section className="scan-example" aria-labelledby="whatsapp-example">
          <h2 id="whatsapp-example">From Wallet card to WhatsApp chat</h2>
          <ol className="scan-example-flow" role="list">
            <li>
              <div className="scan-example-screen scan-example-editor">
                <div className="scan-editor-crop">
                  <Image
                    src="/images/whatsapp-card-editor.jpg"
                    alt="Universal Card’s WhatsApp form with a sample number and the Generate your Apple Wallet card button"
                    width={744}
                    height={958}
                    unoptimized
                  />
                </div>
              </div>
              <h3>Create a WhatsApp Wallet card</h3>
              <p>Enter your WhatsApp number to generate your card and QR code.</p>
            </li>
            <li>
              <div className="scan-example-screen scan-example-camera" aria-hidden="true">
                <div className="scan-camera-display">
                  <span className="scan-camera-label">Camera</span>
                  <div className="scan-camera-card">
                    <DestinationMark kind="whatsapp" />
                    <span className="scan-camera-code"><QrCode size={39} /></span>
                  </div>
                  <Scan className="scan-camera-corners" size={99} strokeWidth={1.25} />
                </div>
              </div>
              <h3>Someone scans your QR</h3>
              <p>Show the card in Apple Wallet. They scan the QR with their phone camera.</p>
            </li>
            <li>
              <div className="scan-example-screen scan-example-chat" aria-hidden="true">
                <div className="scan-chat-display">
                  <div className="scan-chat-header">
                    <DestinationMark kind="whatsapp" />
                    <span><strong>Alex Morgan</strong><small>WhatsApp chat</small></span>
                  </div>
                  <div className="scan-chat-compose"><span>Message</span><Send size={14} /></div>
                </div>
              </div>
              <h3>Your WhatsApp chat opens</h3>
              <p>They can message you using the number on your card.</p>
            </li>
          </ol>
        </section>

        <Link className="create-card-link mobile-create-action" href={cta}>
          {createLabel} <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </main>
      <ProjectCredit />
    </>
  );
}
