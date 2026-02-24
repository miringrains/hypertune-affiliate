import { createClient } from "@/lib/supabase/server";
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
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [clicksRes, leadsRes, customersRes, commissionsRes] = await Promise.all([
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

  const totalClicks = clicksRes.count ?? 0;
  const totalLeads = leadsRes.count ?? 0;
  const totalCustomers = customersRes.count ?? 0;

  const commissions = commissionsRes.data ?? [];
  const totalEarned = commissions
    .filter((c) => c.status === "paid")
    .reduce((sum, c) => sum + Number(c.amount), 0);
  const totalPending = commissions
    .filter((c) => c.status === "pending" || c.status === "approved")
    .reduce((sum, c) => sum + Number(c.amount), 0);

  return (
    <DashboardClient
      affiliate={affiliate}
      stats={{
        clicks: totalClicks,
        leads: totalLeads,
        customers: totalCustomers,
        earned: totalEarned,
        pending: totalPending,
      }}
    />
  );
}
