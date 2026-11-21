import { after } from "next/server";
import { activityContext, recordActivity } from "../../../lib/server/activity";
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
    const card = await createOwnedCard(await readCardBody(request));
    // A guest card moved into the account at sign-in was already counted when it was made.
    if (request.headers.get("x-heya-source") !== "trial") {
      const kind = card.draft.type === "universal" ? "universal" : card.draft.kind;
      after(async () => recordActivity("card_saved", kind, await activityContext()));
    }
    return cardResponse({ card }, 201);
  } catch (error) {
    return cardErrorResponse(error);
  }
}
