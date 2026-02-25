import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardClient } from "./dashboard-client";

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
    now.getTime() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  if (affiliate.role === "admin") {
    const service = await createServiceClient();
    const [
      affiliatesRes,
      clicksRes,
      leadsRes,
      customersRes,
      commissionsRes,
      recentAffiliatesRes,
    ] = await Promise.all([
      service
        .from("affiliates")
        .select("id", { count: "exact", head: true })
        .neq("role", "admin"),
      service
        .from("clicks")
        .select("id", { count: "exact", head: true })
        .gte("clicked_at", thirtyDaysAgo),
      service.from("leads").select("id", { count: "exact", head: true }),
      service.from("customers").select("id", { count: "exact", head: true }),
      service.from("commissions").select("amount, status"),
      service
        .from("affiliates")
        .select("id, name, slug, tier_level, commission_rate, created_at")
        .neq("role", "admin")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const allCommissions = commissionsRes.data ?? [];
    const totalRevenue = allCommissions.reduce(
      (sum, c) => sum + Number(c.amount),
      0
    );
    const pendingCommissions = allCommissions
      .filter((c) => c.status === "pending" || c.status === "approved")
      .reduce((sum, c) => sum + Number(c.amount), 0);

    return (
      <DashboardClient
        affiliate={affiliate}
        stats={{
          clicks: clicksRes.count ?? 0,
          leads: leadsRes.count ?? 0,
          customers: customersRes.count ?? 0,
          earned: totalRevenue,
          pending: pendingCommissions,
        }}
        adminData={{
          totalAffiliates: affiliatesRes.count ?? 0,
          recentAffiliates: recentAffiliatesRes.data ?? [],
        }}
      />
    );
  }

  const ownQueries = Promise.all([
    supabase
      .from("clicks")
      .select("id", { count: "exact", head: true })
      .eq("affiliate_id", affiliate.id)
      .gte("clicked_at", thirtyDaysAgo),
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
      .select("amount, status")
      .eq("affiliate_id", affiliate.id),
  ]);

  const [clicksRes, leadsRes, customersRes, commissionsRes] =
    await ownQueries;

  const commissions = commissionsRes.data ?? [];
  const totalEarned = commissions
    .filter((c) => c.status === "paid")
    .reduce((sum, c) => sum + Number(c.amount), 0);
  const totalPending = commissions
    .filter((c) => c.status === "pending" || c.status === "approved")
    .reduce((sum, c) => sum + Number(c.amount), 0);

  const baseStats = {
    clicks: clicksRes.count ?? 0,
    leads: leadsRes.count ?? 0,
    customers: customersRes.count ?? 0,
    earned: totalEarned,
    pending: totalPending,
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
      })
    );

    return (
      <DashboardClient
        affiliate={affiliate}
        stats={baseStats}
        subAffiliateData={subStats}
      />
    );
  }

  return <DashboardClient affiliate={affiliate} stats={baseStats} />;
}
