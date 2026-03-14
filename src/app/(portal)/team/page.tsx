import { createClient, createServiceClient, fetchAllPaginated } from "@/lib/supabase/server";
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

  // Use service client to bypass RLS for cross-affiliate queries
  const svc = await createServiceClient();

  const { data: subAffiliates } = await svc
    .from("affiliates")
    .select("id, name, slug, email, status, created_at, commission_rate, tier_level")
    .eq("parent_id", affiliate.id)
    .order("created_at", { ascending: false });

  const subs = subAffiliates ?? [];

  let subPerformance: Record<string, { leads: number; customers: number; earned: number }> = {};
  if (subs.length > 0) {
    const subIds = subs.map((s) => s.id);

    const [allLeads, allCustomers, allComms] = await Promise.all([
      fetchAllPaginated<{ affiliate_id: string }>((from, to) =>
        svc.from("leads").select("affiliate_id").in("affiliate_id", subIds).range(from, to),
      ),
      fetchAllPaginated<{ affiliate_id: string }>((from, to) =>
        svc.from("customers").select("affiliate_id").in("affiliate_id", subIds).range(from, to),
      ),
      fetchAllPaginated<{ affiliate_id: string; amount: number; status: string }>((from, to) =>
        svc
          .from("commissions")
          .select("affiliate_id, amount, status")
          .in("affiliate_id", subIds)
          .range(from, to),
      ),
    ]);

    for (const id of subIds) {
      subPerformance[id] = {
        leads: allLeads.filter((l) => l.affiliate_id === id).length,
        customers: allCustomers.filter((c) => c.affiliate_id === id).length,
        earned: allComms
          .filter((c) => c.affiliate_id === id && c.status !== "voided")
          .reduce((s, c) => s + Number(c.amount), 0),
      };
    }
  }

  const combinedRevenue = Object.values(subPerformance).reduce((s, p) => s + p.earned, 0);
  const activeCount = subs.filter((s) => s.status === "active").length;

  // Tier 2 commissions earned by this affiliate (all-time, paginated)
  const tier2Comms = await fetchAllPaginated<{ amount: number; status: string }>((from, to) =>
    svc
      .from("commissions")
      .select("amount, status")
      .eq("affiliate_id", affiliate.id)
      .neq("tier_type", "direct")
      .range(from, to),
  );

  const teamEarnings = tier2Comms
    .filter((c) => c.status !== "voided")
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
