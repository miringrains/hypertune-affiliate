import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardClient } from "./dashboard-client";

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

function buildWeeklySparkline(
  rows: { created_at: string }[],
  weeks: number,
): number[] {
  const now = new Date();
  const buckets = new Array(weeks).fill(0);
  for (const r of rows) {
    const d = new Date(r.created_at);
    const weeksAgo = Math.floor(
      (now.getTime() - d.getTime()) / (7 * 86_400_000),
    );
    if (weeksAgo >= 0 && weeksAgo < weeks) buckets[weeks - 1 - weeksAgo]++;
  }
  return buckets;
}

function buildMonthlySparkline(
  rows: { created_at: string; amount: number }[],
  months: number,
): number[] {
  const now = new Date();
  const buckets = new Array(months).fill(0);
  for (const r of rows) {
    const d = new Date(r.created_at);
    const monthsAgo =
      (now.getFullYear() - d.getFullYear()) * 12 +
      (now.getMonth() - d.getMonth());
    if (monthsAgo >= 0 && monthsAgo < months)
      buckets[months - 1 - monthsAgo] += Number(r.amount);
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
  const thirtyDaysAgo = new Date(
    now.getTime() - 30 * 86_400_000,
  ).toISOString();
  const twelveWeeksAgo = new Date(
    now.getTime() - 84 * 86_400_000,
  ).toISOString();
  const sixMonthsAgo = new Date(
    now.getTime() - 180 * 86_400_000,
  ).toISOString();

  if (affiliate.role === "admin") {
    const service = await createServiceClient();
    const [
      affiliatesRes,
      clicksTimeRes,
      leadsTimeRes,
      leadsCountRes,
      customersRes,
      customerStatesRes,
      commissionsRes,
      recentAffiliatesRes,
    ] = await Promise.all([
      service
        .from("affiliates")
        .select("id", { count: "exact", head: true })
        .neq("role", "admin"),
      service
        .from("clicks")
        .select("clicked_at")
        .gte("clicked_at", thirtyDaysAgo),
      service
        .from("leads")
        .select("created_at")
        .gte("created_at", twelveWeeksAgo),
      service.from("leads").select("id", { count: "exact", head: true }),
      service.from("customers").select("id", { count: "exact", head: true }),
      service.from("customers").select("current_state"),
      service
        .from("commissions")
        .select("amount, status, created_at")
        .gte("created_at", sixMonthsAgo),
      service
        .from("affiliates")
        .select("id, name, slug, tier_level, commission_rate, created_at")
        .neq("role", "admin")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const clickRows = clicksTimeRes.data ?? [];
    const leadRows = leadsTimeRes.data ?? [];
    const commRows = commissionsRes.data ?? [];
    const stateRows = customerStatesRes.data ?? [];

    const allAmount = commRows.reduce((s, c) => s + Number(c.amount), 0);
    const pendingAmount = commRows
      .filter((c) => c.status === "pending" || c.status === "approved")
      .reduce((s, c) => s + Number(c.amount), 0);

    const totalLeads = leadsCountRes.count ?? 0;
    const totalCustomers = customersRes.count ?? 0;

    const activeCount = stateRows.filter(
      (c) => c.current_state === "active_monthly" || c.current_state === "active_annual",
    ).length;
    const trialingCount = stateRows.filter(
      (c) => c.current_state === "trialing",
    ).length;
    const churned = stateRows.filter(
      (c) => c.current_state === "canceled" || c.current_state === "dormant",
    ).length;

    return (
      <DashboardClient
        affiliate={affiliate}
        stats={{
          clicks: clickRows.length,
          leads: totalLeads,
          customers: totalCustomers,
          earned: allAmount,
          pending: pendingAmount,
        }}
        chartData={{
          clicksByDay: buildDailySparkline(clickRows, 30),
          leadsByWeek: buildWeeklySparkline(leadRows, 12),
          commissionsByMonth: buildMonthlySparkline(commRows, 6),
          conversionRate: totalLeads > 0 ? Math.round((totalCustomers / totalLeads) * 100) : 0,
          customerStates: { active: activeCount, trialing: trialingCount, churned },
        }}
        adminData={{
          totalAffiliates: affiliatesRes.count ?? 0,
          recentAffiliates: recentAffiliatesRes.data ?? [],
        }}
      />
    );
  }

  // Affiliate flow
  const [clicksTimeRes, leadsTimeRes, leadsCountRes, customersCountRes, commissionsRes] =
    await Promise.all([
      supabase
        .from("clicks")
        .select("clicked_at")
        .eq("affiliate_id", affiliate.id)
        .gte("clicked_at", thirtyDaysAgo),
      supabase
        .from("leads")
        .select("created_at")
        .eq("affiliate_id", affiliate.id)
        .gte("created_at", twelveWeeksAgo),
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
    ]);

  const clickRows = clicksTimeRes.data ?? [];
  const leadRows = leadsTimeRes.data ?? [];
  const commRows = commissionsRes.data ?? [];
  const totalLeads = leadsCountRes.count ?? 0;
  const totalCustomers = customersCountRes.count ?? 0;

  const totalEarned = commRows
    .filter((c) => c.status === "paid")
    .reduce((s, c) => s + Number(c.amount), 0);
  const totalPending = commRows
    .filter((c) => c.status === "pending" || c.status === "approved")
    .reduce((s, c) => s + Number(c.amount), 0);

  const baseStats = {
    clicks: clickRows.length,
    leads: totalLeads,
    customers: totalCustomers,
    earned: totalEarned,
    pending: totalPending,
  };

  const chartData = {
    clicksByDay: buildDailySparkline(clickRows, 30),
    leadsByWeek: buildWeeklySparkline(leadRows, 12),
    commissionsByMonth: buildMonthlySparkline(commRows, 6),
    conversionRate:
      totalLeads > 0 ? Math.round((totalCustomers / totalLeads) * 100) : 0,
    customerStates: { active: 0, trialing: 0, churned: 0 },
  };

  if (affiliate.tier_level === 1) {
    const { data: subAffiliates } = await supabase
      .from("affiliates")
      .select("id, name, slug, commission_rate, created_at")
      .eq("parent_id", affiliate.id);

    const subs = subAffiliates ?? [];

    const subStats = await Promise.all(
      subs.map(async (sub) => {
        const [subClicks, subLeads, subCustomers, subCommissions] =
          await Promise.all([
            supabase
              .from("clicks")
              .select("id", { count: "exact", head: true })
              .eq("affiliate_id", sub.id)
              .gte("clicked_at", thirtyDaysAgo),
            supabase
              .from("leads")
              .select("id", { count: "exact", head: true })
              .eq("affiliate_id", sub.id),
            supabase
              .from("customers")
              .select("id", { count: "exact", head: true })
              .eq("affiliate_id", sub.id),
            supabase
              .from("commissions")
              .select("amount, status")
              .eq("affiliate_id", sub.id),
          ]);

        const subComms = subCommissions.data ?? [];
        return {
          id: sub.id,
          name: sub.name,
          slug: sub.slug,
          commission_rate: sub.commission_rate,
          created_at: sub.created_at,
          clicks: subClicks.count ?? 0,
          leads: subLeads.count ?? 0,
          customers: subCustomers.count ?? 0,
          earned: subComms
            .filter((c) => c.status === "paid")
            .reduce((s, c) => s + Number(c.amount), 0),
        };
      }),
    );

    return (
      <DashboardClient
        affiliate={affiliate}
        stats={baseStats}
        chartData={chartData}
        subAffiliateData={subStats}
      />
    );
  }

  return (
    <DashboardClient
      affiliate={affiliate}
      stats={baseStats}
      chartData={chartData}
    />
  );
}
