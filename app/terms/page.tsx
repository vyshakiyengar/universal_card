import Link from "next/link";

export const metadata = { title: "Terms | Heya Cards" };

export default function Terms() {
  return (
    <main className="utility-page">
      <Link href="/">Heya Cards</Link>
      <h1>Terms of use</h1>
      <section>
        <h2>Using Heya Cards</h2>
        <p>Heya Cards helps you create QR cards for contact details and web destinations. You retain ownership of the details you enter and allow the service to store and encode them so it can make and save your cards.</p>
        <p>Only add information you have permission to share. Do not use the service to impersonate people, distribute harmful content or collect someone else’s information without permission.</p>
      </section>
      <section>
        <h2>Sharing and compatibility</h2>
        <p>Choose what to share before displaying a QR code. Scan behavior depends on the recipient’s device, and Apple Wallet availability depends on pass signing and device compatibility.</p>
      </section>
      <section>
        <h2>Your account</h2>
        <p>You can delete your cards and close your account at any time. You can download a copy of your account and cards before closing it. These terms preserve your applicable statutory rights.</p>
        <Link href="/privacy">Privacy notice</Link>
      </section>
    </main>
  );
}
