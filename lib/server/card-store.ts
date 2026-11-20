import "server-only";

import { CardValidationError, makeCardPayload, type CardInput } from "../cards";
import { buildCardQr } from "../qr";
import { createAccountsClient } from "./supabase";

export type SavedCard = {
  id: string;
  draft: CardInput;
  createdAt: string;
  updatedAt: string;
};

type CardRow = {
  id: string;
  draft: CardInput;
  created_at: string;
  updated_at: string;
};

export class CardStoreError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

const cardsSelect = "id,draft,created_at,updated_at";
export const cardLimitPerAccount = 50;
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

function savedCard(row: CardRow): SavedCard {
  return { id: row.id, draft: row.draft, createdAt: row.created_at, updatedAt: row.updated_at };
}

function validateDraft(input: unknown) {
  try {
    const { card, payload } = makeCardPayload(input);
    buildCardQr(payload);
    return card;
  } catch (error) {
    if (error instanceof CardValidationError) throw new CardStoreError(422, error.message);
    throw error;
  }
}

async function storageForOwner() {
  const supabase = await createAccountsClient();
  if (!supabase) throw new CardStoreError(503, "Account storage is unavailable.");
  const { data, error } = await supabase.auth.getUser();
  if (error && (error.status === 0 || (error.status ?? 0) >= 500)) {
    throw new CardStoreError(503, "Sign-in is temporarily unavailable.");
  }
  if (error || !data.user) throw new CardStoreError(401, "Sign in to manage your saved cards.");
  return { cards: supabase.from("cards"), ownerId: data.user.id };
}

export async function listOwnedCards(): Promise<SavedCard[]> {
  const { cards, ownerId } = await storageForOwner();
  const { data, error } = await cards.select(cardsSelect).eq("owner_id", ownerId)
    .order("updated_at", { ascending: false }).order("id");
  if (error) throw new CardStoreError(500, "Your saved cards could not be loaded.");
  return data.map(savedCard);
}

export async function createOwnedCard(input: unknown): Promise<SavedCard> {
  const { cards } = await storageForOwner();
  const { data, error } = await cards.insert({ draft: validateDraft(input) }).select(cardsSelect).single();
  if (error?.message.includes("card_limit_reached")) {
    throw new CardStoreError(422, `You can keep up to ${cardLimitPerAccount} cards. Delete one to add another.`);
  }
  if (error) throw new CardStoreError(500, "Your card could not be saved.");
  return savedCard(data);
}

export async function getOwnedCard(id: string): Promise<SavedCard> {
  const { cards, ownerId } = await storageForOwner();
  if (!uuid.test(id)) throw new CardStoreError(404, "Card not found.");
  const { data, error } = await cards.select(cardsSelect).eq("owner_id", ownerId).eq("id", id).maybeSingle();
  if (error) throw new CardStoreError(500, "Your card could not be loaded.");
  if (!data) throw new CardStoreError(404, "Card not found.");
  return savedCard(data);
}

export async function updateOwnedCard(id: string, input: unknown): Promise<SavedCard> {
  const { cards, ownerId } = await storageForOwner();
  if (!uuid.test(id)) throw new CardStoreError(404, "Card not found.");
  const { data, error } = await cards.update({ draft: validateDraft(input) })
    .eq("owner_id", ownerId).eq("id", id).select(cardsSelect).maybeSingle();
  if (error) throw new CardStoreError(500, "Your card could not be saved.");
  if (!data) throw new CardStoreError(404, "Card not found.");
  return savedCard(data);
}

export async function deleteOwnedCard(id: string): Promise<void> {
  const { cards, ownerId } = await storageForOwner();
  if (!uuid.test(id)) throw new CardStoreError(404, "Card not found.");
  const { data, error } = await cards.delete().eq("owner_id", ownerId).eq("id", id).select("id").maybeSingle();
  if (error) throw new CardStoreError(500, "Your card could not be deleted.");
  if (!data) throw new CardStoreError(404, "Card not found.");
}
