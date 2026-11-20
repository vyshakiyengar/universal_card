import { isAccountsConfigured } from "@/lib/server/supabase";
import { walletHealth } from "@/lib/server/wallet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Polled by the uptime check. Returns 503 when sign-in or Wallet signing needs attention,
// including when the Wallet signing certificate expires within 30 days.
export function GET() {
  const accounts = isAccountsConfigured();
  const wallet = walletHealth();
  const ok = accounts && wallet.status === "ok";
  return Response.json(
    { status: ok ? "ok" : "attention", accounts, wallet: wallet.status, walletCertificateExpires: wallet.expiresAt ?? null },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
