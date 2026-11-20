import { walletSurfaceStyle } from "@/lib/wallet-card-design";
import { LandingFaq } from "@/components/faq";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowDown, ArrowRight, LockKeyhole, QrCode, Scan, Send, Smartphone, Tag } from "lucide-react";
import { AppleWalletMark } from "@/components/apple-wallet-mark";
import { DestinationMark } from "@/components/card-fields";
import { HeyaWordmark } from "@/components/heya-wordmark";
import { HowItWorksClip, hasHowItWorksClip } from "@/components/how-it-works-clip";
import { LandingAnalytics } from "@/components/landing-analytics";
import { TrackedLink } from "@/components/tracked-link";
import { ProjectCredit } from "@/components/project-credit";
import { WalletExample } from "@/components/wallet-example";
import "./landing.css";

const createLabel = "Create my Heya card";
const pageTitle = "Free Business Cards for Apple Wallet · Heya Cards";
const introduction = "Let people scan to save your details or open a link with a single click.";

export const metadata: Metadata = {
  title: pageTitle,
  description: introduction,
  alternates: { canonical: "/" },
  openGraph: { title: pageTitle, description: introduction, url: "/", siteName: "Heya Cards", type: "website" },
  twitter: { card: "summary_large_image", title: pageTitle, description: introduction },
};

// Static: the studio decides whether a visitor can try it or must sign in.
const cta = "/studio";

export default function Home() {
  return (
    <>
      <header className="topbar landing-header">
        <div className="header-inner">
          <Link href="/" className="brand" aria-label="Heya Cards"><HeyaWordmark /></Link>
          <TrackedLink className="create-card-link" href={cta} event="cta_click" kind="landing_header">{createLabel}</TrackedLink>
        </div>
      </header>
      <main className="landing">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-copy">
            <h1 id="landing-title">Create your free <span>contact cards</span> for <em>Apple Wallet</em></h1>
            <p className="landing-intro">{introduction}</p>
            <TrackedLink className="create-card-link landing-cta" href={cta} event="cta_click" kind="landing_hero">{createLabel} <ArrowRight size={15} aria-hidden="true" /></TrackedLink>
          </div>
          <WalletExample />
        </section>

        <ul className="why-band" aria-label="Why Heya">
          <li><LockKeyhole size={19} strokeWidth={1.7} aria-hidden="true" /> Your details live in the QR, not on our servers</li>
          <li><Smartphone size={19} strokeWidth={1.7} aria-hidden="true" /> They don’t need an app</li>
          <li><Tag size={19} strokeWidth={1.7} aria-hidden="true" /> Free</li>
        </ul>

        {hasHowItWorksClip ? (
          <section className="how-it-works" aria-labelledby="how-it-works">
            <HowItWorksClip className="landing-clip" />
            <div>
              <h2 id="how-it-works">How it works</h2>
              <ol className="how-steps">
                <li><strong>Make your card and add it to Apple Wallet.</strong><span>Free. Takes about a minute.</span></li>
                <li><strong>They point their camera at your card.</strong><span>No app needed on their side.</span></li>
                <li><strong>Your contact saves, or your chat opens.</strong><span>Shown with WhatsApp. It works the same for LinkedIn, email, phone and more.</span></li>
              </ol>
            </div>
          </section>
        ) : (
        <section className="scan-example" aria-labelledby="how-it-works">
          <a className="scan-example-jump" href="#how-it-works" aria-label="Go to the three steps">
            <ArrowDown size={16} strokeWidth={1.35} aria-hidden="true" />
          </a>
          <h2 id="how-it-works">How it works</h2>
          <p className="scan-example-options">Shown with WhatsApp. It works the same for LinkedIn, email, phone and more.</p>
          <ol className="scan-example-flow" role="list">
            <li>
              <div className="scan-example-screen scan-example-editor">
                <div className="scan-editor-crop">
                  <Image
                    src="/images/whatsapp-card-editor.jpg"
                    alt="Heya Cards’ WhatsApp form with a sample number for Alan Turing"
                    width={744}
                    height={532}
                    unoptimized
                  />
                </div>
              </div>
              <h3>Make your card and add it to Apple Wallet.</h3>
            </li>
            <li>
              <div className="scan-example-screen scan-example-camera" aria-hidden="true">
                <div className="scan-camera-display">
                  <span className="scan-camera-label">Camera</span>
                  <div className="scan-camera-card" style={walletSurfaceStyle("whatsapp")}>
                    <span className="scan-camera-wallet"><AppleWalletMark /> Apple Wallet</span>
                    <span className="scan-camera-app"><DestinationMark kind="whatsapp" /> WhatsApp</span>
                    <span className="scan-camera-target">
                      <span className="scan-camera-code"><QrCode size={34} /></span>
                      <Scan className="scan-camera-corners" size={62} strokeWidth={1.25} />
                    </span>
                  </div>
                </div>
              </div>
              <h3>They point their camera at your card.</h3>
            </li>
            <li>
              <div className="scan-example-screen scan-example-chat" aria-hidden="true">
                <div className="scan-chat-display">
                  <div className="scan-chat-header">
                    <DestinationMark kind="whatsapp" />
                    <span><strong>Alan Turing</strong><small>WhatsApp chat</small></span>
                  </div>
                  <div className="scan-chat-compose"><span>Message</span><Send size={14} /></div>
                </div>
              </div>
              <h3>Your contact saves, or your chat opens.</h3>
            </li>
          </ol>
        </section>
        )}

        <LandingFaq />

        <TrackedLink className="create-card-link mobile-create-action" href={cta} event="cta_click" kind="landing_footer">
          {createLabel} <ArrowRight size={15} aria-hidden="true" />
        </TrackedLink>
      </main>
      <ProjectCredit />
      {process.env.VERCEL_ENV === "production" && <LandingAnalytics />}
    </>
  );
}
