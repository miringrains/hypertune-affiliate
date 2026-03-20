import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUser, getAffiliate } from "@/lib/session";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const affiliate = await getAffiliate();
  if (!affiliate) redirect("/login");

  const supabase = await createClient();
  const [{ data: payoutMethods }, parentResult] = await Promise.all([
    supabase.from("payout_methods").select("*").eq("affiliate_id", affiliate.id),
    affiliate.parent_id
      ? supabase.from("affiliates").select("name").eq("id", affiliate.parent_id).single()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <SettingsClient
      affiliate={affiliate}
      userEmail={user.email ?? affiliate.email}
      payoutMethods={(payoutMethods ?? []).map((m) => ({
        id: m.id,
        type: m.method_type,
        details: (m.details ?? {}) as Record<string, string>,
        isPrimary: m.is_primary,
      }))}
      parentName={parentResult?.data?.name ?? null}
    />
  );
}
