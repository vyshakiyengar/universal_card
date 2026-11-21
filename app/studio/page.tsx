import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CardStudio } from "@/components/card-studio";
import { createAccountsClient, getAccount, isAccountsConfigured } from "@/lib/server/supabase";
import { isWalletConfigured } from "@/lib/server/wallet";
import { trialCookies } from "@/lib/trial";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Studio | Heya Cards", robots: { index: false, follow: false } };

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!isAccountsConfigured()) return <CardStudio />;
  const account = await getAccount();
  const walletConfigured = isWalletConfigured();
  if (!account) {
    // The proxy lets a first-time visitor try the studio for one visit.
    const jar = await cookies();
    if (jar.has(trialCookies.used) || !jar.has(trialCookies.visit)) redirect("/auth/sign-in?from=studio");
    return <CardStudio trial walletConfigured={walletConfigured} />;
  }
  const { error } = await searchParams;
  const admin = await (await createAccountsClient())?.rpc("is_universal_card_admin");
  const isAdmin = admin?.data === true;
  return <CardStudio account={{ email: account.email, firstName: account.firstName, fullName: account.fullName, isAdmin }}
    walletConfigured={walletConfigured} signOutFailed={error === "sign-out"} />;
}
