import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PayoutsStats } from "./payouts-stats";
import { PayoutsTable } from "./payouts-table";

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

  const [{ data: payouts }, { data: payoutMethods }, { data: commissions }] =
    await Promise.all([
      supabase
        .from("payouts")
        .select("id, amount, status, method, completed_at, created_at")
        .eq("affiliate_id", affiliate.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("payout_methods")
        .select("*")
        .eq("affiliate_id", affiliate.id),
      supabase
        .from("commissions")
        .select("amount, status")
        .eq("affiliate_id", affiliate.id),
    ]);

  const payoutRows = payouts ?? [];
  const methods = payoutMethods ?? [];
  const comms = commissions ?? [];

  const lifetimePaid = payoutRows
    .filter((p) => p.status === "completed")
    .reduce((s, p) => s + Number(p.amount), 0);

  const pendingCommissions = comms
    .filter((c) => c.status === "pending" || c.status === "approved")
    .reduce((s, c) => s + Number(c.amount), 0);

  return (
    <div>
      <h1 className="text-display-sm">Payouts</h1>
      <p className="text-[14px] text-muted-foreground mt-1">
        Your payout methods and payment history.
      </p>

      <PayoutsStats
        lifetimePaid={lifetimePaid}
        pendingEstimate={pendingCommissions}
        totalPayouts={payoutRows.length}
      />

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
        <PayoutsTable payouts={payoutRows} />
      </div>
    </div>
  );
}
