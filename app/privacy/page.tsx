import Link from "next/link";

export const metadata = { title: "Privacy | Heya Cards" };

export default function Privacy() {
  return (
    <main className="utility-page">
      <Link href="/">Heya Cards</Link>
      <h1>Privacy notice</h1>
      <p>Heya Cards is run by Vyshak K Iyengar in the United Kingdom, who is the controller of the personal data described here.</p>
      <section>
        <h2>What we collect</h2>
        <p>When you sign in with Google or Apple, we receive an account identifier and the profile details your provider shares, such as your name and email address. We store the contact details, links and optional card photo you choose to add to saved cards. A session cookie keeps you signed in.</p>
        <p>If you try the studio before signing in, the cards you make stay in your browser’s local storage, not on our servers. Two cookies note that you have started a trial and whether this visit is still open. When you sign in, cards in that browser are copied to your account.</p>
        <p>We record aggregate daily counts, such as sign-ins, cards created, Wallet downloads, shares and button clicks, to understand how the service is used. These counts contain no account identifiers or card contents.</p>
        <p>We use Vercel Web Analytics for visits to the public homepage. It provides aggregate traffic statistics without analytics cookies. We exclude private pages, card contents and URL parameters from this analytics collection.</p>
      </section>
      <section>
        <h2>Why we use it (lawful basis)</h2>
        <p><strong>To provide the service you ask for:</strong> we use your account details and saved cards to sign you in, store your cards and create your Wallet passes. This is necessary to perform our agreement with you (contract).</p>
        <p><strong>To run and protect the service:</strong> we use aggregate counts and operational logs to keep the service working, find faults and prevent abuse. This is in our legitimate interests, and the counts carry no information that identifies you.</p>
        <p><strong>Trial cookies and local storage</strong> are strictly necessary for the studio to work before you sign in.</p>
      </section>
      <section>
        <h2>Who processes it</h2>
        <p>We use these providers to run the service. Each processes data on our behalf, under its own data processing terms:</p>
        <ul>
          <li><strong>Supabase</strong>: sign-in and storage of your account and saved cards.</li>
          <li><strong>Vercel</strong>: hosting, server functions, logs and homepage analytics.</li>
          <li><strong>Google and Apple</strong>: their own sign-in flows, when you choose them.</li>
        </ul>
        <p><strong>International transfers:</strong> these providers may process data in the United States and other countries outside the UK. Where they do, the transfers rely on the safeguards in their terms, such as the UK International Data Transfer Addendum or the UK Extension to the EU–US Data Privacy Framework.</p>
        <p>Your saved cards are private in your account. Anyone with a copy or photo of a QR code can read and share the details it contains. Removing the card from Heya Cards cannot recall copies already shared.</p>
      </section>
      <section>
        <h2>How long we keep it</h2>
        <p>We keep your account and saved cards while your account is active. When you delete your account, your account and saved cards are deleted straight away. Hosting and authentication providers may keep limited security and operational logs for a short period under their own retention schedules. Aggregate counts contain no personal data and are kept to see how the service changes over time.</p>
        <p>Cards in your browser’s local storage stay until you sign in, delete them or clear your browser data. The trial cookies expire after one year and two hours.</p>
      </section>
      <section>
        <h2>Your rights</h2>
        <p>You can correct saved details in the studio. Your account page lets you download your data or permanently delete your account and saved cards. You also have the right to object to processing based on legitimate interests and to ask about any of the data above.</p>
        <Link href="/account">Manage your data</Link>
        <p>For privacy or data rights questions, contact the operator through Vyshak K Iyengar’s website. You can also complain to the Information Commissioner’s Office (ico.org.uk) or your local data protection authority.</p>
        <a href="https://vyshak.me">Contact Vyshak K Iyengar</a>
      </section>
      <p>Last updated 20 November 2026.</p>
    </main>
  );
}
