import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CustomersStats } from "./customers-stats";
import { CustomersTable } from "./customers-table";
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
    .select("id, affiliate_id, current_state, plan_type, created_at, leads(email)")
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

      <CustomersTable
        customers={rows}
        affiliateId={affiliate.id}
        isTier1={isTier1}
        subIdMap={subIdMap}
      />
    </div>
  );
}
