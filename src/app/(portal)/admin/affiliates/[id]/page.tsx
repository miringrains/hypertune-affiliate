import { redirect, notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getUser, getAffiliate } from "@/lib/session";
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
  const user = await getUser();
  if (!user) redirect("/login");

  const currentAffiliate = await getAffiliate();
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

  const [rawStats, { count: liveClicks }] = await Promise.all([
    computeStatsForIds(service, [id]),
    service.from("clicks").select("id", { count: "exact", head: true }).eq("affiliate_id", id),
  ]);

  const bPaid = Number(affiliate.baseline_paid ?? 0);
  const bOwed = Number(affiliate.baseline_owed ?? 0);

  const stats = {
    ...rawStats,
    leads: withBaseline(affiliate.baseline_leads ?? 0, rawStats.leads),
    clicks: withBaselineClicks(affiliate.baseline_clicks ?? 0, liveClicks ?? 0),
    customers: withBaseline(affiliate.baseline_customers ?? 0, rawStats.customers),
    totalEarned: withBaselineMoney(bPaid + bOwed, rawStats.totalEarned),
    pendingAmount: withBaselineMoney(bOwed, rawStats.pendingAmount),
    paidAmount: withBaselineMoney(bPaid, rawStats.paidAmount),
  };

  let subStats = null;
  let subAffiliatesList: { id: string; name: string; slug: string }[] = [];

  if (affiliate.tier_level <= 2) {
    const { data: subAffiliates } = await service
      .from("affiliates")
      .select("id, name, slug, baseline_leads, baseline_customers, baseline_clicks, baseline_paid, baseline_owed")
      .eq("parent_id", id)
      .order("name");

    const subs = subAffiliates ?? [];
    subAffiliatesList = subs.map((s) => ({ id: s.id, name: s.name, slug: s.slug }));

    const subIds = subs.map((s) => s.id);
    if (subIds.length > 0) {
      const [{ data: perSubRaw }, rawAggregate, { count: subLiveClicks }] = await Promise.all([
        service.rpc("get_sub_affiliate_stats", { sub_ids: subIds }),
        computeStatsForIds(service, subIds),
        service.from("clicks").select("id", { count: "exact", head: true }).in("affiliate_id", subIds),
      ]);

      let adjLeads = 0, adjCustomers = 0, adjEarned = 0, totalBaseClicks = 0;
      let sumBlPaid = 0, sumBlOwed = 0;
      for (const sub of subs) {
        const raw = (perSubRaw ?? []).find((r) => r.affiliate_id === sub.id);
        const dbLeads = Number(raw?.lead_count ?? 0);
        const dbCustomers = Number(raw?.customer_count ?? 0);
        const dbEarned = Number(raw?.earned ?? 0);
        const sBlPaid = Number(sub.baseline_paid ?? 0);
        const sBlOwed = Number(sub.baseline_owed ?? 0);

        adjLeads += withBaseline(sub.baseline_leads ?? 0, dbLeads);
        adjCustomers += withBaseline(sub.baseline_customers ?? 0, dbCustomers);
        adjEarned += withBaselineMoney(sBlPaid + sBlOwed, dbEarned);
        totalBaseClicks += sub.baseline_clicks ?? 0;
        sumBlPaid += sBlPaid;
        sumBlOwed += sBlOwed;
      }

      subStats = {
        clicks: totalBaseClicks + (subLiveClicks ?? 0),
        leads: adjLeads,
        customers: adjCustomers,
        trialing: rawAggregate.trialing,
        activeSubs: rawAggregate.activeSubs,
        activeMonthly: rawAggregate.activeMonthly,
        activeAnnual: rawAggregate.activeAnnual,
        canceled: rawAggregate.canceled,
        totalEarned: adjEarned,
        pendingAmount: withBaselineMoney(sumBlOwed, rawAggregate.pendingAmount),
        paidAmount: withBaselineMoney(sumBlPaid, rawAggregate.paidAmount),
      };
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
