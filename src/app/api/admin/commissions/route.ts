import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin, handleApiError, ApiError } from "@/lib/auth";
import { sendCommissionApprovedEmail } from "@/lib/email";

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { ids, action } = body;

    if (!["approve", "void"].includes(action)) {
      throw new ApiError(400, "Action must be 'approve' or 'void'");
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      throw new ApiError(400, "ids must be a non-empty array");
    }

    const supabase = await createServiceClient();
    const newStatus = action === "approve" ? "approved" : "voided";

    const { data, error } = await supabase
      .from("commissions")
      .update({ status: newStatus })
      .in("id", ids)
      .eq("status", "pending")
      .select("id, affiliate_id, amount");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const updated = data?.length ?? 0;

    // Send approval notifications grouped by affiliate
    if (action === "approve" && updated > 0) {
      const byAffiliate = new Map<string, { total: number; count: number }>();
      for (const c of data ?? []) {
        const entry = byAffiliate.get(c.affiliate_id) ?? { total: 0, count: 0 };
        entry.total += Number(c.amount);
        entry.count += 1;
        byAffiliate.set(c.affiliate_id, entry);
      }

      for (const [affiliateId, { total, count }] of byAffiliate) {
        const { data: aff } = await supabase
          .from("affiliates")
          .select("email, name")
          .eq("id", affiliateId)
          .single();

        if (aff) {
          sendCommissionApprovedEmail(aff.email, aff.name, total, count).catch(() => {});
        }
      }
    }

    return NextResponse.json({ updated });
  } catch (err) {
    return handleApiError(err);
  }
}
