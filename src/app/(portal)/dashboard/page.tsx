import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardClient } from "./dashboard-client";
import { PLAN_PRICES } from "@/lib/constants";

function buildDailySparkline(
  rows: { clicked_at: string }[],
  days: number,
): number[] {
  const now = new Date();
  const buckets = new Array(days).fill(0);
  for (const r of rows) {
    const d = new Date(r.clicked_at);
    const daysAgo = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
    if (daysAgo >= 0 && daysAgo < days) buckets[days - 1 - daysAgo]++;
  }
  return buckets;
}

function buildMonthlyEarnings(
  rows: { created_at: string; amount: number; status: string }[],
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
  for (const r of rows) {
    const d = new Date(r.created_at);
    const monthsAgo =
      (now.getFullYear() - d.getFullYear()) * 12 +
      (now.getMonth() - d.getMonth());
    if (monthsAgo >= 0 && monthsAgo < months) {
      buckets[months - 1 - monthsAgo].amount += Number(r.amount);
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
      clicksTimeRes,
      leadsCountRes,
      customersRes,
      customerStatesRes,
      commissionsRes,
      allCommissionsRes,
      payoutsRes,
      recentAffiliatesRes,
    ] = await Promise.all([
      service.from("affiliates").select("id", { count: "exact", head: true }).neq("role", "admin"),
      service.from("clicks").select("clicked_at").gte("clicked_at", thirtyDaysAgo),
      service.from("leads").select("id", { count: "exact", head: true }),
      service.from("customers").select("id", { count: "exact", head: true }),
      service.from("customers").select("current_state, plan_type"),
      service.from("commissions").select("amount, status, created_at").gte("created_at", sixMonthsAgo),
      service.from("commissions").select("amount, status"),
      service.from("payouts").select("amount, status"),
      service
        .from("affiliates")
        .select("id, name, slug, tier_level, commission_rate, created_at")
        .neq("role", "admin")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const clickRows = clicksTimeRes.data ?? [];
    const commRows = commissionsRes.data ?? [];
    const stateRows = customerStatesRes.data ?? [];

    const allAmount = commRows.reduce((s, c) => s + Number(c.amount), 0);
    const pendingAmount = commRows
      .filter((c) => c.status === "pending" || c.status === "approved")
      .reduce((s, c) => s + Number(c.amount), 0);

    const activeCount = stateRows.filter(
      (c) => c.current_state === "active_monthly" || c.current_state === "active_annual",
    ).length;
    const monthlyActive = stateRows.filter((c) => c.current_state === "active_monthly").length;
    const annualActive = stateRows.filter((c) => c.current_state === "active_annual").length;
    const trialingCount = stateRows.filter((c) => c.current_state === "trialing").length;
    const churned = stateRows.filter(
      (c) => c.current_state === "canceled" || c.current_state === "dormant",
    ).length;

    const estimatedMRR = monthlyActive * PLAN_PRICES.monthly + annualActive * (PLAN_PRICES.annual / 12);

    const allComms = allCommissionsRes.data ?? [];
    const commissionLiability = allComms
      .filter((c) => c.status === "pending" || c.status === "approved")
      .reduce((s, c) => s + Number(c.amount), 0);

    const totalPaidOut = (payoutsRes.data ?? [])
      .filter((p) => p.status === "completed")
      .reduce((s, p) => s + Number(p.amount), 0);

    return (
      <DashboardClient
        affiliate={affiliate}
        stats={{
          clicks: clickRows.length,
          leads: leadsCountRes.count ?? 0,
          customers: customersRes.count ?? 0,
          earned: allAmount,
          pending: pendingAmount,
          thisMonthEarned: 0,
          lastMonthEarned: 0,
        }}
        chartData={{
          clicksByDay: buildDailySparkline(clickRows, 30),
          earningsByMonth: buildMonthlyEarnings(commRows, 6),
          customerStates: { active: activeCount, trialing: trialingCount, churned },
        }}
        adminData={{
          totalAffiliates: affiliatesRes.count ?? 0,
          recentAffiliates: recentAffiliatesRes.data ?? [],
          estimatedMRR,
          commissionLiability,
          totalPaidOut,
        }}
      />
    );
  }

  // ── Affiliate flow ──
  const [clicksTimeRes, leadsCountRes, customersCountRes, commissionsRes, recentCommissionsRes] =
    await Promise.all([
      supabase
        .from("clicks")
        .select("clicked_at")
        .eq("affiliate_id", affiliate.id)
        .gte("clicked_at", thirtyDaysAgo),
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("affiliate_id", affiliate.id),
      supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("affiliate_id", affiliate.id),
      supabase
        .from("commissions")
        .select("amount, status, created_at")
        .eq("affiliate_id", affiliate.id)
        .gte("created_at", sixMonthsAgo),
      supabase
        .from("commissions")
        .select("id, amount, status, created_at, tier_type, customers(leads(email))")
        .eq("affiliate_id", affiliate.id)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  const clickRows = clicksTimeRes.data ?? [];
  const commRows = commissionsRes.data ?? [];
  const recentComms = recentCommissionsRes.data ?? [];
  const totalLeads = leadsCountRes.count ?? 0;
  const totalCustomers = customersCountRes.count ?? 0;

  const totalEarned = commRows
    .filter((c) => c.status === "paid")
    .reduce((s, c) => s + Number(c.amount), 0);
  const totalPending = commRows
    .filter((c) => c.status === "pending" || c.status === "approved")
    .reduce((s, c) => s + Number(c.amount), 0);

  const startOfMonthDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const thisMonthEarned = commRows
    .filter((c) => new Date(c.created_at) >= startOfMonthDate)
    .reduce((s, c) => s + Number(c.amount), 0);
  const lastMonthEarned = commRows
    .filter((c) => {
      const d = new Date(c.created_at);
      return d >= startOfLastMonthDate && d < startOfMonthDate;
    })
    .reduce((s, c) => s + Number(c.amount), 0);

  const baseProps = {
    affiliate,
    stats: {
      clicks: clickRows.length,
      leads: totalLeads,
      customers: totalCustomers,
      earned: totalEarned,
      pending: totalPending,
      thisMonthEarned,
      lastMonthEarned,
    },
    chartData: {
      clicksByDay: buildDailySparkline(clickRows, 30),
      earningsByMonth: buildMonthlyEarnings(commRows, 6),
      customerStates: { active: 0, trialing: 0, churned: 0 },
    },
    recentActivity: recentComms.map((c) => ({
      id: c.id,
      amount: Number(c.amount),
      status: c.status,
      tier_type: c.tier_type,
      created_at: c.created_at,
      email:
        (c.customers as unknown as { leads: { email: string } | null })?.leads?.email ?? null,
    })),
  };

  if (affiliate.tier_level === 1) {
    const { data: subAffiliates } = await supabase
      .from("affiliates")
      .select("id, name")
      .eq("parent_id", affiliate.id);

    return (
      <DashboardClient
        {...baseProps}
        subAffiliateCount={(subAffiliates ?? []).length}
      />
    );
  }

  return <DashboardClient {...baseProps} />;
}
