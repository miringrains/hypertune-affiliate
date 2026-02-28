import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!affiliate) redirect("/login");

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
