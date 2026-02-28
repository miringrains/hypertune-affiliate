import { redirect, notFound } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { AffiliateDetailClient } from "./affiliate-detail-client";

export default async function AdminAffiliateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: currentAffiliate } = await supabase
    .from("affiliates")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (!currentAffiliate || currentAffiliate.role !== "admin")
    redirect("/dashboard");

  const { id } = await params;
  const service = await createServiceClient();

  const { data: affiliate } = await service
    .from("affiliates")
    .select("*")
    .eq("id", id)
    .single();

  if (!affiliate) notFound();

  const [leadsResult, customersResult, commissionsResult] = await Promise.all([
    service
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("affiliate_id", id),
    service
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("affiliate_id", id),
    service
      .from("commissions")
      .select("amount, status")
      .eq("affiliate_id", id),
  ]);

  const commissions = commissionsResult.data ?? [];
  const totalEarned = commissions.reduce((sum, c) => sum + c.amount, 0);
  const pendingAmount = commissions
    .filter((c) => c.status === "pending" || c.status === "approved")
    .reduce((sum, c) => sum + c.amount, 0);
  const paidAmount = commissions
    .filter((c) => c.status === "paid")
    .reduce((sum, c) => sum + c.amount, 0);

  return (
    <AffiliateDetailClient
      affiliate={affiliate}
      stats={{
        leads: leadsResult.count ?? 0,
        customers: customersResult.count ?? 0,
        totalEarned,
        pendingAmount,
        paidAmount,
      }}
    />
  );
}
