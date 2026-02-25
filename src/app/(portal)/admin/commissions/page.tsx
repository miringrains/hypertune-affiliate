import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency } from "@/lib/utils";

export default async function AdminCommissionsPage() {
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
  const { data: commissions } = await service
    .from("commissions")
    .select("*, affiliates(name, slug), customers(leads(email))")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display-sm">All Commissions</h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          View and manage commissions across all affiliates
        </p>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Affiliate
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Customer Email
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Rate %
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Tier Type
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Payment #
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {commissions?.map((c) => {
                const cust = c.customers as { leads: { email: string } | null } | null;
                const customerEmail = cust?.leads?.email ?? "—";
                const affiliateName =
                  (c.affiliates as { name: string; slug: string } | null)
                    ?.name ?? "—";

                return (
                  <tr key={c.id} className="border-b border-border">
                    <td className="px-5 py-3 text-[13px]">
                      {affiliateName}
                    </td>
                    <td className="px-5 py-3 text-[12px] text-muted-foreground">
                      {customerEmail}
                    </td>
                    <td className="px-5 py-3 text-[13px] font-medium">
                      {formatCurrency(c.amount)}
                    </td>
                    <td className="px-5 py-3 text-[13px]">
                      {c.rate_snapshot}%
                    </td>
                    <td className="px-5 py-3 text-[13px] capitalize">
                      {c.tier_type?.replace(/_/g, " ") ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-[13px]">
                      {c.payment_number ?? "—"}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-5 py-3 text-[12px] text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {(!commissions || commissions.length === 0) && (
            <div className="py-12 text-center">
              <p className="text-[14px] text-muted-foreground">
                No commissions recorded yet.
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
