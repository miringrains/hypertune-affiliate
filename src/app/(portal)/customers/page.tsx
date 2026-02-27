import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { CustomersStats } from "./customers-stats";
import { PLAN_PRICES } from "@/lib/constants";

export default async function CustomersPage() {
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

  const isTier1 = affiliate.tier_level === 1 && affiliate.role !== "admin";

  let subIdMap: Record<string, string> = {};

  if (isTier1) {
    const { data: subs } = await supabase
      .from("affiliates")
      .select("id, name")
      .eq("parent_id", affiliate.id);

    if (subs) {
      subIdMap[affiliate.id] = "You";
      for (const s of subs) {
        subIdMap[s.id] = s.name;
      }
    }
  }

  const query = supabase
    .from("customers")
    .select("*, leads(email)")
    .order("created_at", { ascending: false });

  if (!isTier1) {
    query.eq("affiliate_id", affiliate.id);
  }

  const { data: customers } = await query;
  const rows = (customers ?? []).filter((c) =>
    isTier1
      ? c.affiliate_id === affiliate.id || subIdMap[c.affiliate_id]
      : true,
  );

  const activeCount = rows.filter(
    (c) =>
      c.current_state === "active_monthly" ||
      c.current_state === "active_annual",
  ).length;
  const trialingCount = rows.filter(
    (c) => c.current_state === "trialing",
  ).length;
  const churnedCount = rows.filter(
    (c) => c.current_state === "canceled" || c.current_state === "dormant",
  ).length;

  const monthlyActive = rows.filter(
    (c) => c.current_state === "active_monthly",
  ).length;
  const annualActive = rows.filter(
    (c) => c.current_state === "active_annual",
  ).length;
  const estimatedMRR =
    monthlyActive * PLAN_PRICES.monthly +
    annualActive * (PLAN_PRICES.annual / 12);

  return (
    <div>
      <h1 className="text-display-sm">Customers</h1>
      <p className="text-[14px] text-muted-foreground mt-1">
        {isTier1
          ? "Customers from your referrals and your sub-affiliates."
          : "Leads that converted into paying customers."}
      </p>

      <CustomersStats
        active={activeCount}
        trialing={trialingCount}
        churned={churnedCount}
        mrr={estimatedMRR}
        total={rows.length}
      />

      <Card className="mt-6">
        <div className="overflow-x-auto">
          {rows.length === 0 ? (
            <div className="px-5 py-12 text-center text-[13px] text-muted-foreground">
              No customers yet.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Email
                  </th>
                  {isTier1 && (
                    <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Source
                    </th>
                  )}
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    State
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Plan Type
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Payments
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    First Payment
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((customer) => (
                  <tr key={customer.id} className="border-b border-border">
                    <td className="px-5 py-3 text-[13px]">
                      {customer.leads?.email ?? "—"}
                    </td>
                    {isTier1 && (
                      <td className="px-5 py-3 text-[12px] text-muted-foreground">
                        {customer.affiliate_id === affiliate.id
                          ? "You"
                          : subIdMap[customer.affiliate_id] ?? "—"}
                      </td>
                    )}
                    <td className="px-5 py-3">
                      <StatusBadge
                        status={customer.current_state ?? "unknown"}
                      />
                    </td>
                    <td className="px-5 py-3 text-[13px]">
                      {customer.plan_type ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-[13px]">
                      {customer.payment_count ?? 0}
                    </td>
                    <td className="px-5 py-3 text-[12px] text-muted-foreground">
                      {customer.first_payment_at
                        ? new Date(
                            customer.first_payment_at,
                          ).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-[12px] text-muted-foreground">
                      {new Date(customer.created_at).toLocaleDateString()}
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
