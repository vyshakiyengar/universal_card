import type { CSSProperties } from "react";
import type { DestinationKind } from "./cards";

type CardKind = DestinationKind | "universal";

const designs = {
  universal: { background: "rgb(26, 40, 60)", base: "#142339", middle: "#304a6d", light: "#19283d", glow: "#647c97", action: "Scan to save contact" },
  linkedin: { background: "rgb(10, 102, 194)", base: "#05294c", middle: "#075395", light: "#103c71", glow: "#2575ad", action: "Scan to open LinkedIn" },
  whatsapp: { background: "rgb(37, 211, 102)", base: "#07372e", middle: "#076448", light: "#094739", glow: "#22805b", action: "Scan to chat" },
  email: { background: "rgb(19, 88, 165)", base: "#192c59", middle: "#345890", light: "#273561", glow: "#5476a8", action: "Scan to email" },
  phone: { background: "rgb(19, 101, 53)", base: "#133b31", middle: "#276448", light: "#143e3d", glow: "#45815d", action: "Scan to call" },
  instagram: { background: "rgb(111, 37, 168)", base: "#a74d14", middle: "#a51e69", light: "#51278b", glow: "#8050aa", action: "Scan to open Instagram" },
  website: { background: "rgb(41, 60, 65)", base: "#1a3040", middle: "#365c69", light: "#203b4c", glow: "#547985", action: "Scan to visit website" },
  url: { background: "rgb(32, 68, 77)", base: "#143943", middle: "#246873", light: "#153d51", glow: "#498489", action: "Scan to open link" },
  snapchat: { background: "rgb(255, 252, 0)", base: "#e7a62d", middle: "#ffe85a", light: "#f5cf3d", glow: "#fff7b4", action: "Scan to open Snapchat" },
} satisfies Record<CardKind, { background: string; base: string; middle: string; light: string; glow: string; action: string }>;

export function walletCardDesign(kind: CardKind) {
  const design = designs[kind];
  return {
    ...design,
    foreground: kind === "snapchat" || kind === "whatsapp" ? "rgb(18, 29, 22)" : "rgb(255, 255, 255)",
    surfaceInk: kind === "snapchat" ? "#241d11" : "#ffffff",
  };
}

export function walletSurfaceStyle(kind: CardKind): CSSProperties {
  const { base, middle, light, glow, surfaceInk } = walletCardDesign(kind);
  return {
    "--pass-background": base, "--pass-middle": middle, "--pass-light": light,
    "--pass-glow": glow, "--pass-ink": surfaceInk,
  } as CSSProperties;
}
