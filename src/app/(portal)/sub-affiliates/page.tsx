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
    .select("id, name, slug, email, status, created_at, commission_rate, tier_level")
    .eq("parent_id", affiliate.id)
    .order("created_at", { ascending: false });

  return (
    <SubAffiliatesClient
      affiliate={affiliate}
      subAffiliates={subAffiliates ?? []}
    />
  );
}
