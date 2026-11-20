import Link from "next/link";

export const metadata = { title: "Privacy | Heya Cards" };

export default function Privacy() {
  return (
    <main className="utility-page">
      <Link href="/">Heya Cards</Link>
      <h1>Privacy notice</h1>
      <section>
        <h2>What we collect</h2>
        <p>When you sign in with Google or Apple, we receive an account identifier and the profile details your provider shares, such as your name and email address. We store the contact details, links and optional card photo you choose to add to saved cards. A session cookie keeps you signed in.</p>
        <p>We record aggregate counts of sign-ins, card creation and Wallet downloads to understand how the service is used. These counts contain no account identifiers or card contents.</p>
        <p>We use Vercel Web Analytics for visits to the public homepage. It provides aggregate traffic statistics without analytics cookies. We exclude private pages, card contents and URL parameters from this analytics collection.</p>
      </section>
      <section>
        <h2>How we use your information</h2>
        <p>We use account and card data to provide the service you request. We use aggregate activity and operational logs to maintain and protect the service. Supabase provides authentication and storage. Vercel hosts the site. Google and Apple handle their respective sign-in flows.</p>
        <p>Your saved cards are private in your account. Anyone with a copy or photo of a QR code can read and share the details it contains. Removing the card from Heya Cards cannot recall copies already shared.</p>
      </section>
      <section>
        <h2>Access, export and deletion</h2>
        <p>We keep your account and saved cards while your account is active. You can correct saved details in the studio. Your account page lets you download your data or permanently delete your account and saved cards. Hosting and authentication providers may keep limited security and operational logs under their own retention schedules.</p>
        <Link href="/account">Manage your data</Link>
        <p>For privacy or data rights questions, contact the operator through Vyshak K Iyengar’s website. You can also contact your local data protection authority.</p>
        <a href="https://vyshak.me">Contact Vyshak K Iyengar</a>
      </section>
    </main>
  );
}
