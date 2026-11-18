import Link from "next/link";
import { ArrowRight, QrCode, ScanLine } from "lucide-react";
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
          <h2 id="whatsapp-example">WhatsApp example</h2>
          <ol className="scan-example-flow" role="list">
            <li>
              <span className="scan-example-art" aria-hidden="true"><QrCode size={24} /></span>
              <span>Create a WhatsApp QR</span>
              <ArrowRight className="scan-example-arrow" size={14} aria-hidden="true" />
            </li>
            <li>
              <span className="scan-example-art" aria-hidden="true"><ScanLine size={25} /></span>
              <span>Someone scans it</span>
              <ArrowRight className="scan-example-arrow" size={14} aria-hidden="true" />
            </li>
            <li>
              <span className="scan-example-art scan-example-chat" aria-hidden="true"><DestinationMark kind="whatsapp" /></span>
              <span>Your chat opens in WhatsApp</span>
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
