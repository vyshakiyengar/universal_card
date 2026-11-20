import { howItWorksClip } from "@/lib/site";

// A short, muted, looping recording of a real scan. Renders nothing until a clip is set.
export function HowItWorksClip({ className = "" }: { className?: string }) {
  if (!howItWorksClip) return null;
  return (
    <figure className={`how-clip ${className}`}>
      <video src={howItWorksClip.src} poster={howItWorksClip.poster} autoPlay muted loop playsInline preload="metadata"
        aria-label="An iPhone shows a Heya card in Apple Wallet. A second phone scans it and saves the contact." />
    </figure>
  );
}

export const hasHowItWorksClip = howItWorksClip !== null;
