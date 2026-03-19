import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardClient } from "./dashboard-client";
import { PLAN_PRICES } from "@/lib/constants";
import { withBaseline, withBaselineClicks, withBaselineMoney } from "@/lib/baselines";

function sparklineFromBuckets(
  bucketRows: { day_offset: number; click_count: number }[] | null,
  days: number,
): number[] {
  const buckets = new Array(days).fill(0);
  for (const r of bucketRows ?? []) {
    const idx = Number(r.day_offset);
    if (idx >= 0 && idx < days) buckets[idx] = Number(r.click_count);
  }
  return buckets;
}

function monthlyFromBuckets(
  rows: { month_start: string; total_amount: number }[] | null,
  months: number,
): { month: string; amount: number }[] {
  const now = new Date();
  const buckets: { month: string; amount: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      month: d.toLocaleDateString("en-US", { month: "short" }),
      amount: 0,
    });
  }
  for (const r of rows ?? []) {
    const d = new Date(r.month_start);
    const monthsAgo =
      (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    if (monthsAgo >= 0 && monthsAgo < months) {
      buckets[months - 1 - monthsAgo].amount = Number(r.total_amount);
    }
  }
  return buckets;
}

export default async function DashboardPage() {
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

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const sixMonthsAgo = new Date(now.getTime() - 180 * 86_400_000).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

  if (affiliate.role === "admin") {
    const service = await createServiceClient();
    const [
      affiliatesRes,
      leadsCountRes,
      customersRes,
      { data: adminStats },
      { data: clickBuckets },
      { data: monthlyRows },
      recentAffiliatesRes,
    ] = await Promise.all([
      service.from("affiliates").select("id", { count: "exact", head: true }).neq("role", "admin"),
      service.from("leads").select("id", { count: "exact", head: true }),
      service.from("customers").select("id", { count: "exact", head: true }),
      service.rpc("get_admin_dashboard_stats", {
        p_start_of_month: startOfMonth,
        p_start_of_last_month: startOfLastMonth,
      }),
      service.rpc("get_daily_click_counts", { p_since: thirtyDaysAgo, p_days: 30 }),
      service.rpc("get_monthly_earnings", { p_since: sixMonthsAgo }),
      service
        .from("affiliates")
        .select("id, name, slug, tier_level, commission_rate, created_at")
        .neq("role", "admin")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const s = adminStats?.[0];
    const totalClicks = (clickBuckets ?? []).reduce(
      (sum: number, r: { click_count: number }) => sum + Number(r.click_count), 0,
    );
    const monthlyActive = Number(s?.active_monthly_count ?? 0);
    const annualActive = Number(s?.annual_active_count ?? 0);
    const trialingCount = Number(s?.trialing_count ?? 0);
    const churned = Number(s?.churned_count ?? 0);
    const activeCount = monthlyActive + annualActive;
    const estimatedMRR = monthlyActive * PLAN_PRICES.monthly + annualActive * (PLAN_PRICES.annual / 12);

    return (
      <DashboardClient
        affiliate={affiliate}
        stats={{
          clicks: totalClicks,
          leads: leadsCountRes.count ?? 0,
          trials: trialingCount,
          customers: customersRes.count ?? 0,
          earned: Number(s?.total_earned ?? 0),
          pending: Number(s?.pending_amount ?? 0),
          thisMonthEarned: Number(s?.this_month_earned ?? 0),
          lastMonthEarned: Number(s?.last_month_earned ?? 0),
        }}
        chartData={{
          clicksByDay: sparklineFromBuckets(clickBuckets, 30),
          earningsByMonth: monthlyFromBuckets(monthlyRows, 6),
          customerStates: { active: activeCount, trialing: trialingCount, churned },
        }}
        adminData={{
          totalAffiliates: affiliatesRes.count ?? 0,
          recentAffiliates: recentAffiliatesRes.data ?? [],
          estimatedMRR,
          commissionLiability: Number(s?.commission_liability ?? 0),
          totalPaidOut: Number(s?.total_paid_out ?? 0),
        }}
      />
    );
  }

  // ── Affiliate flow ──
  const svc = await createServiceClient();
  const [
    { data: affStats },
    { data: affClickBuckets },
    { data: affMonthlyRows },
    recentCommissionsRes,
    taxDocRes,
  ] = await Promise.all([
    svc.rpc("get_affiliate_dashboard_stats", {
      p_affiliate_id: affiliate.id,
      p_start_of_month: startOfMonth,
      p_start_of_last_month: startOfLastMonth,
    }),
    svc.rpc("get_affiliate_daily_clicks", {
      p_affiliate_id: affiliate.id,
      p_since: thirtyDaysAgo,
      p_days: 30,
    }),
    svc.rpc("get_affiliate_monthly_earnings", {
      p_affiliate_id: affiliate.id,
      p_since: sixMonthsAgo,
    }),
    supabase
      .from("commissions")
      .select("id, amount, status, created_at, tier_type, customers(leads(email, name))")
      .eq("affiliate_id", affiliate.id)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("tax_documents")
      .select("id", { count: "exact", head: true })
      .eq("affiliate_id", affiliate.id),
  ]);

  const a = affStats?.[0];
  const recentComms = recentCommissionsRes.data ?? [];
  const hasTaxForm = (taxDocRes.count ?? 0) > 0;

  const { count: liveClickCount } = await svc
    .from("clicks").select("id", { count: "exact", head: true })
    .eq("affiliate_id", affiliate.id);

  const displayedClicks = withBaselineClicks(affiliate.baseline_clicks ?? 0, liveClickCount ?? 0);
  const displayedLeads = withBaseline(affiliate.baseline_leads ?? 0, Number(a?.total_leads ?? 0));
  const displayedCustomers = withBaseline(affiliate.baseline_customers ?? 0, Number(a?.total_customers ?? 0));

  const dbEarned = Number(a?.paid_amount ?? 0);
  const dbPending = Number(a?.pending_amount ?? 0);
  const displayedEarned = withBaselineMoney(affiliate.baseline_paid ?? 0, dbEarned);
  const displayedPending = withBaselineMoney(affiliate.baseline_owed ?? 0, dbPending);

  const baseProps = {
    affiliate,
    hasTaxForm,
    stats: {
      clicks: displayedClicks,
      leads: displayedLeads,
      trials: Number(a?.trialing_count ?? 0),
      customers: displayedCustomers,
      earned: displayedEarned,
      pending: displayedPending,
      thisMonthEarned: Number(a?.this_month_earned ?? 0),
      lastMonthEarned: Number(a?.last_month_earned ?? 0),
    },
    chartData: {
      clicksByDay: sparklineFromBuckets(affClickBuckets, 30),
      earningsByMonth: monthlyFromBuckets(affMonthlyRows, 6),
      customerStates: {
        active: Number(a?.active_count ?? 0),
        trialing: Number(a?.trialing_count ?? 0),
        churned: Number(a?.churned_count ?? 0),
      },
    },
    recentActivity: recentComms.map((c) => ({
      id: c.id,
      amount: Number(c.amount),
      status: c.status,
      tier_type: c.tier_type,
      created_at: c.created_at,
      email:
        (c.customers as unknown as { leads: { email: string; name: string | null } | null })?.leads?.email ?? null,
    })),
  };

  if (affiliate.tier_level <= 2) {
    const { data: subAffiliates } = await svc
      .from("affiliates")
      .select("id, name")
      .eq("parent_id", affiliate.id);

    const subIds = (subAffiliates ?? []).map((s) => s.id);
    let subCustomerStates = { active: 0, trialing: 0, churned: 0 };
    if (subIds.length > 0) {
      const { data: subData } = await svc.rpc("get_affiliate_detail_stats", { aff_ids: subIds });
      const sr = subData?.[0];
      if (sr) {
        subCustomerStates = {
          active: Number(sr.active_monthly) + Number(sr.active_annual),
          trialing: Number(sr.trialing),
          churned: Number(sr.canceled),
        };
      }
    }

    return (
      <DashboardClient
        {...baseProps}
        subAffiliateCount={subIds.length}
        subCustomerStates={subCustomerStates}
      />
    );
  }

  return <DashboardClient {...baseProps} />;
}
