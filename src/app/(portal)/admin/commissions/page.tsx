import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  CommissionsClient,
  type CommissionRow,
} from "./commissions-client";

export default async function AdminCommissionsPage() {
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
  const { data: commissions } = await service
    .from("commissions")
    .select("*, affiliates(name, slug), customers(leads(email))")
    .order("created_at", { ascending: false });

  const rows: CommissionRow[] = (commissions ?? []).map((c) => {
    const cust = c.customers as { leads: { email: string } | null } | null;
    const aff = c.affiliates as { name: string; slug: string } | null;

    return {
      id: c.id,
      affiliateName: aff?.name ?? "—",
      customerEmail: cust?.leads?.email ?? "—",
      amount: c.amount,
      rateSnapshot: c.rate_snapshot,
      tierType: c.tier_type,
      paymentNumber: c.payment_number,
      status: c.status,
      createdAt: c.created_at,
    };
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display-sm">All Commissions</h1>
        <p className="text-[14px] text-zinc-500 mt-1">
          View and manage commissions across all affiliates
        </p>
      </div>

      <CommissionsClient commissions={rows} />
    </div>
  );
}
