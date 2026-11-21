import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { loadAdminData } from "@/lib/server/admin-data";
import { createAccountsClient, getAccount } from "@/lib/server/supabase";
import type { AdminUser } from "./users-table";
import { AdminView } from "./view";
import "./admin.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin | Heya Cards", robots: { index: false, follow: false } };

export default async function Admin({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const requested = (await searchParams).p;
  const account = await getAccount();
  if (!account) redirect("/auth/sign-in");
  const supabase = await createAccountsClient();
  if (!supabase) notFound();
  const { data: allowed } = await supabase.rpc("is_universal_card_admin");
  if (!allowed) notFound();

  let data: Awaited<ReturnType<typeof loadAdminData>>;
  try {
    data = await loadAdminData();
  } catch (error) {
    const detail = error instanceof Error ? error.message : (error as { message?: string; code?: string })?.message ?? String(error);
    const code = (error as { code?: string })?.code;
    console.error("[heya] Admin data could not be loaded:", detail, code ?? "");
    return (
      <main className="admin">
        <Link href="/studio">Back to studio</Link>
        <h1>Heya Cards admin</h1>
        <p role="alert">The numbers could not be loaded. Refresh in a minute.</p>
        <p className="note">Details for Claude: {detail}{code ? ` (${code})` : ""}</p>
      </main>
    );
  }
  const { data: dash } = await supabase.rpc("read_heya_admin_dashboard", { range_days: 365 });
  const users = ((dash as { recentUsers?: AdminUser[] } | null)?.recentUsers ?? []);
  return <AdminView data={data} users={users} requested={requested} />;
}
