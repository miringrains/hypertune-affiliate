import { redirect, notFound } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { AffiliateDetailClient } from "./affiliate-detail-client";

async function computeStatsForIds(
  service: Awaited<ReturnType<typeof createServiceClient>>,
  ids: string[],
) {
  const [clicksResult, leadsResult, customersResult, commissionsResult] =
    await Promise.all([
      service
        .from("clicks")
        .select("id", { count: "exact", head: true })
        .in("affiliate_id", ids),
      service
        .from("leads")
        .select("id", { count: "exact", head: true })
        .in("affiliate_id", ids),
      service
        .from("customers")
        .select("id, current_state, plan_type")
        .in("affiliate_id", ids),
      service
        .from("commissions")
        .select("amount, status")
        .in("affiliate_id", ids),
    ]);

  const customers = customersResult.data ?? [];
  const commissions = commissionsResult.data ?? [];
  const totalEarned = commissions.reduce((sum, c) => sum + c.amount, 0);
  const pendingAmount = commissions
    .filter((c) => c.status === "pending" || c.status === "approved")
    .reduce((sum, c) => sum + c.amount, 0);
  const paidAmount = commissions
    .filter((c) => c.status === "paid")
    .reduce((sum, c) => sum + c.amount, 0);

  const trialing = customers.filter((c) => c.current_state === "trialing").length;
  const activeMonthly = customers.filter((c) => c.current_state === "active_monthly").length;
  const activeAnnual = customers.filter((c) => c.current_state === "active_annual").length;
  const canceled = customers.filter((c) => c.current_state === "canceled").length;

  return {
    clicks: clicksResult.count ?? 0,
    leads: leadsResult.count ?? 0,
    customers: customers.length,
    trialing,
    activeSubs: activeMonthly + activeAnnual,
    activeMonthly,
    activeAnnual,
    canceled,
    totalEarned,
    pendingAmount,
    paidAmount,
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

  const stats = await computeStatsForIds(service, [id]);

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
