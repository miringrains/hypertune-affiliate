import { createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { getUser, getAffiliate } from "@/lib/session";
import { EarningsClient } from "./earnings-client";
import { withBaselineMoney } from "@/lib/baselines";

export default async function EarningsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const affiliate = await getAffiliate();
  if (!affiliate) redirect("/login");

  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 180 * 86_400_000).toISOString();

  const svc = await createServiceClient();

  const loadEarnings = unstable_cache(
    async (affId: string, since6m: string) => {
      const svcInner = await createServiceClient();
      const [
        { data: summaryRows },
        { data: monthlyRows },
        { data: recentComms },
      ] = await Promise.all([
        svcInner.rpc("get_earnings_summary", { p_affiliate_id: affId }),
        svcInner.rpc("get_earnings_by_month", { p_affiliate_id: affId, p_since: since6m }),
        svcInner.rpc("get_recent_commissions", { p_affiliate_id: affId, p_limit: 200 }),
      ]);
      return { summaryRows, monthlyRows, recentComms };
    },
    [`earnings-${affiliate.id}`],
    { revalidate: 60 },
  );

  const [{ summaryRows, monthlyRows, recentComms }, payoutsRes, payoutMethodsRes] =
    await Promise.all([
      loadEarnings(affiliate.id, sixMonthsAgo),
      svc
        .from("payouts")
        .select("id, amount, status, method, completed_at, created_at")
        .eq("affiliate_id", affiliate.id)
        .order("created_at", { ascending: false }),
      svc
        .from("payout_methods")
        .select("*")
        .eq("affiliate_id", affiliate.id),
    ]);

  const s = summaryRows?.[0];
  const bPaid = Number(affiliate.baseline_paid ?? 0);
  const bOwed = Number(affiliate.baseline_owed ?? 0);
  const dbPaid = Number(s?.lifetime_earned ?? 0);
  const dbPending = Number(s?.pending_amount ?? 0);
  const dbApproved = Number(s?.approved_amount ?? 0);

  const paidAmount = withBaselineMoney(bPaid, dbPaid);
  const owedAmount = withBaselineMoney(bOwed, dbPending + dbApproved);

  const lifetimeEarned = paidAmount + owedAmount;
  const hasTier2 = s?.has_tier2 ?? false;

  const payouts = payoutsRes.data ?? [];
  const methods = payoutMethodsRes.data ?? [];
  const lastPayout = payouts.find((p) => p.status === "completed");

  // Build monthly earnings chart (6 months)
  const monthlyEarnings: { month: string; direct: number; tier2: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthlyEarnings.push({
      month: d.toLocaleDateString("en-US", { month: "short" }),
      direct: 0,
      tier2: 0,
    });
  }
  for (const r of monthlyRows ?? []) {
    const d = new Date(r.month_start);
    const monthsAgo =
      (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    if (monthsAgo >= 0 && monthsAgo < 6) {
      const idx = 5 - monthsAgo;
      monthlyEarnings[idx].direct = Number(r.direct_amount);
      monthlyEarnings[idx].tier2 = Number(r.tier2_amount);
    }
  }

  return (
    <EarningsClient
      hero={{
        lifetimeEarned,
        pending: owedAmount,
        lastPayout: lastPayout
          ? { amount: Number(lastPayout.amount), date: lastPayout.completed_at ?? lastPayout.created_at }
          : null,
      }}
      pipeline={{ owed: owedAmount, paid: paidAmount }}
      monthlyEarnings={monthlyEarnings}
      hasTier2={hasTier2}
      commissions={(recentComms ?? []).map((c) => ({
        id: c.id,
        amount: Number(c.amount),
        rate: Number(c.rate_snapshot),
        status: c.status,
        tier_type: c.tier_type,
        created_at: c.created_at,
        email: c.lead_email || "—",
        source: c.source_affiliate ?? undefined,
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
