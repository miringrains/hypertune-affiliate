import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("Unhandled API error:", err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function requireAdmin(): Promise<{ id: string; userId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ApiError(401, "Not authenticated");

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (!affiliate || affiliate.role !== "admin")
    throw new ApiError(403, "Admin access required");

  return { id: affiliate.id, userId: user.id };
}

export async function requireAffiliate(): Promise<{
  id: string;
  userId: string;
  tierLevel: number;
  slug: string;
  commissionRate: number;
  subAffiliateRate: number;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ApiError(401, "Not authenticated");

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("id, tier_level, slug, commission_rate, sub_affiliate_rate")
    .eq("user_id", user.id)
    .single();

  if (!affiliate) throw new ApiError(403, "Affiliate account required");

  return {
    id: affiliate.id,
    userId: user.id,
    tierLevel: affiliate.tier_level,
    slug: affiliate.slug,
    commissionRate: affiliate.commission_rate,
    subAffiliateRate: affiliate.sub_affiliate_rate,
  };
}

export async function requireTier1Affiliate() {
  const affiliate = await requireAffiliate();
  if (affiliate.tierLevel !== 1)
    throw new ApiError(403, "Tier 1 affiliates only");
  return affiliate;
}
