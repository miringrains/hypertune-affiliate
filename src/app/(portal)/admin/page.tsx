import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";

export default async function AdminAffiliatesPage() {
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
  const { data: affiliates } = await service
    .from("affiliates")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display-sm">Affiliates</h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          Manage all affiliates in the system
        </p>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Name
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Email
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Tier Level
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Commission Rate %
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Role
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {affiliates?.map((a) => (
                <tr key={a.id} className="border-b border-border">
                  <td className="px-5 py-3 text-[13px]">{a.name}</td>
                  <td className="px-5 py-3 text-[13px]">{a.email}</td>
                  <td className="px-5 py-3 text-[12px] text-muted-foreground font-mono">
                    {a.slug}
                  </td>
                  <td className="px-5 py-3 text-[13px]">{a.tier_level}</td>
                  <td className="px-5 py-3 text-[13px]">
                    {a.commission_rate}%
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-5 py-3 text-[13px] capitalize">
                    {a.role}
                  </td>
                  <td className="px-5 py-3 text-[12px] text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!affiliates || affiliates.length === 0) && (
            <div className="py-12 text-center">
              <p className="text-[14px] text-muted-foreground">
                No affiliates found.
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
