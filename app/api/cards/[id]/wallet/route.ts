import { CardValidationError } from "../../../../../lib/cards";
import { CardStoreError, getOwnedCard } from "../../../../../lib/server/card-store";
import { createWalletPass, WalletUnavailableError } from "../../../../../lib/server/wallet";

export const runtime = "nodejs";

const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const card = await getOwnedCard(id);
    const pass = createWalletPass(card);

    return new Response(new Uint8Array(pass), {
      headers: {
        ...privateHeaders,
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": 'attachment; filename="universal-card.pkpass"',
      },
    });
  } catch (error) {
    if (error instanceof CardStoreError) {
      return Response.json({ error: error.message }, { status: error.status, headers: privateHeaders });
    }
    if (error instanceof WalletUnavailableError) {
      return Response.json({ error: error.message }, { status: 503, headers: privateHeaders });
    }
    if (error instanceof CardValidationError) {
      return Response.json({ error: error.message }, { status: 422, headers: privateHeaders });
    }

    console.error("Apple Wallet pass generation failed.");
    return Response.json({ error: "The Wallet pass could not be generated." }, { status: 500, headers: privateHeaders });
  }
}
