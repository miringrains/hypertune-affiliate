import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency } from "@/lib/utils";

export default async function AdminPayoutsPage() {
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
  const { data: payouts } = await service
    .from("payouts")
    .select("*, affiliates(name, email)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display-sm">Payouts</h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          Process and track affiliate payouts
        </p>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Affiliate Name
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Method
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Created
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Completed
                </th>
              </tr>
            </thead>
            <tbody>
              {payouts?.map((p) => {
                const affiliateName =
                  (p.affiliates as { name: string; email: string } | null)
                    ?.name ?? "—";

                return (
                  <tr key={p.id} className="border-b border-border">
                    <td className="px-5 py-3 text-[13px]">
                      {affiliateName}
                    </td>
                    <td className="px-5 py-3 text-[13px] font-medium">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-5 py-3 text-[13px] capitalize">
                      {p.method?.replace(/_/g, " ") ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-[12px] text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-[12px] text-muted-foreground">
                      {p.completed_at
                        ? new Date(p.completed_at).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {(!payouts || payouts.length === 0) && (
            <div className="py-12 text-center">
              <p className="text-[14px] text-muted-foreground">
                No payouts to process.
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
