import type { Metadata } from "next";
import Link from "next/link";
import { HeyaWordmark } from "@/components/heya-wordmark";
import { ProjectCredit } from "@/components/project-credit";

export const metadata: Metadata = { title: "Page not found | Heya Cards", robots: { index: false, follow: false } };

export default function NotFound() {
  return (
    <>
      <header className="topbar"><div className="header-inner">
        <Link href="/" className="brand" aria-label="Heya Cards"><HeyaWordmark /></Link>
      </div></header>
      <main className="not-found">
        <p className="not-found-code">404</p>
        <h1>This page doesn’t exist</h1>
        <p>The link may be mistyped, or the page has moved.</p>
        <Link className="button primary" href="/">Go to heya.cards</Link>
      </main>
      <ProjectCredit />
    </>
  );
}
