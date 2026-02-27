import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency } from "@/lib/utils";
import { CommissionsStats } from "./commissions-stats";

export default async function CommissionsPage() {
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

  const { data: commissions } = await supabase
    .from("commissions")
    .select("*, customers(leads(email))")
    .eq("affiliate_id", affiliate.id)
    .order("created_at", { ascending: false });

  const rows = commissions ?? [];

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const totalEarned = rows
    .filter((c) => c.status === "paid")
    .reduce((s, c) => s + Number(c.amount), 0);

  const totalPending = rows
    .filter((c) => c.status === "pending" || c.status === "approved")
    .reduce((s, c) => s + Number(c.amount), 0);

  const thisMonthAmount = rows
    .filter((c) => new Date(c.created_at) >= startOfMonth)
    .reduce((s, c) => s + Number(c.amount), 0);

  const monthlySparkline = (() => {
    const buckets = new Array(6).fill(0);
    for (const c of rows) {
      const d = new Date(c.created_at);
      const monthsAgo =
        (now.getFullYear() - d.getFullYear()) * 12 +
        (now.getMonth() - d.getMonth());
      if (monthsAgo >= 0 && monthsAgo < 6)
        buckets[5 - monthsAgo] += Number(c.amount);
    }
    return buckets;
  })();

  return (
    <div>
      <h1 className="text-display-sm">Commissions</h1>
      <p className="text-[14px] text-muted-foreground mt-1">
        Commissions earned from your referred customers.
      </p>

      <CommissionsStats
        earned={totalEarned}
        pending={totalPending}
        thisMonth={thisMonthAmount}
        sparkline={monthlySparkline}
      />

      <Card className="mt-6">
        <div className="overflow-x-auto">
          {rows.length === 0 ? (
            <div className="px-5 py-12 text-center text-[13px] text-muted-foreground">
              No commissions yet.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Rate
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((commission) => (
                  <tr key={commission.id} className="border-b border-border">
                    <td className="px-5 py-3 text-[13px]">
                      {commission.customers?.leads?.email ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-[13px] font-medium tabular-nums">
                      {formatCurrency(Number(commission.amount))}
                    </td>
                    <td className="px-5 py-3 text-[13px] tabular-nums">
                      {commission.rate_snapshot}%
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={commission.status ?? "unknown"} />
                    </td>
                    <td className="px-5 py-3 text-[12px] text-muted-foreground">
                      {new Date(commission.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
