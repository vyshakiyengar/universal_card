import { cardLimits, type CardInput, type DestinationKind, type UniversalCard } from "./cards";

// The studio keeps the most recently updated cards first.
export function savedDetail(cards: CardInput[], kind: DestinationKind) {
  for (const card of cards) {
    if (card.type === "individual") {
      if (card.kind === kind) return { value: card.value, name: card.name };
      continue;
    }
    const value = kind === "email" ? card.emails[0]?.value : kind === "phone" ? card.phones[0]?.value
      : card.links.find(link => link.kind === kind)?.value;
    if (value) return { value, name: card.name };
  }
}

export function addIndividualDetails(draft: UniversalCard, cards: CardInput[]): UniversalCard {
  const combined = { ...draft, emails: [...draft.emails], phones: [...draft.phones], links: [...draft.links] };
  for (const card of cards) {
    if (card.type !== "individual") continue;
    const { kind, value } = card;
    if (kind === "email") {
      if (!combined.emails.length) combined.emails.push({ label: "other", value });
    } else if (kind === "phone") {
      if (!combined.phones.length) combined.phones.push({ label: "mobile", value });
    } else if (!combined.links.some(link => link.kind === kind) && combined.links.length < cardLimits.rows) {
      combined.links.push({ kind, value });
    }
  }
  return combined;
}
