import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";

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

  const fields = [
    { label: "Name", value: affiliate.name ?? "—" },
    { label: "Email", value: affiliate.email ?? user.email ?? "—" },
    {
      label: "Referral Slug",
      value: affiliate.slug ?? "—",
      note: "Edit your slug from the dashboard.",
    },
    {
      label: "Commission Rate",
      value: `${affiliate.commission_rate}%`,
    },
    {
      label: "Tier Level",
      value: affiliate.tier_level ?? "—",
    },
  ];

  return (
    <div>
      <h1 className="text-display-sm">Settings</h1>
      <p className="text-[14px] text-muted-foreground mt-1">
        Your affiliate profile information.
      </p>

      <Card className="mt-6">
        <CardContent className="p-5 space-y-5">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider w-36 shrink-0">
              Status
            </span>
            <StatusBadge status={affiliate.status ?? "unknown"} />
          </div>

          {fields.map((field) => (
            <div key={field.label} className="flex items-start gap-3">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider w-36 shrink-0 pt-0.5">
                {field.label}
              </span>
              <div>
                <span className="text-[13px]">{field.value}</span>
                {field.note && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {field.note}
                  </p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
