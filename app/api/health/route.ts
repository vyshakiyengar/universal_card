import { isAccountsConfigured } from "@/lib/server/supabase";
import { walletHealth } from "@/lib/server/wallet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Polled by the uptime check. Returns 503 when sign-in is not configured. Wallet signing is
// reported separately so the uptime check can alert on it once Wallet is live.
export function GET() {
  const accounts = isAccountsConfigured();
  const wallet = walletHealth();
  return Response.json(
    { status: accounts ? "ok" : "attention", accounts, wallet: wallet.status, walletCertificateExpires: wallet.expiresAt ?? null },
    { status: accounts ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
