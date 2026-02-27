import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CommissionsStats } from "./commissions-stats";
import { CommissionsTable } from "./commissions-table";

export default async function CommissionsPage() {
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

  const { data: commissions } = await supabase
    .from("commissions")
    .select("id, amount, rate_snapshot, status, created_at, customers(leads(email))")
    .eq("affiliate_id", affiliate.id)
    .order("created_at", { ascending: false });

  const rows = commissions ?? [];

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const totalEarned = rows
    .filter((c) => c.status === "paid")
    .reduce((s, c) => s + Number(c.amount), 0);

  const totalPending = rows
    .filter((c) => c.status === "pending" || c.status === "approved")
    .reduce((s, c) => s + Number(c.amount), 0);

  const thisMonthAmount = rows
    .filter((c) => new Date(c.created_at) >= startOfMonth)
    .reduce((s, c) => s + Number(c.amount), 0);

  const monthlySparkline = (() => {
    const buckets = new Array(6).fill(0);
    for (const c of rows) {
      const d = new Date(c.created_at);
      const monthsAgo =
        (now.getFullYear() - d.getFullYear()) * 12 +
        (now.getMonth() - d.getMonth());
      if (monthsAgo >= 0 && monthsAgo < 6)
        buckets[5 - monthsAgo] += Number(c.amount);
    }
    return buckets;
  })();

  return (
    <div>
      <h1 className="text-display-sm">Commissions</h1>
      <p className="text-[14px] text-muted-foreground mt-1">
        Commissions earned from your referred customers.
      </p>

      <CommissionsStats
        earned={totalEarned}
        pending={totalPending}
        thisMonth={thisMonthAmount}
        sparkline={monthlySparkline}
      />

      <CommissionsTable commissions={rows} />
    </div>
  );
}
