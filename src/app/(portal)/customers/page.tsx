import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";

export default async function CustomersPage() {
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

  const { data: customers } = await supabase
    .from("customers")
    .select("*, leads(email)")
    .eq("affiliate_id", affiliate.id)
    .order("created_at", { ascending: false });

  const rows = customers ?? [];

  return (
    <div>
      <h1 className="text-display-sm">Customers</h1>
      <p className="text-[14px] text-muted-foreground mt-1">
        Leads that converted into paying customers.
      </p>

      <Card className="mt-6">
        <div className="overflow-x-auto">
          {rows.length === 0 ? (
            <div className="px-5 py-12 text-center text-[13px] text-muted-foreground">
              No customers yet.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    State
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Plan Type
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Payment Count
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    First Payment
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((customer) => (
                  <tr key={customer.id} className="border-b border-border">
                    <td className="px-5 py-3 text-[13px]">
                      {customer.leads?.email ?? "—"}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={customer.current_state ?? "unknown"} />
                    </td>
                    <td className="px-5 py-3 text-[13px]">
                      {customer.plan_type ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-[13px]">
                      {customer.payment_count ?? 0}
                    </td>
                    <td className="px-5 py-3 text-[12px] text-muted-foreground">
                      {customer.first_payment_at
                        ? new Date(customer.first_payment_at).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-[12px] text-muted-foreground">
                      {new Date(customer.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
