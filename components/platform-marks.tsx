import { DestinationMark, destinations } from "./card-fields";

export const platformKinds = ["whatsapp", "universal", "email", "linkedin", "instagram", "phone", "website", "url", "snapchat"] as const;
export type PlatformKind = (typeof platformKinds)[number];

export function platformLabel(kind: PlatformKind) {
  return kind === "universal" ? "Universal card" : destinations[kind].label;
}

const listLabel = `Cards for ${platformKinds.map(platformLabel).join(", ")}`;

// A quiet row of every card type: small, grey marks, the active one a shade darker.
export function PlatformMarks({ active, className = "" }: { active?: PlatformKind; className?: string }) {
  return (
    <span className={`platform-marks ${className}`} role="img" aria-label={listLabel}>
      {platformKinds.map((kind) => (
        <span key={kind} data-active={kind === active || undefined}><DestinationMark kind={kind} /></span>
      ))}
    </span>
  );
}
