import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowDown, ArrowRight, QrCode, Scan, Send } from "lucide-react";
import { AppleWalletMark } from "@/components/apple-wallet-mark";
import { DestinationMark } from "@/components/card-fields";
import { HeyaWordmark } from "@/components/heya-wordmark";
import { LandingAnalytics } from "@/components/landing-analytics";
import { ProjectCredit } from "@/components/project-credit";
import { WalletExample } from "@/components/wallet-example";
import { getAccount, isAccountsConfigured } from "@/lib/server/supabase";
import "./landing.css";

export const dynamic = "force-dynamic";

const createLabel = "Create my Heya card";
const pageTitle = "Free Business Cards for Apple Wallet · Heya cards";
const introduction = "Let people scan to save your details or open a link with a single click.";

export const metadata: Metadata = {
  title: pageTitle,
  description: introduction,
  openGraph: { title: pageTitle, description: introduction },
  twitter: { title: pageTitle, description: introduction },
};

export default async function Home() {
  const configured = isAccountsConfigured();
  const account = configured ? await getAccount() : null;
  const cta = configured && !account ? "/auth/sign-in" : "/studio";

  return (
    <>
      <header className="topbar landing-header">
        <div className="header-inner">
          <Link href="/" className="brand" aria-label="Heya Cards"><HeyaWordmark /></Link>
          <Link className="create-card-link" href={cta}>{createLabel}</Link>
        </div>
      </header>
      <main className="landing">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-copy">
            <h1 id="landing-title">Create your free <span>contact cards</span> for <em>Apple Wallet</em></h1>
            <p className="landing-intro">{introduction}</p>
            <Link className="create-card-link landing-cta" href={cta}>{createLabel} <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
          <WalletExample />
        </section>

        <section className="scan-example" aria-labelledby="how-it-works">
          <a className="scan-example-jump" href="#how-it-works" aria-label="Go to the three steps">
            <ArrowDown size={16} strokeWidth={1.35} aria-hidden="true" />
          </a>
          <h2 id="how-it-works">3 simple steps</h2>
          <p className="scan-example-options">The example shows WhatsApp. The same steps work for any contact option.</p>
          <ol className="scan-example-flow" role="list">
            <li>
              <div className="scan-example-screen scan-example-editor">
                <div className="scan-editor-crop">
                  <Image
                    src="/images/whatsapp-card-editor.jpg"
                    alt="Heya Cards’ WhatsApp form with a sample number and the Generate your Apple Wallet card button"
                    width={744}
                    height={958}
                    unoptimized
                  />
                </div>
              </div>
              <h3>Create and add your Heya card in Apple Wallet. It’s free!</h3>
            </li>
            <li>
              <div className="scan-example-screen scan-example-camera" aria-hidden="true">
                <div className="scan-camera-display">
                  <span className="scan-camera-label">Camera</span>
                  <div className="scan-camera-card">
                    <span className="scan-camera-wallet"><AppleWalletMark /> Apple Wallet</span>
                    <span className="scan-camera-app"><DestinationMark kind="whatsapp" /> WhatsApp</span>
                    <span className="scan-camera-target">
                      <span className="scan-camera-code"><QrCode size={34} /></span>
                      <Scan className="scan-camera-corners" size={62} strokeWidth={1.25} />
                    </span>
                  </div>
                </div>
              </div>
              <h3>Someone scans the QR code on your Heya card in the Apple Wallet</h3>
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
              <h3>They open your chat or contact details</h3>
            </li>
          </ol>
        </section>

        <Link className="create-card-link mobile-create-action" href={cta}>
          {createLabel} <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </main>
      <ProjectCredit />
      {process.env.VERCEL_ENV === "production" && <LandingAnalytics />}
    </>
  );
}
