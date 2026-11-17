import { cardDeleted, cardErrorResponse, cardResponse, readCardBody, verifyCardMutationOrigin } from "../../../../lib/server/card-api";
import { deleteOwnedCard, updateOwnedCard } from "../../../../lib/server/card-store";

type CardRoute = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: CardRoute) {
  try {
    verifyCardMutationOrigin(request);
    const { id } = await params;
    return cardResponse({ card: await updateOwnedCard(id, await readCardBody(request)) });
  } catch (error) {
    return cardErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: CardRoute) {
  try {
    verifyCardMutationOrigin(request);
    const { id } = await params;
    await deleteOwnedCard(id);
    return cardDeleted();
  } catch (error) {
    return cardErrorResponse(error);
  }
}
