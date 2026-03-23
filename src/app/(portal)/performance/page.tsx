import { createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { getUser, getAffiliate } from "@/lib/session";
import { PLAN_PRICES } from "@/lib/constants";
import { PerformanceClient } from "./performance-client";
import { withBaseline, withBaselineClicks, withBaselineMoney } from "@/lib/baselines";

export default async function PerformancePage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const affiliate = await getAffiliate();
  if (!affiliate) redirect("/login");

  const svc = await createServiceClient();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000).toISOString();

  const hasSubAffiliates = affiliate.tier_level <= 2 && affiliate.role !== "admin";

  // Build the set of affiliate IDs this user can see
  let allIds = [affiliate.id];
  let subIdMap: Record<string, string> = {};
  let subSlugMap: Record<string, string> = {};
  let subBaselineMap: Record<string, number> = {};
  let subBaselineCustomersMap: Record<string, number> = {};
  let subBaselineClicksMap: Record<string, number> = {};
  let subBaselinePaidMap: Record<string, number> = {};
  let subBaselineOwedMap: Record<string, number> = {};
  if (hasSubAffiliates) {
    const { data: subs } = await svc
      .from("affiliates")
      .select("id, name, slug, baseline_leads, baseline_customers, baseline_clicks, baseline_paid, baseline_owed")
      .eq("parent_id", affiliate.id);
    if (subs) {
      subIdMap[affiliate.id] = "You (Direct)";
      subSlugMap[affiliate.id] = affiliate.slug;
      subBaselineMap[affiliate.id] = affiliate.baseline_leads ?? 0;
      subBaselineCustomersMap[affiliate.id] = affiliate.baseline_customers ?? 0;
      subBaselineClicksMap[affiliate.id] = affiliate.baseline_clicks ?? 0;
      subBaselinePaidMap[affiliate.id] = Number(affiliate.baseline_paid ?? 0);
      subBaselineOwedMap[affiliate.id] = Number(affiliate.baseline_owed ?? 0);
      for (const s of subs) {
        subIdMap[s.id] = s.name;
        subSlugMap[s.id] = s.slug;
        subBaselineMap[s.id] = s.baseline_leads ?? 0;
        subBaselineCustomersMap[s.id] = s.baseline_customers ?? 0;
        subBaselineClicksMap[s.id] = s.baseline_clicks ?? 0;
        subBaselinePaidMap[s.id] = Number(s.baseline_paid ?? 0);
        subBaselineOwedMap[s.id] = Number(s.baseline_owed ?? 0);
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
        { data: subClickRows },
        { data: recentLeads },
        { data: recentCustomers },
      ] = await Promise.all([
        svcInner.rpc("get_performance_funnel", { aff_ids: ids, p_clicks_since: since30d }),
        svcInner.rpc("get_weekly_trend", { aff_ids: ids, p_weeks: 12 }),
        hasSubAffiliates
          ? svcInner.rpc("get_sub_affiliate_stats", { sub_ids: ids })
          : Promise.resolve({ data: null }),
        hasSubAffiliates
          ? svcInner.rpc("count_clicks_by_affiliate", { aff_ids: ids })
          : Promise.resolve({ data: null }),
        svcInner.rpc("get_recent_leads", { aff_ids: ids, p_limit: 200 }),
        svcInner.rpc("get_recent_customers", { aff_ids: ids, p_limit: 200 }),
      ]);

      return { funnelRows, trendRows, subStats, subClickRows, recentLeads, recentCustomers };
    },
    [`perf-${affiliate.id}`],
    { revalidate: 60 },
  );

  const { funnelRows, trendRows, subStats, subClickRows, recentLeads, recentCustomers } =
    await loadData(affiliate.id, allIds, thirtyDaysAgo);

  const f = funnelRows?.[0];
  const directIds = [affiliate.id];

  // For Tier 1, fetch direct funnel and click count in parallel
  let directFunnel = f;
  const directFunnelPromise =
    hasSubAffiliates && f
      ? svc.rpc("get_performance_funnel", {
          aff_ids: directIds,
          p_clicks_since: thirtyDaysAgo,
        })
      : null;

  const clickCountPromise = svc
    .from("clicks")
    .select("id", { count: "exact", head: true })
    .eq("affiliate_id", affiliate.id);

  const [directFunnelResult, { count: liveClickCount }] = await Promise.all([
    directFunnelPromise,
    clickCountPromise,
  ]);

  if (directFunnelResult?.data?.[0]) {
    directFunnel = directFunnelResult.data[0];
  }

  const directMonthly = Number(directFunnel?.active_monthly ?? 0);
  const directAnnual = Number(directFunnel?.active_annual ?? 0);
  const directMRR = directMonthly * PLAN_PRICES.monthly + directAnnual * (PLAN_PRICES.annual / 12);

  const combinedMonthly = Number(f?.active_monthly ?? 0);
  const combinedAnnual = Number(f?.active_annual ?? 0);
  const combinedMRR = combinedMonthly * PLAN_PRICES.monthly + combinedAnnual * (PLAN_PRICES.annual / 12);

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
  const subClickMap: Record<string, number> = {};
  if (subClickRows) {
    for (const r of subClickRows as { affiliate_id: string; click_count: number }[]) {
      subClickMap[r.affiliate_id] = Number(r.click_count);
    }
  }

  let sourceBreakdown: { name: string; slug: string; clicks: number; leads: number; customers: number; earned: number; isDirect: boolean }[] = [];
  if (hasSubAffiliates && subStats) {
    sourceBreakdown = (subStats as { affiliate_id: string; lead_count: number; customer_count: number; earned: number }[])
      .map((s) => {
        const dbLeads = Number(s.lead_count);
        const dbCustomers = Number(s.customer_count);
        const dbEarned = Number(s.earned ?? 0);
        const blLeads = subBaselineMap[s.affiliate_id] ?? 0;
        const blCustomers = subBaselineCustomersMap[s.affiliate_id] ?? 0;
        const blPaid = subBaselinePaidMap[s.affiliate_id] ?? 0;
        const blOwed = subBaselineOwedMap[s.affiliate_id] ?? 0;
        return {
          name: subIdMap[s.affiliate_id] ?? "Unknown",
          slug: subSlugMap[s.affiliate_id] ?? "",
          clicks: withBaselineClicks(subBaselineClicksMap[s.affiliate_id] ?? 0, subClickMap[s.affiliate_id] ?? 0),
          leads: withBaseline(blLeads, dbLeads),
          customers: withBaseline(blCustomers, dbCustomers),
          earned: withBaselineMoney(blPaid + blOwed, dbEarned),
          isDirect: s.affiliate_id === affiliate.id,
        };
      })
      .sort((a, b) => {
        if (a.isDirect) return -1;
        if (b.isDirect) return 1;
        return b.customers - a.customers;
      });
  }

  const displayedClicks = withBaselineClicks(affiliate.baseline_clicks ?? 0, liveClickCount ?? 0);
  const displayedLeads = withBaseline(affiliate.baseline_leads ?? 0, Number(directFunnel?.total_leads ?? 0));
  const displayedCustomers = withBaseline(affiliate.baseline_customers ?? 0, Number(directFunnel?.total_customers ?? 0));

  return (
    <PerformanceClient
      funnel={{
        clicks: displayedClicks,
        leads: displayedLeads,
        trials: Number(directFunnel?.trialing ?? 0),
        customers: displayedCustomers,
      }}
      customerStates={{
        active: directMonthly + directAnnual,
        trialing: Number(directFunnel?.trialing ?? 0),
        churned: Number(directFunnel?.churned ?? 0),
        mrr: directMRR,
      }}
      networkStats={hasSubAffiliates ? {
        leads: sourceBreakdown.filter(s => !s.isDirect).reduce((sum, s) => sum + s.leads, 0),
        customers: sourceBreakdown.filter(s => !s.isDirect).reduce((sum, s) => sum + s.customers, 0),
        active: (combinedMonthly + combinedAnnual) - (directMonthly + directAnnual),
        trialing: Number(f?.trialing ?? 0) - Number(directFunnel?.trialing ?? 0),
        churned: Number(f?.churned ?? 0) - Number(directFunnel?.churned ?? 0),
        mrr: combinedMRR - directMRR,
        subCount: allIds.length - 1,
      } : undefined}
      weeklyTrend={weeklyData}
      hasSubAffiliates={hasSubAffiliates}
      sourceBreakdown={sourceBreakdown}
      leads={(recentLeads ?? []).map((l) => ({
        id: l.id,
        email: l.email,
        converted: !!l.stripe_customer_id,
        customerState: l.customer_state,
        source: hasSubAffiliates ? (subIdMap[l.affiliate_id] ?? "Unknown") : undefined,
        created_at: l.created_at,
      }))}
      customers={(recentCustomers ?? []).map((c) => ({
        id: c.id,
        email: c.lead_email || "—",
        state: c.current_state,
        plan: c.plan_type,
        source: hasSubAffiliates ? (subIdMap[c.affiliate_id] ?? "Unknown") : undefined,
        created_at: c.created_at,
      }))}
    />
  );
}
