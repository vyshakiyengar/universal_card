import Link from "next/link";
import type { ReactNode } from "react";

function Question({ title, children }: { title: string; children: ReactNode }) {
  return <details className="faq-question"><summary>{title}</summary><div>{children}</div></details>;
}

export function GettingStartedQuestions() {
  return <>
    <Question title="What is Heya?"><p>Heya is a free web app for making contact cards for Apple Wallet. Keep your card handy for meetings. Once it’s in Wallet, open it on your iPhone and show the QR code. One scan lets them save your details or go straight to the place you choose, like a WhatsApp chat.</p></Question>
    <Question title="Is Heya free?"><p>Yes, completely. Creating cards, saving them, sharing the images and scanning them are all free. The person scanning doesn’t need a Heya account.</p></Question>
    <Question title="How do I create a Heya card?"><p>Open the studio and choose a Universal or Individual card. Enter the details you want to share, then tap <strong>Create my card</strong>. Your card is saved in <strong>Your cards</strong>, ready to show or download. Tap <strong>Add to Apple Wallet</strong> and confirm on your iPhone. Your first card needs no account, and you can add it to Apple Wallet straight away. To make more cards or come back to the studio later, you’ll sign in, and your first card comes with you.</p></Question>
    <Question title="How does someone scan my card?"><p>Open your card so the QR code is visible. Ask the other person to open their phone’s camera, point it at the whole square and tap the prompt that appears. A Universal card offers a contact to save. An Individual card opens the app, link or contact action you chose.</p></Question>
  </>;
}

export function LandingFaq() {
  return <section className="landing-faq" aria-labelledby="faq-heading">
    <h2 id="faq-heading">Frequently asked questions</h2>
    <GettingStartedQuestions />
    <Link className="faq-more" href="/faq">Read the full FAQ <span aria-hidden="true">→</span></Link>
  </section>;
}

export function CardQuestions() {
  return <>
    <Question title="Should I make a Universal or an Individual card?"><p>Choose Universal when you want someone to leave with your contact details. For example, put your work email, mobile number and LinkedIn profile on one card for a conference. Choose Individual when you want one specific action, like opening a WhatsApp chat. You can keep both and show whichever suits the moment.</p></Question>
    <Question title="What does someone get from a Universal card?"><p>Its QR code contains a vCard, a contact record that compatible phones can save to Contacts. The person reviews it and chooses whether to save it. It includes the details you selected, such as your name, job title, company, labeled emails, phone numbers and links.</p><p>An optional portrait appears on the card image. It stays outside the QR so the code remains easier to scan. You can also download the vCard file from the saved card.</p></Question>
    <Question title="What opens when someone scans an Individual card?">
      <dl className="faq-destinations">
        <dt>WhatsApp</dt><dd>A chat with your number, if it’s registered on WhatsApp. The other person chooses what to send.</dd>
        <dt>LinkedIn</dt><dd>The LinkedIn profile, company page or school page you linked.</dd>
        <dt>Instagram</dt><dd>Your Instagram profile.</dd>
        <dt>Snapchat</dt><dd>Your Snapchat profile, where they can choose to add you.</dd>
        <dt>Email</dt><dd>A new email with your address already in the To field.</dd>
        <dt>Phone</dt><dd>The dialer with your number filled in. They tap to call.</dd>
        <dt>Website</dt><dd>Your personal or company website. A domain like example.com works on its own.</dd>
        <dt>Custom link</dt><dd>The exact web address you entered, such as a portfolio, booking page or event invitation.</dd>
      </dl><p>Their phone and installed apps determine whether a social link opens in the app or browser.</p>
    </Question>
    <Question title="Can I reuse details from another card?"><p>Yes. Your new Universal card starts with available details from saved Individual cards. If you already put LinkedIn on a Universal card, the Individual LinkedIn editor can prefill that link too. Review the fields and remove anything you’d prefer to keep private before generating the card.</p></Question>
  </>;
}

export function WalletQuestions() {
  return <>
    <Question title="How do I add my Heya card to Apple Wallet?"><p>Open the saved card on your iPhone. When <strong>Add to Apple Wallet</strong> is available, tap it and confirm with <strong>Add</strong> in Apple’s preview. Your card will then be in the Wallet app.</p><p>If Heya says Apple Wallet is coming soon, you can already show the QR from Your cards or download the card image to keep on your phone.</p></Question>
    <Question title="How do I bring up my card quickly at a meeting?"><p>Once you’ve added the pass, open Wallet and tap your Heya card. On an iPhone with Face ID and the Wallet shortcut enabled, double-click the side button and select the card. If your payment card appears first, tap the stack to see your other passes. Show the QR to the other person’s camera.</p><p><a href="https://support.apple.com/en-us/111112">Apple’s guide to opening Wallet passes</a></p></Question>
    <Question title="Can I send my card to someone who isn’t with me?"><p>Yes. Open it in Your cards and choose <strong>Share image</strong> to send the full image using your phone’s share menu. <strong>Download image</strong> saves a PNG with the QR code. For a Universal card, you can send the contact file (.vcf) instead so someone on the same phone can open it directly.</p></Question>
    <Question title="What if their camera doesn’t recognize the QR?"><p>Show the full code, including its white border, turn up your screen brightness and ask them to move their phone back a little. If their camera reads links but doesn’t offer to save a contact, send the Universal card’s contact file (.vcf). For a crowded QR, try sharing fewer fields or using a shorter link.</p></Question>
  </>;
}

export function ManageQuestions() {
  return <>
    <Question title="Who can see the details on my card?"><p>Your saved cards are private to your Heya account. The QR itself contains the details or destination you chose. Anyone who can scan or photograph it can read and share that information. Choose the fields you’re comfortable giving to everyone who sees that card.</p><p><Link href="/privacy">Read the privacy notice</Link></p></Question>
    <Question title="Can I edit or delete a card after sharing it?"><p>Yes. In Your cards, choose the edit or delete control beside the card. After editing, add it to Apple Wallet again to update it, and share the updated image. An image you sent earlier still contains the old QR, and a contact someone already saved stays on their phone.</p></Question>
  </>;
}
