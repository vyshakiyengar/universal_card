import { cardErrorResponse, cardResponse, readCardBody, verifyCardMutationOrigin } from "../../../lib/server/card-api";
import { createOwnedCard, listOwnedCards } from "../../../lib/server/card-store";

export async function GET() {
  try {
    return cardResponse({ cards: await listOwnedCards() });
  } catch (error) {
    return cardErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    verifyCardMutationOrigin(request);
    return cardResponse({ card: await createOwnedCard(await readCardBody(request)) }, 201);
  } catch (error) {
    return cardErrorResponse(error);
  }
}
