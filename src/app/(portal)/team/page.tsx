import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TeamClient } from "./team-client";

export default async function TeamPage() {
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

  if (affiliate.tier_level !== 1) {
    return (
      <div className="space-y-4">
        <h1 className="text-display-sm">Team</h1>
        <p className="text-[14px] text-muted-foreground">
          Only Tier 1 affiliates can recruit sub-affiliates. Your current tier
          level is {affiliate.tier_level}.
        </p>
      </div>
    );
  }

  const svc = await createServiceClient();

  const { data: subAffiliates } = await svc
    .from("affiliates")
    .select("id, name, slug, email, status, created_at, commission_rate, tier_level, baseline_leads")
    .eq("parent_id", affiliate.id)
    .order("created_at", { ascending: false });

  const subs = subAffiliates ?? [];

  let subPerformance: Record<string, { leads: number; customers: number; earned: number }> = {};
  let combinedRevenue = 0;
  let teamEarnings = 0;

  if (subs.length > 0) {
    const subIds = subs.map((s) => s.id);

    const [{ data: statsRows }, { data: tier2Row }] = await Promise.all([
      svc.rpc("get_sub_affiliate_stats", { sub_ids: subIds }),
      svc.rpc("get_tier2_earnings", { aff_id: affiliate.id }),
    ]);

    const baselineBySubId = new Map(subs.map((s) => [s.id, s.baseline_leads ?? 0]));
    for (const row of statsRows ?? []) {
      const dbLeads = Number(row.lead_count);
      const bl = baselineBySubId.get(row.affiliate_id) ?? 0;
      subPerformance[row.affiliate_id] = {
        leads: bl > 0 ? bl : dbLeads,
        customers: Number(row.customer_count),
        earned: Number(row.earned),
      };
    }

    combinedRevenue = Object.values(subPerformance).reduce((s, p) => s + p.earned, 0);
    teamEarnings = Number(tier2Row ?? 0);
  }

  const activeCount = subs.filter((s) => s.status === "active").length;

  return (
    <TeamClient
      affiliate={affiliate}
      summary={{
        recruited: subs.length,
        active: activeCount,
        combinedRevenue,
        teamEarnings,
      }}
      members={subs.map((s) => ({
        ...s,
        leads: subPerformance[s.id]?.leads ?? 0,
        customers: subPerformance[s.id]?.customers ?? 0,
        earned: subPerformance[s.id]?.earned ?? 0,
      }))}
    />
  );
}
