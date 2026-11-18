import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
            <h1 id="landing-title">Create a free contact QR for <em>Apple Wallet.</em></h1>
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
        <Link className="create-card-link mobile-create-action" href={cta}>
          {createLabel} <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </main>
      <ProjectCredit />
    </>
  );
}
