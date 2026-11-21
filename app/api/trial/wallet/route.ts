import { cookies } from "next/headers";
import { after } from "next/server";
import { recordWalletDownload } from "@/lib/server/activity";
import { isSameOriginForm } from "@/lib/server/account-request";
import { getAccountsConfig } from "@/lib/server/supabase";
import { trialCookies } from "@/lib/trial";
import { CardValidationError, makeCardPayload } from "../../../../lib/cards";
import { createWalletPass, WalletUnavailableError } from "../../../../lib/server/wallet";

export const runtime = "nodejs";

// A first-time visitor's free card lives in their browser, so its details come
// with the request. Cards are small text records.
const maxBody = 32 * 1024;
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export async function POST(request: Request) {
  const config = getAccountsConfig();
  if (!config || !isSameOriginForm(request.headers, config.origin)) return Response.json({ error: "Not allowed." }, { status: 403, headers });
  if (!(await cookies()).has(trialCookies.started)) return Response.json({ error: "Open the studio to make your card." }, { status: 403, headers });
  if (Number(request.headers.get("content-length") ?? 0) > maxBody) return Response.json({ error: "Card too large." }, { status: 413, headers });

  const body = await request.text().catch(() => "");
  if (body.length > maxBody) return Response.json({ error: "Card too large." }, { status: 413, headers });
  const form = new URLSearchParams(body);
  const id = form.get("id") ?? "";
  let draft: unknown;
  try { draft = JSON.parse(form.get("card") ?? ""); } catch { draft = undefined; }
  if (!uuid.test(id) || !draft) return Response.json({ error: "This card could not be read." }, { status: 400, headers });

  try {
    const pass = createWalletPass({ id, draft });
    const { card } = makeCardPayload(draft);
    after(() => recordWalletDownload(card.type === "universal" ? "universal" : card.kind));
    return new Response(new Uint8Array(pass), {
      headers: {
        ...headers,
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": 'attachment; filename="heya-card.pkpass"',
      },
    });
  } catch (error) {
    if (error instanceof WalletUnavailableError) return Response.json({ error: error.message }, { status: 503, headers });
    if (error instanceof CardValidationError) return Response.json({ error: error.message }, { status: 422, headers });
    console.error("Apple Wallet pass generation failed.");
    return Response.json({ error: "The Wallet pass could not be generated." }, { status: 500, headers });
  }
}
