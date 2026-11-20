import { redirect } from "next/navigation";
import { CardStudio } from "@/components/card-studio";
import { getAccount, isAccountsConfigured } from "@/lib/server/supabase";
import { isWalletConfigured } from "@/lib/server/wallet";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!isAccountsConfigured()) return <CardStudio />;
  const account = await getAccount();
  if (!account) redirect("/auth/sign-in");
  const { error } = await searchParams;
  return <CardStudio account={{ email: account.email, firstName: account.firstName }}
    walletConfigured={isWalletConfigured()} signOutFailed={error === "sign-out"} />;
}
