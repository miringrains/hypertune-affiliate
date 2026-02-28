import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin, handleApiError, ApiError } from "@/lib/auth";
import { COMMISSION_RATES } from "@/lib/constants";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const supabase = await createServiceClient();

    const { data: affiliate, error } = await supabase
      .from("affiliates")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !affiliate) {
      throw new ApiError(404, "Affiliate not found");
    }

    const [leadsResult, customersResult, commissionsResult] = await Promise.all(
      [
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("affiliate_id", id),
        supabase
          .from("customers")
          .select("id", { count: "exact", head: true })
          .eq("affiliate_id", id),
        supabase
          .from("commissions")
          .select("amount, status")
          .eq("affiliate_id", id),
      ],
    );

    const commissions = commissionsResult.data ?? [];
    const totalEarned = commissions.reduce((sum, c) => sum + c.amount, 0);
    const pendingAmount = commissions
      .filter((c) => c.status === "pending" || c.status === "approved")
      .reduce((sum, c) => sum + c.amount, 0);
    const paidAmount = commissions
      .filter((c) => c.status === "paid")
      .reduce((sum, c) => sum + c.amount, 0);

    return NextResponse.json({
      affiliate,
      stats: {
        leads: leadsResult.count ?? 0,
        customers: customersResult.count ?? 0,
        totalEarned,
        pendingAmount,
        paidAmount,
      },
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
    const { status, commission_rate, commission_duration_months, sub_affiliate_rate } = body;

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
