import Link from "next/link";
import { CardQuestions, GettingStartedQuestions, ManageQuestions, WalletQuestions } from "@/components/faq";
import { HeyaWordmark } from "@/components/heya-wordmark";
import { ProjectCredit } from "@/components/project-credit";

export const metadata = {
  title: "Frequently asked questions · Heya Cards",
  description: "How to create a free Heya contact card, share it in person, and see what opens when someone scans.",
};

export default function FaqPage() {
  return <>
    <header className="topbar"><div className="header-inner">
      <Link href="/" className="brand" aria-label="Heya Cards"><HeyaWordmark /></Link>
    </div></header>
    <main className="faq-page">
      <h1>Frequently asked questions</h1>
      <section><h2>Getting started</h2><GettingStartedQuestions /></section>
      <section><h2>Choosing your card</h2><CardQuestions /></section>
      <section><h2>Apple Wallet and sharing</h2><WalletQuestions /></section>
      <section><h2>Managing your details</h2><ManageQuestions /></section>
    </main>
    <ProjectCredit />
  </>;
}
