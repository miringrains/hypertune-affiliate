import { createClient } from "@/lib/supabase/server";
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

  const { data: subAffiliates } = await supabase
    .from("affiliates")
    .select("id, name, slug, email, status, created_at, commission_rate, tier_level")
    .eq("parent_id", affiliate.id)
    .order("created_at", { ascending: false });

  const subs = subAffiliates ?? [];

  // Get earnings data per sub-affiliate
  let subPerformance: Record<string, { leads: number; customers: number; earned: number }> = {};
  if (subs.length > 0) {
    const subIds = subs.map((s) => s.id);

    const [leadsRes, customersRes, commissionsRes] = await Promise.all([
      supabase.from("leads").select("affiliate_id").in("affiliate_id", subIds),
      supabase.from("customers").select("affiliate_id").in("affiliate_id", subIds),
      supabase
        .from("commissions")
        .select("affiliate_id, amount, status")
        .in("affiliate_id", subIds),
    ]);

    const allLeads = leadsRes.data ?? [];
    const allCustomers = customersRes.data ?? [];
    const allComms = commissionsRes.data ?? [];

    for (const id of subIds) {
      subPerformance[id] = {
        leads: allLeads.filter((l) => l.affiliate_id === id).length,
        customers: allCustomers.filter((c) => c.affiliate_id === id).length,
        earned: allComms
          .filter((c) => c.affiliate_id === id && c.status === "paid")
          .reduce((s, c) => s + Number(c.amount), 0),
      };
    }
  }

  const combinedRevenue = Object.values(subPerformance).reduce((s, p) => s + p.earned, 0);
  const activeCount = subs.filter((s) => s.status === "active").length;

  // Tier 2 commissions earned by this affiliate
  const { data: tier2Comms } = await supabase
    .from("commissions")
    .select("amount, status")
    .eq("affiliate_id", affiliate.id)
    .neq("tier_type", "direct");

  const teamEarnings = (tier2Comms ?? [])
    .filter((c) => c.status === "paid")
    .reduce((s, c) => s + Number(c.amount), 0);

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
