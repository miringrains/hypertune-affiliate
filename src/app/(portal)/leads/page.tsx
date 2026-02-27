import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LeadsStats } from "./leads-stats";
import { LeadsTable } from "./leads-table";

export default async function LeadsPage() {
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

  const isTier1 = affiliate.tier_level === 1 && affiliate.role !== "admin";

  let subIdMap: Record<string, string> = {};

  if (isTier1) {
    const { data: subs } = await supabase
      .from("affiliates")
      .select("id, name")
      .eq("parent_id", affiliate.id);

    if (subs) {
      subIdMap[affiliate.id] = "You";
      for (const s of subs) {
        subIdMap[s.id] = s.name;
      }
    }
  }

  const query = supabase
    .from("leads")
    .select("id, email, affiliate_id, stripe_customer_id, created_at")
    .order("created_at", { ascending: false });

  if (!isTier1) {
    query.eq("affiliate_id", affiliate.id);
  }

  const { data: leads } = await query;
  const rows = (leads ?? []).filter((l) =>
    isTier1
      ? l.affiliate_id === affiliate.id || subIdMap[l.affiliate_id]
      : true,
  );

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const twelveWeeksAgo = new Date(now.getTime() - 84 * 86_400_000);

  const thisMonthCount = rows.filter(
    (l) => new Date(l.created_at) >= startOfMonth,
  ).length;

  const weeklySparkline = (() => {
    const buckets = new Array(12).fill(0);
    for (const l of rows) {
      const d = new Date(l.created_at);
      if (d < twelveWeeksAgo) continue;
      const weeksAgo = Math.floor(
        (now.getTime() - d.getTime()) / (7 * 86_400_000),
      );
      if (weeksAgo >= 0 && weeksAgo < 12) buckets[11 - weeksAgo]++;
    }
    return buckets;
  })();

  return (
    <div>
      <h1 className="text-display-sm">Leads</h1>
      <p className="text-[14px] text-muted-foreground mt-1">
        {isTier1
          ? "Leads from your referral link and your sub-affiliates."
          : "People who signed up through your referral link."}
      </p>

      <LeadsStats
        total={rows.length}
        thisMonth={thisMonthCount}
        sparkline={weeklySparkline}
      />

      <LeadsTable
        leads={rows}
        affiliateId={affiliate.id}
        isTier1={isTier1}
        subIdMap={subIdMap}
      />
    </div>
  );
}
