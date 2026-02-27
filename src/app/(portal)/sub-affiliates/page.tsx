import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SubAffiliatesClient } from "./sub-affiliates-client";

export default async function SubAffiliatesPage() {
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

  if (affiliate.tier_level !== 1) {
    return (
      <div className="space-y-4">
        <h1 className="text-display-sm">Sub-Affiliates</h1>
        <p className="text-[14px] text-muted-foreground">
          Only Tier 1 affiliates can recruit sub-affiliates. Your current tier
          level is {affiliate.tier_level}.
        </p>
      </div>
    );
  }

  const { data: subAffiliates } = await supabase
    .from("affiliates")
    .select(
      "id, name, slug, email, status, created_at, commission_rate, tier_level",
    )
    .eq("parent_id", affiliate.id)
    .order("created_at", { ascending: false });

  const subs = subAffiliates ?? [];

  let combinedRevenue = 0;
  let topPerformer = "";
  let topRevenue = 0;

  if (subs.length > 0) {
    const subIds = subs.map((s) => s.id);
    const { data: subComms } = await supabase
      .from("commissions")
      .select("affiliate_id, amount, status")
      .in("affiliate_id", subIds);

    const comms = subComms ?? [];
    const revenueByAffiliate: Record<string, number> = {};

    for (const c of comms) {
      if (c.status === "paid") {
        const amt = Number(c.amount);
        combinedRevenue += amt;
        revenueByAffiliate[c.affiliate_id] =
          (revenueByAffiliate[c.affiliate_id] ?? 0) + amt;
      }
    }

    for (const [affId, rev] of Object.entries(revenueByAffiliate)) {
      if (rev > topRevenue) {
        topRevenue = rev;
        const sub = subs.find((s) => s.id === affId);
        topPerformer = sub?.name ?? "";
      }
    }
  }

  return (
    <SubAffiliatesClient
      affiliate={affiliate}
      subAffiliates={subs}
      summaryStats={{
        recruited: subs.length,
        combinedRevenue,
        topPerformer: topPerformer || null,
        topRevenue,
      }}
    />
  );
}
