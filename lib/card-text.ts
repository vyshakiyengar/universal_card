import { cardKindLabels, type CardInput } from "./cards";

export function cardKind(draft: CardInput) {
  return draft.type === "universal" ? "universal" as const : draft.kind;
}

// What a card shows: the name, or for an unnamed Individual card its handle or address.
export function cardText(draft: CardInput) {
  const kind = cardKind(draft);
  const label = kind === "universal" ? "Universal card" : cardKindLabels[kind];
  const value = draft.type === "individual"
    ? draft.value.trim().replace(/^https?:\/\/(?:www\.)?/, "").replace(/\/$/, "")
    : "";
  const named = draft.name?.trim();
  const name = named || (draft.type === "universal" ? "Contact" : value || label);
  const detail = draft.type === "universal"
    ? [draft.jobTitle.trim(), draft.company.trim()].filter(Boolean).join(" · ")
    : named && draft.kind !== "linkedin" ? value : "";
  return { kind, label, name, detail };
}
