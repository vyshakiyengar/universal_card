import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ConnectionMark } from "@/components/connection-mark";
import { ProjectCredit } from "@/components/project-credit";
import { WalletExample } from "@/components/wallet-example";
import { getAccount, isAccountsConfigured } from "@/lib/server/supabase";
import "./landing.css";

export const dynamic = "force-dynamic";

export default async function Home() {
  const configured = isAccountsConfigured();
  const account = configured ? await getAccount() : null;
  const cta = configured && !account ? "/auth/sign-in" : "/studio";

  return (
    <>
      <header className="topbar landing-header">
        <div className="header-inner">
          <Link href="/" className="brand"><ConnectionMark /> Universal Card</Link>
          <Link className="create-card-link" href={cta}>Create My Card</Link>
        </div>
      </header>
      <main className="landing">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-copy">
            <h1 id="landing-title">Create a free contact QR for <em>Apple Wallet.</em></h1>
            <Link className="create-card-link landing-cta" href={cta}>Create a free card <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
          <WalletExample />
        </section>

        <section className="how-section" aria-label="How it works">
          <ol className="how-list">
            <li><span aria-hidden="true">1</span><h2>Add your contact details</h2></li>
            <li><span aria-hidden="true">2</span><h2>Create your QR code</h2></li>
            <li><span aria-hidden="true">3</span><h2>Add it to Apple Wallet</h2></li>
          </ol>
        </section>
      </main>
      <ProjectCredit />
      <Link className="create-card-link mobile-create-action" href={cta}>
        Create a free card <ArrowRight size={15} aria-hidden="true" />
      </Link>
    </>
  );
}
