import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency } from "@/lib/utils";
import { withBaseline, withBaselineClicks, withBaselineMoney } from "@/lib/baselines";

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
  const [{ data: affiliates }, { data: commTotals }] = await Promise.all([
    service.from("affiliates").select("*"),
    service.rpc("get_commission_totals_by_affiliate"),
  ]);

  const allAffs = affiliates ?? [];
  const allIds = allAffs.filter((a) => a.role !== "admin").map((a) => a.id);

  const { data: perAffStats } = allIds.length > 0
    ? await service.rpc("get_sub_affiliate_stats", { sub_ids: allIds })
    : { data: null };

  const rawStatsMap = new Map<string, { leads: number; customers: number; earned: number }>();
  for (const s of perAffStats ?? []) {
    rawStatsMap.set(s.affiliate_id, {
      leads: Number(s.lead_count),
      customers: Number(s.customer_count),
      earned: Number(s.earned),
    });
  }

  const commMap = new Map<string, number>();
  for (const c of commTotals ?? []) {
    commMap.set(c.affiliate_id, Number(c.total_amount));
  }

  type DisplayRow = typeof allAffs[number] & {
    displayLeads: number;
    displayCustomers: number;
    displayEarned: number;
  };

  const rows: DisplayRow[] = allAffs.map((a) => {
    const raw = rawStatsMap.get(a.id) ?? { leads: 0, customers: 0, earned: 0 };
    const bPaid = Number(a.baseline_paid ?? 0);
    const bOwed = Number(a.baseline_owed ?? 0);
    const goLiveAt = a.go_live_at;

    return {
      ...a,
      displayLeads: withBaseline(a.baseline_leads ?? 0, raw.leads, goLiveAt),
      displayCustomers: withBaseline(a.baseline_customers ?? 0, raw.customers, goLiveAt),
      displayEarned: withBaselineMoney(bPaid + bOwed, raw.earned, goLiveAt),
    };
  });

  const sorted = rows.sort((a, b) => b.displayEarned - a.displayEarned);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display-sm">Affiliates</h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          Manage all affiliates — sorted by top performers
        </p>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Name
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Email
                </th>
                <th className="px-5 py-3 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Leads
                </th>
                <th className="px-5 py-3 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Customers
                </th>
                <th className="px-5 py-3 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Earned
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Rate
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((a) => (
                <tr key={a.id} className="border-b border-border">
                  <td className="px-5 py-3 text-[13px]">
                    <Link
                      href={`/admin/affiliates/${a.id}`}
                      className="text-white hover:text-zinc-300 underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-500 transition-colors"
                    >
                      {a.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-[13px]">{a.email}</td>
                  <td className="px-5 py-3 text-[13px] text-right tabular-nums">
                    {a.displayLeads.toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-[13px] text-right tabular-nums">
                    {a.displayCustomers.toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-[13px] text-right font-medium tabular-nums">
                    {formatCurrency(a.displayEarned)}
                  </td>
                  <td className="px-5 py-3 text-[13px]">
                    {a.commission_rate}%
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sorted.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-[14px] text-muted-foreground">
                No affiliates found.
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
