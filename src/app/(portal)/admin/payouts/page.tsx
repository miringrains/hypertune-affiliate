import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { PayoutsClient } from "./payouts-client";

export default async function AdminPayoutsPage() {
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
  const { data: payouts } = await service
    .from("payouts")
    .select("*, affiliates(name, email)")
    .order("created_at", { ascending: false });

  const mapped = (payouts ?? []).map((p) => {
    const aff = p.affiliates as { name: string; email: string } | null;
    return {
      id: p.id,
      affiliateName: aff?.name ?? "—",
      affiliateEmail: aff?.email ?? "—",
      amount: Number(p.amount),
      status: p.status,
      method: p.method ?? null,
      createdAt: p.created_at,
      completedAt: p.completed_at ?? null,
    };
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display-sm">Payouts</h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          Process and track affiliate payouts
        </p>
      </div>

      <PayoutsClient payouts={mapped} />
    </div>
  );
}
