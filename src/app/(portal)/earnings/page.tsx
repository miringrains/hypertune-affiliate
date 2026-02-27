import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EarningsClient } from "./earnings-client";

export default async function EarningsPage() {
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
  const sixMonthsAgo = new Date(now.getTime() - 180 * 86_400_000).toISOString();

  const [commissionsRes, allCommissionsRes, payoutsRes, payoutMethodsRes] = await Promise.all([
    supabase
      .from("commissions")
      .select("id, amount, rate_snapshot, status, tier_type, created_at, customers(leads(email))")
      .eq("affiliate_id", affiliate.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("commissions")
      .select("amount, status, created_at, tier_type")
      .eq("affiliate_id", affiliate.id)
      .gte("created_at", sixMonthsAgo),
    supabase
      .from("payouts")
      .select("id, amount, status, method, completed_at, created_at")
      .eq("affiliate_id", affiliate.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("payout_methods")
      .select("*")
      .eq("affiliate_id", affiliate.id),
  ]);

  const commissions = commissionsRes.data ?? [];
  const allComms = allCommissionsRes.data ?? [];
  const payouts = payoutsRes.data ?? [];
  const methods = payoutMethodsRes.data ?? [];

  const lifetimeEarned = commissions
    .filter((c) => c.status === "paid")
    .reduce((s, c) => s + Number(c.amount), 0);

  const pendingAmount = commissions
    .filter((c) => c.status === "pending" || c.status === "approved")
    .reduce((s, c) => s + Number(c.amount), 0);

  const lastPayout = payouts.find((p) => p.status === "completed");

  // Build monthly earnings (6 months, split by tier type)
  const monthlyEarnings: { month: string; direct: number; tier2: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthlyEarnings.push({
      month: d.toLocaleDateString("en-US", { month: "short" }),
      direct: 0,
      tier2: 0,
    });
  }
  for (const c of allComms) {
    const d = new Date(c.created_at);
    const monthsAgo =
      (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    if (monthsAgo >= 0 && monthsAgo < 6) {
      const idx = 5 - monthsAgo;
      const amount = Number(c.amount);
      if (c.tier_type === "direct") {
        monthlyEarnings[idx].direct += amount;
      } else {
        monthlyEarnings[idx].tier2 += amount;
      }
    }
  }

  // Pipeline counts
  const pipelinePending = commissions.filter((c) => c.status === "pending").reduce((s, c) => s + Number(c.amount), 0);
  const pipelineApproved = commissions.filter((c) => c.status === "approved").reduce((s, c) => s + Number(c.amount), 0);
  const pipelinePaid = lifetimeEarned;

  return (
    <EarningsClient
      hero={{
        lifetimeEarned,
        pending: pendingAmount,
        lastPayout: lastPayout
          ? { amount: Number(lastPayout.amount), date: lastPayout.completed_at ?? lastPayout.created_at }
          : null,
      }}
      pipeline={{ pending: pipelinePending, approved: pipelineApproved, paid: pipelinePaid }}
      monthlyEarnings={monthlyEarnings}
      hasTier2={allComms.some((c) => c.tier_type !== "direct")}
      commissions={commissions.map((c) => ({
        id: c.id,
        amount: Number(c.amount),
        rate: c.rate_snapshot,
        status: c.status,
        tier_type: c.tier_type,
        created_at: c.created_at,
        email:
          (c.customers as unknown as { leads: { email: string } | null })?.leads?.email ?? "—",
      }))}
      payouts={payouts.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        status: p.status,
        method: p.method,
        completed_at: p.completed_at,
        created_at: p.created_at,
      }))}
      payoutMethods={methods.map((m) => ({
        id: m.id,
        type: m.method_type,
        isPrimary: m.is_primary,
      }))}
    />
  );
}
