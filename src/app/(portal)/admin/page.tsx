import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency } from "@/lib/utils";

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
  const [{ data: affiliates }, { data: allCommissions }] = await Promise.all([
    service.from("affiliates").select("*"),
    service.from("commissions").select("affiliate_id, amount"),
  ]);

  const revenueByAffiliate = new Map<string, number>();
  for (const c of allCommissions ?? []) {
    revenueByAffiliate.set(
      c.affiliate_id,
      (revenueByAffiliate.get(c.affiliate_id) ?? 0) + c.amount,
    );
  }

  const sorted = (affiliates ?? []).sort((a, b) => {
    const revA = revenueByAffiliate.get(a.id) ?? 0;
    const revB = revenueByAffiliate.get(b.id) ?? 0;
    return revB - revA;
  });

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
                <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-5 py-3 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Tier
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Rate
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Role
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
                  <td className="px-5 py-3 text-[12px] text-muted-foreground font-mono">
                    {a.slug}
                  </td>
                  <td className="px-5 py-3 text-[13px] text-right font-medium">
                    {formatCurrency(revenueByAffiliate.get(a.id) ?? 0)}
                  </td>
                  <td className="px-5 py-3 text-[13px]">{a.tier_level}</td>
                  <td className="px-5 py-3 text-[13px]">
                    {a.commission_rate}%
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-5 py-3 text-[13px] capitalize">
                    {a.role}
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
