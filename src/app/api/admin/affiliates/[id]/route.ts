import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin, handleApiError, ApiError } from "@/lib/auth";
import { COMMISSION_RATES } from "@/lib/constants";

async function computeStats(
  supabase: ReturnType<typeof createServiceClient> extends Promise<infer T> ? T : never,
  affiliateIds: string[],
  from?: string,
) {
  let clicksQuery = supabase
    .from("clicks")
    .select("id", { count: "exact", head: true })
    .in("affiliate_id", affiliateIds);
  let leadsQuery = supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .in("affiliate_id", affiliateIds);
  let customersQuery = supabase
    .from("customers")
    .select("id, current_state, plan_type, created_at")
    .in("affiliate_id", affiliateIds);
  let commissionsQuery = supabase
    .from("commissions")
    .select("amount, status, created_at")
    .in("affiliate_id", affiliateIds);

  if (from) {
    clicksQuery = clicksQuery.gte("clicked_at", from);
    leadsQuery = leadsQuery.gte("created_at", from);
    customersQuery = customersQuery.gte("created_at", from);
    commissionsQuery = commissionsQuery.gte("created_at", from);
  }

  const [clicksResult, leadsResult, customersResult, commissionsResult] =
    await Promise.all([clicksQuery, leadsQuery, customersQuery, commissionsQuery]);

  const customers = customersResult.data ?? [];
  const commissions = commissionsResult.data ?? [];
  const totalEarned = commissions.reduce((sum, c) => sum + c.amount, 0);
  const pendingAmount = commissions
    .filter((c) => c.status === "pending" || c.status === "approved")
    .reduce((sum, c) => sum + c.amount, 0);
  const paidAmount = commissions
    .filter((c) => c.status === "paid")
    .reduce((sum, c) => sum + c.amount, 0);

  const trialing = customers.filter((c) => c.current_state === "trialing").length;
  const activeMonthly = customers.filter((c) => c.current_state === "active_monthly").length;
  const activeAnnual = customers.filter((c) => c.current_state === "active_annual").length;
  const canceled = customers.filter((c) => c.current_state === "canceled").length;

  return {
    clicks: clicksResult.count ?? 0,
    leads: leadsResult.count ?? 0,
    customers: customers.length,
    trialing,
    activeSubs: activeMonthly + activeAnnual,
    activeMonthly,
    activeAnnual,
    canceled,
    totalEarned,
    pendingAmount,
    paidAmount,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const { searchParams } = request.nextUrl;
    const days = searchParams.get("days");

    const supabase = await createServiceClient();

    const { data: affiliate, error } = await supabase
      .from("affiliates")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !affiliate) {
      throw new ApiError(404, "Affiliate not found");
    }

    let from: string | undefined;
    if (days && days !== "all") {
      const d = new Date();
      d.setDate(d.getDate() - Number(days));
      from = d.toISOString();
    }

    const directStats = await computeStats(supabase, [id], from);

    // For Tier 1 affiliates, also compute sub-affiliate stats
    let subStats = null;
    if (affiliate.tier_level === 1) {
      const { data: subAffiliates } = await supabase
        .from("affiliates")
        .select("id")
        .eq("parent_id", id);

      const subIds = (subAffiliates ?? []).map((s) => s.id);
      if (subIds.length > 0) {
        subStats = await computeStats(supabase, subIds, from);
      }
    }

    return NextResponse.json({
      affiliate,
      stats: directStats,
      subStats,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const {
      status,
      commission_rate,
      commission_duration_months,
      sub_affiliate_rate,
      sub_affiliate_duration_months,
    } = body;

    const updates: Record<string, unknown> = {};

    if (status !== undefined) {
      if (status !== "active" && status !== "inactive") {
        throw new ApiError(400, "Status must be 'active' or 'inactive'");
      }
      updates.status = status;
    }

    if (commission_rate !== undefined) {
      if (!COMMISSION_RATES.includes(commission_rate)) {
        throw new ApiError(
          400,
          `Commission rate must be one of: ${COMMISSION_RATES.join(", ")}`,
        );
      }
      updates.commission_rate = commission_rate;
    }

    if (commission_duration_months !== undefined) {
      if (
        !Number.isInteger(commission_duration_months) ||
        commission_duration_months < 1 ||
        commission_duration_months > 36
      ) {
        throw new ApiError(
          400,
          "Commission duration must be an integer between 1 and 36",
        );
      }
      updates.commission_duration_months = commission_duration_months;
    }

    if (sub_affiliate_rate !== undefined) {
      if (
        typeof sub_affiliate_rate !== "number" ||
        sub_affiliate_rate < 0 ||
        sub_affiliate_rate > 50
      ) {
        throw new ApiError(400, "Sub-affiliate rate must be between 0 and 50");
      }
      updates.sub_affiliate_rate = sub_affiliate_rate;
    }

    if (sub_affiliate_duration_months !== undefined) {
      if (
        !Number.isInteger(sub_affiliate_duration_months) ||
        sub_affiliate_duration_months < 1 ||
        sub_affiliate_duration_months > 36
      ) {
        throw new ApiError(
          400,
          "Sub-affiliate override duration must be an integer between 1 and 36",
        );
      }
      updates.sub_affiliate_duration_months = sub_affiliate_duration_months;
    }

    if (Object.keys(updates).length === 0) {
      throw new ApiError(400, "No valid fields to update");
    }

    updates.updated_at = new Date().toISOString();

    const supabase = await createServiceClient();
    const { data: affiliate, error } = await supabase
      .from("affiliates")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(affiliate);
  } catch (err) {
    return handleApiError(err);
  }
}
