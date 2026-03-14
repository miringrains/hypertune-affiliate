import { redirect } from "next/navigation";
import { createClient, createServiceClient, fetchAllPaginated } from "@/lib/supabase/server";
import { AuditClient, type AffiliateAuditRow } from "./audit-client";

export default async function AdminAuditPage() {
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

  const [affiliates, allCommissions, allPayouts, allCustomers] = await Promise.all([
    fetchAllPaginated((from, to) =>
      service
        .from("affiliates")
        .select("id, name, slug, email, tier_level, commission_rate, sub_affiliate_rate, status")
        .neq("role", "admin")
        .range(from, to),
    ),
    fetchAllPaginated((from, to) =>
      service
        .from("commissions")
        .select("affiliate_id, amount, status, tier_type")
        .range(from, to),
    ),
    fetchAllPaginated((from, to) =>
      service.from("payouts").select("affiliate_id, amount, status").range(from, to),
    ),
    fetchAllPaginated((from, to) =>
      service
        .from("customers")
        .select("affiliate_id, current_state, plan_type")
        .range(from, to),
    ),
  ]);

  type CommAgg = {
    total: number;
    paid: number;
    approved: number;
    pending: number;
    voided: number;
    count: number;
    directCount: number;
    tier2Count: number;
  };
  const commByAff = new Map<string, CommAgg>();
  for (const c of allCommissions) {
    const aid = c.affiliate_id;
    if (!commByAff.has(aid)) {
      commByAff.set(aid, { total: 0, paid: 0, approved: 0, pending: 0, voided: 0, count: 0, directCount: 0, tier2Count: 0 });
    }
    const agg = commByAff.get(aid)!;
    const amt = Number(c.amount);
    agg.count++;
    if (c.status !== "voided") agg.total += amt;
    if (c.status === "paid") agg.paid += amt;
    if (c.status === "approved") agg.approved += amt;
    if (c.status === "pending") agg.pending += amt;
    if (c.status === "voided") agg.voided += amt;
    if (c.tier_type === "direct") agg.directCount++;
    else agg.tier2Count++;
  }

  const payoutByAff = new Map<string, number>();
  for (const p of allPayouts) {
    if (p.status === "completed") {
      payoutByAff.set(p.affiliate_id, (payoutByAff.get(p.affiliate_id) ?? 0) + Number(p.amount));
    }
  }

  type CustAgg = { active: number; trialing: number; churned: number; total: number };
  const custByAff = new Map<string, CustAgg>();
  for (const c of allCustomers) {
    const aid = c.affiliate_id;
    if (!custByAff.has(aid)) custByAff.set(aid, { active: 0, trialing: 0, churned: 0, total: 0 });
    const agg = custByAff.get(aid)!;
    agg.total++;
    if (c.current_state === "active_monthly" || c.current_state === "active_annual") agg.active++;
    else if (c.current_state === "trialing") agg.trialing++;
    else if (c.current_state === "canceled" || c.current_state === "dormant") agg.churned++;
  }

  const rows: AffiliateAuditRow[] = affiliates.map((a) => {
    const comm = commByAff.get(a.id) ?? { total: 0, paid: 0, approved: 0, pending: 0, voided: 0, count: 0, directCount: 0, tier2Count: 0 };
    const paidOut = payoutByAff.get(a.id) ?? 0;
    const cust = custByAff.get(a.id) ?? { active: 0, trialing: 0, churned: 0, total: 0 };
    const churnRate = cust.active + cust.churned > 0
      ? cust.churned / (cust.active + cust.churned)
      : 0;

    return {
      id: a.id,
      name: a.name ?? a.slug,
      slug: a.slug,
      email: a.email,
      tierLevel: a.tier_level,
      commissionRate: a.commission_rate,
      status: a.status,
      commTotal: comm.total,
      commPaid: comm.paid,
      commApproved: comm.approved,
      commPending: comm.pending,
      commVoided: comm.voided,
      commCount: comm.count,
      directCount: comm.directCount,
      tier2Count: comm.tier2Count,
      paidOut,
      delta: Math.round((comm.paid - paidOut) * 100) / 100,
      custTotal: cust.total,
      custActive: cust.active,
      custTrialing: cust.trialing,
      custChurned: cust.churned,
      churnRate,
    };
  });

  const totals = {
    commTotal: rows.reduce((s, r) => s + r.commTotal, 0),
    commPaid: rows.reduce((s, r) => s + r.commPaid, 0),
    commApproved: rows.reduce((s, r) => s + r.commApproved, 0),
    paidOut: rows.reduce((s, r) => s + r.paidOut, 0),
    custTotal: rows.reduce((s, r) => s + r.custTotal, 0),
    custActive: rows.reduce((s, r) => s + r.custActive, 0),
    custTrialing: rows.reduce((s, r) => s + r.custTrialing, 0),
    custChurned: rows.reduce((s, r) => s + r.custChurned, 0),
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display-sm">Audit</h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          Per-affiliate breakdown of commissions, payouts, and customer states for accuracy spot-checks
        </p>
      </div>
      <AuditClient rows={rows} totals={totals} />
    </div>
  );
}
