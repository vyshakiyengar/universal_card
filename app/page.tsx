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
            <p className="landing-intro">Share your contact details with a quick scan at your next meeting or networking event.</p>
            <Link className="create-card-link landing-cta" href={cta}>{createLabel} <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
          <WalletExample />
        </section>

        <section className="scan-example" aria-labelledby="whatsapp-example">
          <h2 id="whatsapp-example">WhatsApp example</h2>
          <p className="scan-example-options">Use the same steps for LinkedIn, Instagram, email, phone or a web link. Choose a Universal card to share several contact details in one QR.</p>
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
              <h3>Create a WhatsApp card</h3>
              <p>Enter your number to make a Wallet card with your QR.</p>
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
              <h3>Show your QR</h3>
              <p>Open the card in Apple Wallet so someone can scan it.</p>
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
              <p>They can message you right away.</p>
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
