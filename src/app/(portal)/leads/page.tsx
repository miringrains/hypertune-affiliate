import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { LeadsStats } from "./leads-stats";

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
    .select("*")
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

      <Card className="mt-6">
        <div className="overflow-x-auto">
          {rows.length === 0 ? (
            <div className="px-5 py-12 text-center text-[13px] text-muted-foreground">
              No leads yet. Share your referral link to start generating leads.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Email
                  </th>
                  {isTier1 && (
                    <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Source
                    </th>
                  )}
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Signed Up
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((lead) => (
                  <tr key={lead.id} className="border-b border-border">
                    <td className="px-5 py-3 text-[13px]">{lead.email}</td>
                    {isTier1 && (
                      <td className="px-5 py-3 text-[12px] text-muted-foreground">
                        {lead.affiliate_id === affiliate.id
                          ? "You"
                          : subIdMap[lead.affiliate_id] ?? "—"}
                      </td>
                    )}
                    <td className="px-5 py-3">
                      {lead.stripe_customer_id ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-500">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          Converted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                          <span className="size-1.5 rounded-full bg-muted-foreground/50" />
                          Lead
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-[12px] text-muted-foreground">
                      {new Date(lead.created_at).toLocaleDateString()}
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
