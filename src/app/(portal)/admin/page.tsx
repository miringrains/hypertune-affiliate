import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { withBaseline, withBaselineClicks, withBaselineMoney } from "@/lib/baselines";
import { AdminAffiliatesClient } from "./admin-affiliates-client";

export default async function AdminAffiliatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (!affiliate || affiliate.role !== "admin") redirect("/dashboard");

  const service = await createServiceClient();

  const { data: affiliates } = await service
    .from("affiliates")
    .select("*")
    .neq("role", "admin");

  const allAffs = affiliates ?? [];
  const affIds = allAffs.map((a) => a.id);

  const { data: perAffStats } = affIds.length > 0
    ? await service.rpc("get_sub_affiliate_stats", { sub_ids: affIds })
    : { data: null };

  const parentNameMap = new Map<string, string>();
  for (const a of allAffs) {
    parentNameMap.set(a.id, a.name);
  }

  const statsMap = new Map<string, { leads: number; customers: number; earned: number }>();
  for (const s of perAffStats ?? []) {
    statsMap.set(s.affiliate_id, {
      leads: Number(s.lead_count),
      customers: Number(s.customer_count),
      earned: Number(s.earned),
    });
  }

  const clickCountMap = new Map<string, number>();
  if (affIds.length > 0) {
    const { data: clickRows } = await service.rpc("count_clicks_by_affiliate", { aff_ids: affIds });
    for (const r of clickRows ?? []) {
      clickCountMap.set(r.affiliate_id, Number(r.click_count));
    }
  }

  const rows = allAffs.map((a) => {
    const raw = statsMap.get(a.id) ?? { leads: 0, customers: 0, earned: 0 };
    const bPaid = Number(a.baseline_paid ?? 0);
    const bOwed = Number(a.baseline_owed ?? 0);
    const liveClicks = clickCountMap.get(a.id) ?? 0;

    return {
      id: a.id,
      name: a.name,
      email: a.email,
      slug: a.slug,
      status: a.status,
      tier_level: a.tier_level,
      commission_rate: a.commission_rate,
      parent_name: a.parent_id ? (parentNameMap.get(a.parent_id) ?? null) : null,
      clicks: withBaselineClicks(a.baseline_clicks ?? 0, liveClicks),
      leads: withBaseline(a.baseline_leads ?? 0, raw.leads),
      customers: withBaseline(a.baseline_customers ?? 0, raw.customers),
      earned: withBaselineMoney(bPaid + bOwed, raw.earned),
    };
  });

  const summary = {
    totalAffiliates: rows.length,
    totalClicks: rows.reduce((s, r) => s + r.clicks, 0),
    totalCustomers: rows.reduce((s, r) => s + r.customers, 0),
    totalEarned: rows.reduce((s, r) => s + r.earned, 0),
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display-sm">Affiliates</h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          Manage all affiliates — sorted by top performers
        </p>
      </div>

      <AdminAffiliatesClient rows={rows} summary={summary} />
    </div>
  );
}
