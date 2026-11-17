import "server-only";

import { CardStoreError } from "./card-store";
import { getAccountsConfig } from "./supabase";

const maxBodyBytes = 16 * 1024;
const privateHeaders = { "Cache-Control": "private, no-store" };

export function verifyCardMutationOrigin(request: Request) {
  const config = getAccountsConfig();
  if (!config) throw new CardStoreError(503, "Account storage is unavailable.");
  if (request.headers.get("origin") !== config.origin) {
    throw new CardStoreError(403, "Invalid request origin.");
  }
}

export async function readCardBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
    throw new CardStoreError(415, "Send the card as JSON.");
  }

  const reader = request.body?.getReader();
  if (!reader) throw new CardStoreError(400, "A card is required.");
  const decode = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let text = "";

  try {
    for (let part = await reader.read(); !part.done; part = await reader.read()) {
      bytes += part.value.byteLength;
      if (bytes > maxBodyBytes) {
        void reader.cancel().catch(() => {});
        throw new CardStoreError(413, "This card is too large to save.");
      }
      text += decode.decode(part.value, { stream: true });
    }
    return JSON.parse(text + decode.decode());
  } catch (error) {
    if (error instanceof CardStoreError) throw error;
    throw new CardStoreError(400, "The card contains invalid JSON.");
  } finally {
    reader.releaseLock();
  }
}

export function cardResponse(data: unknown, status = 200) {
  return Response.json(data, { status, headers: privateHeaders });
}

export function cardDeleted() {
  return new Response(null, { status: 204, headers: privateHeaders });
}

export function cardErrorResponse(error: unknown) {
  if (error instanceof CardStoreError) return cardResponse({ error: error.message }, error.status);
  return cardResponse({ error: "Your card request could not be completed." }, 500);
}
