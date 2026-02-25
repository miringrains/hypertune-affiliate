import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default async function PayoutsPage() {
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

  const [{ data: payouts }, { data: payoutMethods }] = await Promise.all([
    supabase
      .from("payouts")
      .select("*")
      .eq("affiliate_id", affiliate.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("payout_methods")
      .select("*")
      .eq("affiliate_id", affiliate.id),
  ]);

  const payoutRows = payouts ?? [];
  const methods = payoutMethods ?? [];

  return (
    <div>
      <h1 className="text-display-sm">Payouts</h1>
      <p className="text-[14px] text-muted-foreground mt-1">
        Your payout methods and payment history.
      </p>

      {/* Payout Methods */}
      <div className="mt-6">
        <h2 className="text-[14px] font-semibold mb-3">Payout Methods</h2>
        <Card>
          <CardContent className="p-5">
            {methods.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">
                No payout method configured.
              </p>
            ) : (
              <div className="space-y-3">
                {methods.map((method) => (
                  <div
                    key={method.id}
                    className="flex items-center gap-3 text-[13px]"
                  >
                    <span className="capitalize font-medium">
                      {method.method_type.replace(/_/g, " ")}
                    </span>
                    {method.is_primary && (
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      >
                        Primary
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payout History */}
      <div className="mt-6">
        <h2 className="text-[14px] font-semibold mb-3">Payout History</h2>
        <Card>
          <div className="overflow-x-auto">
            {payoutRows.length === 0 ? (
              <div className="px-5 py-12 text-center text-[13px] text-muted-foreground">
                No payouts yet.
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Completed
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payoutRows.map((payout) => (
                    <tr key={payout.id} className="border-b border-border">
                      <td className="px-5 py-3 text-[13px] font-medium">
                        {formatCurrency(Number(payout.amount))}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={payout.status ?? "unknown"} />
                      </td>
                      <td className="px-5 py-3 text-[13px] capitalize">
                        {payout.method ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-[12px] text-muted-foreground">
                        {payout.completed_at
                          ? new Date(payout.completed_at).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
