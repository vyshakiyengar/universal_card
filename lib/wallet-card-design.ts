import type { DestinationKind } from "./cards";

type PassColors = { background: string; end: string; highlight: string };

const defaultColors = {
  background: "rgb(19, 46, 110)",
  end: "#224e9e",
  highlight: "#4b7fdb",
};

const platformColors: Partial<Record<DestinationKind | "universal", PassColors>> = {
  whatsapp: { background: "rgb(10, 73, 58)", end: "#0c5845", highlight: "#187059" },
  linkedin: { background: "rgb(17, 56, 96)", end: "#165383", highlight: "#27689d" },
};

export function walletCardColors(kind: DestinationKind | "universal"): PassColors {
  return platformColors[kind] ?? defaultColors;
}
