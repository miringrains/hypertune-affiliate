import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: affiliate }, { data: payoutMethods }] = await Promise.all([
    supabase.from("affiliates").select("*").eq("user_id", user.id).single(),
    supabase.from("payout_methods").select("*").eq("affiliate_id", (
      await supabase.from("affiliates").select("id").eq("user_id", user.id).single()
    ).data?.id ?? ""),
  ]);

  if (!affiliate) redirect("/login");

  return (
    <SettingsClient
      affiliate={affiliate}
      userEmail={user.email ?? affiliate.email}
      payoutMethods={(payoutMethods ?? []).map((m) => ({
        id: m.id,
        type: m.method_type,
        isPrimary: m.is_primary,
      }))}
    />
  );
}
