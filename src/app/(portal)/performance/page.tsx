import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { PLAN_PRICES } from "@/lib/constants";
import { PerformanceClient } from "./performance-client";

export default async function PerformancePage() {
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

  const svc = await createServiceClient();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000).toISOString();

  const isTier1 = affiliate.tier_level === 1 && affiliate.role !== "admin";

  // Build the set of affiliate IDs this user can see
  let allIds = [affiliate.id];
  let subIdMap: Record<string, string> = {};
  if (isTier1) {
    const { data: subs } = await svc
      .from("affiliates")
      .select("id, name")
      .eq("parent_id", affiliate.id);
    if (subs) {
      subIdMap[affiliate.id] = "You";
      for (const s of subs) {
        subIdMap[s.id] = s.name;
        allIds.push(s.id);
      }
    }
  }

  // All data via RPC — no recursive RLS, no thousands of rows over the wire
  const loadData = unstable_cache(
    async (affiliateId: string, ids: string[], since30d: string) => {
      const svcInner = await createServiceClient();

      const [
        { data: funnelRows },
        { data: trendRows },
        { data: subStats },
        { data: recentLeads },
        { data: recentCustomers },
      ] = await Promise.all([
        svcInner.rpc("get_performance_funnel", { aff_ids: ids, p_clicks_since: since30d }),
        svcInner.rpc("get_weekly_trend", { aff_ids: ids, p_weeks: 12 }),
        isTier1
          ? svcInner.rpc("get_sub_affiliate_stats", { sub_ids: ids })
          : Promise.resolve({ data: null }),
        svcInner.rpc("get_recent_leads", { aff_ids: ids, p_limit: 200 }),
        svcInner.rpc("get_recent_customers", { aff_ids: ids, p_limit: 200 }),
      ]);

      return { funnelRows, trendRows, subStats, recentLeads, recentCustomers };
    },
    [`perf-${affiliate.id}`],
    { revalidate: 60 },
  );

  const { funnelRows, trendRows, subStats, recentLeads, recentCustomers } =
    await loadData(affiliate.id, allIds, thirtyDaysAgo);

  const f = funnelRows?.[0];
  const directIds = [affiliate.id];

  // For Tier 1, funnel shows only direct stats
  let directFunnel = f;
  if (isTier1 && f) {
    const { data: directRows } = await svc.rpc("get_performance_funnel", {
      aff_ids: directIds,
      p_clicks_since: thirtyDaysAgo,
    });
    directFunnel = directRows?.[0] ?? f;
  }

  const monthlyActive = Number(f?.active_monthly ?? 0);
  const annualActive = Number(f?.active_annual ?? 0);
  const estimatedMRR = monthlyActive * PLAN_PRICES.monthly + annualActive * (PLAN_PRICES.annual / 12);

  // Weekly trend
  const weeklyData = (trendRows ?? []).map((r) => {
    const weekStart = new Date(now.getTime() - (12 - Number(r.week_offset)) * 7 * 86_400_000);
    return {
      week: weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      clicks: Number(r.click_count),
      leads: Number(r.lead_count),
      customers: Number(r.customer_count),
    };
  });

  // Source breakdown for Tier 1
  let sourceBreakdown: { name: string; leads: number; customers: number }[] = [];
  if (isTier1 && subStats) {
    sourceBreakdown = (subStats as { affiliate_id: string; lead_count: number; customer_count: number }[])
      .map((s) => ({
        name: subIdMap[s.affiliate_id] ?? "Unknown",
        leads: Number(s.lead_count),
        customers: Number(s.customer_count),
      }))
      .sort((a, b) => b.customers - a.customers);
  }

  return (
    <PerformanceClient
      funnel={{
        clicks: Number(directFunnel?.clicks_30d ?? 0),
        leads: Number(directFunnel?.total_leads ?? 0),
        trials: Number(directFunnel?.trialing ?? 0),
        customers: Number(directFunnel?.total_customers ?? 0),
      }}
      customerStates={{
        active: monthlyActive + annualActive,
        trialing: Number(f?.trialing ?? 0),
        churned: Number(f?.churned ?? 0),
        mrr: estimatedMRR,
      }}
      weeklyTrend={weeklyData}
      isTier1={isTier1}
      sourceBreakdown={sourceBreakdown}
      leads={(recentLeads ?? []).map((l) => ({
        id: l.id,
        email: l.email,
        converted: !!l.stripe_customer_id,
        customerState: l.customer_state,
        source: isTier1 ? (subIdMap[l.affiliate_id] ?? "Unknown") : undefined,
        created_at: l.created_at,
      }))}
      customers={(recentCustomers ?? []).map((c) => ({
        id: c.id,
        email: c.lead_name || c.lead_email || "—",
        state: c.current_state,
        plan: c.plan_type,
        source: isTier1 ? (subIdMap[c.affiliate_id] ?? "Unknown") : undefined,
        created_at: c.created_at,
      }))}
    />
  );
}
