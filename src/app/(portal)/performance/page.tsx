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
  let subSlugMap: Record<string, string> = {};
  let subBaselineMap: Record<string, number> = {};
  if (isTier1) {
    const { data: subs } = await svc
      .from("affiliates")
      .select("id, name, slug, baseline_leads")
      .eq("parent_id", affiliate.id);
    if (subs) {
      subIdMap[affiliate.id] = "You (Direct)";
      subSlugMap[affiliate.id] = affiliate.slug;
      subBaselineMap[affiliate.id] = affiliate.baseline_leads ?? 0;
      for (const s of subs) {
        subIdMap[s.id] = s.name;
        subSlugMap[s.id] = s.slug;
        subBaselineMap[s.id] = s.baseline_leads ?? 0;
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
  let sourceBreakdown: { name: string; slug: string; leads: number; customers: number; earned: number; isDirect: boolean }[] = [];
  if (isTier1 && subStats) {
    sourceBreakdown = (subStats as { affiliate_id: string; lead_count: number; customer_count: number; earned: number }[])
      .map((s) => {
        const dbLeads = Number(s.lead_count);
        const bl = subBaselineMap[s.affiliate_id] ?? 0;
        return {
          name: subIdMap[s.affiliate_id] ?? "Unknown",
          slug: subSlugMap[s.affiliate_id] ?? "",
          leads: bl > 0 ? bl : dbLeads,
          customers: Number(s.customer_count),
          earned: Number(s.earned ?? 0),
          isDirect: s.affiliate_id === affiliate.id,
        };
      })
      .sort((a, b) => {
        if (a.isDirect) return -1;
        if (b.isDirect) return 1;
        return b.customers - a.customers;
      });
  }

  const baselineLeads = affiliate.baseline_leads ?? 0;
  const baselineClicks = affiliate.baseline_clicks ?? 0;
  const goLiveAt = affiliate.go_live_at;

  let displayedLeads: number;
  let displayedClicks: number;

  if (goLiveAt) {
    const [{ count: newLeads }, { count: newClicks }] = await Promise.all([
      svc.from("leads").select("id", { count: "exact", head: true })
        .eq("affiliate_id", affiliate.id).gte("created_at", goLiveAt),
      svc.from("clicks").select("id", { count: "exact", head: true })
        .eq("affiliate_id", affiliate.id).gte("created_at", goLiveAt),
    ]);
    displayedLeads = baselineLeads + (newLeads ?? 0);
    displayedClicks = baselineClicks + (newClicks ?? 0);
  } else {
    displayedLeads = baselineLeads > 0 ? baselineLeads : Number(directFunnel?.total_leads ?? 0);
    displayedClicks = baselineClicks > 0 ? baselineClicks : Number(directFunnel?.clicks_30d ?? 0);
  }

  return (
    <PerformanceClient
      funnel={{
        clicks: displayedClicks,
        leads: displayedLeads,
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
        email: c.lead_email || "—",
        state: c.current_state,
        plan: c.plan_type,
        source: isTier1 ? (subIdMap[c.affiliate_id] ?? "Unknown") : undefined,
        created_at: c.created_at,
      }))}
    />
  );
}
