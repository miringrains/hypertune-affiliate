import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getUser, getAffiliate } from "@/lib/session";
import {
  CommissionsClient,
  type CommissionRow,
} from "./commissions-client";

const PAGE_SIZE = 50;

export default async function AdminCommissionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const user = await getUser();
  if (!user) redirect("/login");

  const affiliate = await getAffiliate();
  if (!affiliate || affiliate.role !== "admin") redirect("/dashboard");

  const service = await createServiceClient();

  const statusFilter = (params.status as string) || "all";
  const page = Math.max(1, parseInt((params.page as string) || "1", 10));

  const countQueries = await Promise.all([
    service.from("commissions").select("id", { count: "exact", head: true }),
    service.from("commissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
    service.from("commissions").select("id", { count: "exact", head: true }).eq("status", "approved"),
    service.from("commissions").select("id", { count: "exact", head: true }).eq("status", "paid"),
    service.from("commissions").select("id", { count: "exact", head: true }).eq("status", "voided"),
  ]);

  const counts = {
    all: countQueries[0].count ?? 0,
    pending: countQueries[1].count ?? 0,
    approved: countQueries[2].count ?? 0,
    paid: countQueries[3].count ?? 0,
    voided: countQueries[4].count ?? 0,
  };

  const activeCount = statusFilter === "all" ? counts.all : (counts[statusFilter as keyof typeof counts] ?? 0);
  const totalPages = Math.max(1, Math.ceil(activeCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const from = (safePage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = service
    .from("commissions")
    .select("*, affiliates(name, slug), customers(leads(email, name))")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter as "pending" | "approved" | "paid" | "voided");
  }

  const { data: commissions } = await query;

  const rows: CommissionRow[] = (commissions ?? []).map((c) => {
    const cust = c.customers as { leads: { email: string; name: string } | null } | null;
    const aff = c.affiliates as { name: string; slug: string } | null;

    return {
      id: c.id,
      affiliateName: aff?.name ?? "—",
      customerEmail: cust?.leads?.name || cust?.leads?.email || "—",
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
        <p className="text-[14px] text-muted-foreground mt-1">
          View and manage commissions across all affiliates
        </p>
      </div>

      <CommissionsClient
        commissions={rows}
        counts={counts}
        currentStatus={statusFilter}
        currentPage={safePage}
        totalPages={totalPages}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
