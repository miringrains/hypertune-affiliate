import { redirect, notFound } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { AffiliateDetailClient } from "./affiliate-detail-client";

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

  const [
    clicksResult,
    leadsResult,
    customersResult,
    commissionsResult,
  ] = await Promise.all([
    service
      .from("clicks")
      .select("id", { count: "exact", head: true })
      .eq("affiliate_id", id),
    service
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("affiliate_id", id),
    service
      .from("customers")
      .select("id, current_state, plan_type")
      .eq("affiliate_id", id),
    service
      .from("commissions")
      .select("amount, status")
      .eq("affiliate_id", id),
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
  const activeSubs = activeMonthly + activeAnnual;
  const canceled = customers.filter((c) => c.current_state === "canceled").length;

  const monthlyMrr = activeMonthly * (affiliate.commission_rate / 100);
  const annualMrr = activeAnnual * (affiliate.commission_rate / 100);
  const mrr = monthlyMrr + annualMrr;

  return (
    <AffiliateDetailClient
      affiliate={affiliate}
      stats={{
        clicks: clicksResult.count ?? 0,
        leads: leadsResult.count ?? 0,
        customers: customers.length,
        trialing,
        activeSubs,
        activeMonthly,
        activeAnnual,
        canceled,
        totalEarned,
        pendingAmount,
        paidAmount,
        mrr,
      }}
    />
  );
}
