import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";

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
  const { data: settings } = await service.from("settings").select("*");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display-sm">Global Settings</h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          Configure system-wide defaults
        </p>
      </div>

      <Card>
        <CardContent className="pt-5 pb-5 px-5">
          {settings && settings.length > 0 ? (
            <div className="space-y-3">
              {settings.map((s) => (
                <div
                  key={s.key}
                  className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0"
                >
                  <span className="text-[13px] font-medium">{s.key}</span>
                  <span className="text-[13px] text-muted-foreground">
                    {String(s.value)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[14px] text-muted-foreground text-center py-6">
              No settings configured yet.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5 pb-5 px-5">
          <p className="text-[13px] text-muted-foreground">
            Settings management coming soon. Current defaults are configured in
            the codebase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
