import type { CSSProperties } from "react";
import type { DestinationKind } from "./cards";

type CardKind = DestinationKind | "universal";

const designs = {
  universal: { background: "rgb(26, 40, 60)", light: "#415c78", action: "Scan to save contact" },
  linkedin: { background: "rgb(10, 102, 194)", light: "#09569e", action: "Scan to open LinkedIn" },
  whatsapp: { background: "rgb(37, 211, 102)", light: "#70e8a0", action: "Scan to chat" },
  email: { background: "rgb(19, 88, 165)", light: "#1465b2", action: "Scan to email" },
  phone: { background: "rgb(19, 101, 53)", light: "#187742", action: "Scan to call" },
  instagram: { background: "rgb(111, 37, 168)", light: "#ad4222", action: "Scan to open Instagram" },
  website: { background: "rgb(41, 60, 65)", light: "#6c8588", action: "Scan to visit website" },
  url: { background: "rgb(32, 68, 77)", light: "#5a8a92", action: "Scan to open link" },
  snapchat: { background: "rgb(255, 252, 0)", light: "#fff780", action: "Scan to open Snapchat" },
} satisfies Record<CardKind, { background: string; light: string; action: string }>;

export function walletCardDesign(kind: CardKind) {
  const design = designs[kind];
  return {
    ...design,
    foreground: kind === "snapchat" || kind === "whatsapp" ? "rgb(18, 29, 22)" : "rgb(255, 255, 255)",
    middle: kind === "instagram" ? "#b11977" : design.background,
  };
}

export function walletSurfaceStyle(kind: CardKind): CSSProperties {
  const { background, light, middle, foreground } = walletCardDesign(kind);
  return { "--pass-background": background, "--pass-light": light, "--pass-middle": middle, "--pass-ink": foreground } as CSSProperties;
}
