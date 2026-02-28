import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { SettingsAdminClient } from "./settings-admin-client";

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (!affiliate || affiliate.role !== "admin") redirect("/dashboard");

  const service = await createServiceClient();
  const { data: settings } = await service
    .from("settings")
    .select("key, value, updated_at");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display-sm">Global Settings</h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          Configure system-wide defaults
        </p>
      </div>

      <SettingsAdminClient settings={settings ?? []} />
    </div>
  );
}
