import type { CSSProperties } from "react";
import type { DestinationKind } from "./cards";

type CardKind = DestinationKind | "universal";

const designs = {
  universal: { background: "rgb(26, 40, 60)", light: "#415c78", action: "Scan to save contact" },
  linkedin: { background: "rgb(17, 56, 96)", light: "#35759a", action: "Scan to open LinkedIn" },
  whatsapp: { background: "rgb(10, 73, 58)", light: "#3c7861", action: "Scan to chat" },
  email: { background: "rgb(46, 64, 105)", light: "#667eaf", action: "Scan to email" },
  phone: { background: "rgb(56, 53, 86)", light: "#797297", action: "Scan to call" },
  instagram: { background: "rgb(84, 41, 67)", light: "#996b83", action: "Scan to open Instagram" },
  website: { background: "rgb(41, 60, 65)", light: "#6c8588", action: "Scan to visit website" },
  url: { background: "rgb(32, 68, 77)", light: "#5a8a92", action: "Scan to open link" },
  snapchat: { background: "rgb(85, 64, 23)", light: "#967b40", action: "Scan to open Snapchat" },
} satisfies Record<CardKind, { background: string; light: string; action: string }>;

export function walletCardDesign(kind: CardKind) {
  return designs[kind];
}

export function walletSurfaceStyle(kind: CardKind): CSSProperties {
  const { background, light } = designs[kind];
  return { "--pass-background": background, "--pass-light": light } as CSSProperties;
}
