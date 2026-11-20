import { howItWorksClip } from "@/lib/site";

// The phone cut up to this width, the wide cut above it. Matches the landing and studio breakpoints.
export const clipPhoneQuery = "(max-width: 680px)";

// A short, muted, looping animation of a scan. The browser picks the cut by screen width; each cut's poster is a CSS
// background on the figure, so the right one shows before the video starts. Renders nothing until a clip is set.
export function HowItWorksClip({ className = "" }: { className?: string }) {
  if (!howItWorksClip) return null;
  return (
    <figure className={`how-clip ${className}`}>
      <video autoPlay muted loop playsInline preload="metadata"
        aria-label="Animation: a phone shows a Heya card in Apple Wallet and a second phone scans it, saving the contact. Then a WhatsApp card is scanned and the chat opens.">
        <source media={clipPhoneQuery} src={howItWorksClip.phone.src} type="video/mp4" />
        <source src={howItWorksClip.web.src} type="video/mp4" />
      </video>
    </figure>
  );
}

export const hasHowItWorksClip = howItWorksClip !== null;
