import Link from "next/link";
import { ArrowDown, ArrowRight, Contact, QrCode, Wallet } from "lucide-react";
import { AppleWalletMark } from "@/components/apple-wallet-mark";
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
          <Link href="/" className="brand"><span className="brand-mark"><Wallet size={19} /></span> Universal Card</Link>
          <a className="landing-nav" href="#how-it-works">How it works</a>
          <Link className="button secondary account" href={cta}>{account ? "Open studio" : configured ? "Sign in" : "Try the studio"}</Link>
        </div>
      </header>
      <main className="landing">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-copy">
            <div className="landing-wallet-label"><AppleWalletMark /> Apple Wallet</div>
            <h1 id="landing-title">Create a free<br />contact QR for<br /><em>Apple Wallet.</em></h1>
            <p>Add your contact details, create a QR code, and keep it in Apple Wallet for your next meeting.</p>
            <div className="landing-actions">
              <Link className="button primary" href={cta}>Create my free card <ArrowRight size={19} /></Link>
              <a href="#how-it-works">How it works <ArrowDown size={16} /></a>
            </div>
          </div>
          <WalletExample />
        </section>

        <section className="how-section" id="how-it-works" aria-labelledby="how-title">
          <h2 id="how-title">Three steps to share.</h2>
          <ol className="how-list">
            <li><span className="how-icon"><Contact size={24} /></span><h3>Add your contact details</h3><p>Enter one detail, such as WhatsApp or email, or put several on a Universal card.</p></li>
            <li><span className="how-icon"><QrCode size={24} /></span><h3>Create your QR code</h3><p>Generate your Apple Wallet card with your name and a scannable QR.</p></li>
            <li><span className="how-icon"><AppleWalletMark /></span><h3>Add it to Apple Wallet</h3><p>Once Wallet downloads are enabled, add the card on your iPhone and pull it up at your next meeting.</p></li>
          </ol>
          <Link className="button primary landing-bottom" href={cta}>Create my free card <ArrowRight size={19} /></Link>
        </section>
      </main>
    </>
  );
}
