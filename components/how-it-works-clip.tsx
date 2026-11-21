import { howItWorksClip } from "@/lib/site";
import { HowItWorksPlayer } from "./how-it-works-player";

// The phone cut up to this width, the wide cut above it. Matches the landing and studio breakpoints.
export const clipPhoneQuery = "(max-width: 680px)";

const clipLabel = "Animation: a phone shows a Heya card in Apple Wallet and a second phone scans it, saving the contact. Then a WhatsApp card is scanned and the chat opens.";

// A short, muted animation of a scan. The browser picks the cut by screen width; each cut's poster is a CSS
// background on the figure, so the right one shows before the video starts. Renders nothing until a clip is set.
// With `playButton` it waits for a tap (used further down the landing page); otherwise it autoplays on a loop.
export function HowItWorksClip({ className = "", playButton = false }: { className?: string; playButton?: boolean }) {
  if (!howItWorksClip) return null;
  return (
    <figure className={`how-clip ${className}`}>
      {playButton ? (
        <HowItWorksPlayer phone={howItWorksClip.phone} web={howItWorksClip.web} query={clipPhoneQuery} label={clipLabel} />
      ) : (
        <video autoPlay muted loop playsInline preload="metadata" aria-label={clipLabel}>
          <source media={clipPhoneQuery} src={howItWorksClip.phone.src} type="video/mp4" />
          <source src={howItWorksClip.web.src} type="video/mp4" />
        </video>
      )}
    </figure>
  );
}

export const hasHowItWorksClip = howItWorksClip !== null;
