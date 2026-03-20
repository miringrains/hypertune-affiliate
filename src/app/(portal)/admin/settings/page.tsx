import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getUser, getAffiliate } from "@/lib/session";
import { SettingsAdminClient } from "./settings-admin-client";

export default async function AdminSettingsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const affiliate = await getAffiliate();
  if (!affiliate || affiliate.role !== "admin") redirect("/dashboard");

  const service = await createServiceClient();
  const { data: settings } = await service
    .from("settings")
    .select("key, value, updated_at");

  const allSettings = settings ?? [];

  const paypalClientId = allSettings.find((s) => s.key === "paypal_client_id");
  const paypalMode = allSettings.find((s) => s.key === "paypal_mode");

  const displaySettings = allSettings.filter(
    (s) => !s.key.startsWith("paypal_"),
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display-sm">Global Settings</h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          Configure system-wide defaults and integrations
        </p>
      </div>

      <SettingsAdminClient
        settings={displaySettings}
        paypalConnected={!!paypalClientId?.value}
        paypalMode={String(paypalMode?.value ?? "sandbox")}
      />
    </div>
  );
}
