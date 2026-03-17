import { redirect, notFound } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { AffiliateDetailClient } from "./affiliate-detail-client";
import { withBaseline, withBaselineClicks, withBaselineMoney } from "@/lib/baselines";

async function computeStatsForIds(
  service: Awaited<ReturnType<typeof createServiceClient>>,
  ids: string[],
) {
  const { data } = await service.rpc("get_affiliate_detail_stats", { aff_ids: ids });
  const row = data?.[0];
  if (!row) {
    return {
      clicks: 0, leads: 0, customers: 0, trialing: 0,
      activeSubs: 0, activeMonthly: 0, activeAnnual: 0, canceled: 0,
      totalEarned: 0, pendingAmount: 0, paidAmount: 0,
    };
  }
  return {
    clicks: Number(row.clicks),
    leads: Number(row.leads),
    customers: Number(row.total_customers),
    trialing: Number(row.trialing),
    activeSubs: Number(row.active_monthly) + Number(row.active_annual),
    activeMonthly: Number(row.active_monthly),
    activeAnnual: Number(row.active_annual),
    canceled: Number(row.canceled),
    totalEarned: Number(row.total_earned),
    pendingAmount: Number(row.pending_amount),
    paidAmount: Number(row.paid_amount),
  };
}

export default async function AdminAffiliateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: currentAffiliate } = await supabase
    .from("affiliates")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (!currentAffiliate || currentAffiliate.role !== "admin")
    redirect("/dashboard");

  const { id } = await params;
  const service = await createServiceClient();

  const { data: affiliate } = await service
    .from("affiliates")
    .select("*")
    .eq("id", id)
    .single();

  if (!affiliate) notFound();

  const rawStats = await computeStatsForIds(service, [id]);
  const goLiveAt = affiliate.go_live_at;

  const { count: liveClicks } = await service
    .from("clicks").select("id", { count: "exact", head: true })
    .eq("affiliate_id", id);

  const bPaid = Number(affiliate.baseline_paid ?? 0);
  const bOwed = Number(affiliate.baseline_owed ?? 0);

  const stats = {
    ...rawStats,
    leads: withBaseline(affiliate.baseline_leads ?? 0, rawStats.leads, goLiveAt),
    clicks: withBaselineClicks(affiliate.baseline_clicks ?? 0, liveClicks ?? 0),
    customers: withBaseline(affiliate.baseline_customers ?? 0, rawStats.customers, goLiveAt),
    totalEarned: withBaselineMoney(bPaid + bOwed, rawStats.totalEarned, goLiveAt),
    pendingAmount: withBaselineMoney(bOwed, rawStats.pendingAmount, goLiveAt),
    paidAmount: withBaselineMoney(bPaid, rawStats.paidAmount, goLiveAt),
  };

  let subStats = null;
  let subAffiliatesList: { id: string; name: string; slug: string }[] = [];

  if (affiliate.tier_level === 1) {
    const { data: subAffiliates } = await service
      .from("affiliates")
      .select("id, name, slug")
      .eq("parent_id", id)
      .order("name");

    subAffiliatesList = (subAffiliates ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
    }));

    const subIds = subAffiliatesList.map((s) => s.id);
    if (subIds.length > 0) {
      subStats = await computeStatsForIds(service, subIds);
    }
  }

  return (
    <AffiliateDetailClient
      affiliate={affiliate}
      stats={stats}
      subStats={subStats}
      subAffiliates={subAffiliatesList}
    />
  );
}
