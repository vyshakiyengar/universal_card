import { createAccountsClient } from "@/lib/server/supabase";
import { cardErrorResponse } from "@/lib/server/card-api";

export async function GET() {
  try {
    const supabase = await createAccountsClient();
    const result = await supabase?.auth.getUser();
    const user = result?.data.user;
    if (!supabase || !user || result.error) {
      return Response.json({ error: "Sign in to download your data." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    const profile = {
      id: user.id, email: user.email, createdAt: user.created_at, lastSignInAt: user.last_sign_in_at,
      name: user.user_metadata.full_name ?? user.user_metadata.name ?? user.user_metadata.given_name ?? null,
      providers: user.identities?.map((identity) => identity.provider) ?? [],
    };
    const { data: cards, error } = await supabase.rpc("export_universal_card_data");
    if (error) return Response.json({ error: "Your data could not be exported." }, { status: 500, headers: { "Cache-Control": "no-store" } });
    return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), profile, cards }, null, 2), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="universal-card-data.json"',
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return cardErrorResponse(error);
  }
}
