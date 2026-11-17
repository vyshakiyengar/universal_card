import { redirect } from "next/navigation";
import { CardStudio } from "@/components/card-studio";
import { getAccount, isAccountsConfigured } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!isAccountsConfigured()) return <CardStudio />;
  const account = await getAccount();
  if (!account) redirect("/auth/sign-in");
  return <CardStudio account={{ email: account.email }} />;
}
