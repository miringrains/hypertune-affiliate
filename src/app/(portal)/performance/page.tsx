import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
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

  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86_400_000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000).toISOString();

  const isTier1 = affiliate.tier_level === 1 && affiliate.role !== "admin";

  let subIdMap: Record<string, string> = {};
  if (isTier1) {
    const { data: subs } = await supabase
      .from("affiliates")
      .select("id, name")
      .eq("parent_id", affiliate.id);
    if (subs) {
      subIdMap[affiliate.id] = "You";
      for (const s of subs) subIdMap[s.id] = s.name;
    }
  }

  const [clicksRes, leadsRes, customersRes, clicksTrendRes] = await Promise.all([
    supabase
      .from("clicks")
      .select("id", { count: "exact", head: true })
      .eq("affiliate_id", affiliate.id)
      .gte("clicked_at", thirtyDaysAgo),
    (() => {
      const q = supabase
        .from("leads")
        .select("id, email, affiliate_id, stripe_customer_id, created_at")
        .order("created_at", { ascending: false });
      if (!isTier1) q.eq("affiliate_id", affiliate.id);
      return q;
    })(),
    (() => {
      const q = supabase
        .from("customers")
        .select("id, affiliate_id, current_state, plan_type, created_at, leads(email)")
        .order("created_at", { ascending: false });
      if (!isTier1) q.eq("affiliate_id", affiliate.id);
      return q;
    })(),
    supabase
      .from("clicks")
      .select("clicked_at")
      .eq("affiliate_id", affiliate.id)
      .gte("clicked_at", ninetyDaysAgo),
  ]);

  const clicks30d = clicksRes.count ?? 0;
  const allLeads = (leadsRes.data ?? []).filter((l) =>
    isTier1 ? l.affiliate_id === affiliate.id || subIdMap[l.affiliate_id] : true,
  );
  const allCustomers = (customersRes.data ?? []).filter((c) =>
    isTier1 ? c.affiliate_id === affiliate.id || subIdMap[c.affiliate_id] : true,
  );

  // Build weekly trend data (12 weeks)
  const clickTrendRows = clicksTrendRes.data ?? [];
  const weeklyData: { week: string; clicks: number; leads: number; customers: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const weekStart = new Date(now.getTime() - (i + 1) * 7 * 86_400_000);
    const weekEnd = new Date(now.getTime() - i * 7 * 86_400_000);
    const label = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    weeklyData.push({
      week: label,
      clicks: clickTrendRows.filter((c) => {
        const d = new Date(c.clicked_at);
        return d >= weekStart && d < weekEnd;
      }).length,
      leads: allLeads.filter((l) => {
        const d = new Date(l.created_at);
        return d >= weekStart && d < weekEnd;
      }).length,
      customers: allCustomers.filter((c) => {
        const d = new Date(c.created_at);
        return d >= weekStart && d < weekEnd;
      }).length,
    });
  }

  // Customer state breakdown
  const activeCustomers = allCustomers.filter(
    (c) => c.current_state === "active_monthly" || c.current_state === "active_annual",
  );
  const trialingCount = allCustomers.filter((c) => c.current_state === "trialing").length;
  const churnedCount = allCustomers.filter(
    (c) => c.current_state === "canceled" || c.current_state === "dormant",
  ).length;
  const monthlyActive = allCustomers.filter((c) => c.current_state === "active_monthly").length;
  const annualActive = allCustomers.filter((c) => c.current_state === "active_annual").length;
  const estimatedMRR = monthlyActive * PLAN_PRICES.monthly + annualActive * (PLAN_PRICES.annual / 12);

  // Source breakdown for Tier 1
  let sourceBreakdown: { name: string; leads: number; customers: number }[] = [];
  if (isTier1) {
    const sources = new Map<string, { leads: number; customers: number }>();
    for (const [id, name] of Object.entries(subIdMap)) {
      sources.set(name, {
        leads: allLeads.filter((l) => l.affiliate_id === id).length,
        customers: allCustomers.filter((c) => c.affiliate_id === id).length,
      });
    }
    sourceBreakdown = Array.from(sources.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.customers - a.customers);
  }

  return (
    <PerformanceClient
      funnel={{ clicks: clicks30d, leads: allLeads.length, customers: allCustomers.length }}
      customerStates={{
        active: activeCustomers.length,
        trialing: trialingCount,
        churned: churnedCount,
        mrr: estimatedMRR,
      }}
      weeklyTrend={weeklyData}
      isTier1={isTier1}
      sourceBreakdown={sourceBreakdown}
      leads={allLeads.map((l) => ({
        id: l.id,
        email: l.email,
        converted: !!l.stripe_customer_id,
        source: isTier1 ? (subIdMap[l.affiliate_id] ?? "Unknown") : undefined,
        created_at: l.created_at,
      }))}
      customers={allCustomers.map((c) => ({
        id: c.id,
        email: (c.leads as unknown as { email: string } | null)?.email ?? "—",
        state: c.current_state,
        plan: c.plan_type,
        source: isTier1 ? (subIdMap[c.affiliate_id] ?? "Unknown") : undefined,
        created_at: c.created_at,
      }))}
    />
  );
}
