import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin, handleApiError, ApiError } from "@/lib/auth";

// The generated types only know "processing" | "completed" — the migration
// adds "pending", "approved", "denied". Cast until types are regenerated.
type PayoutStatus = "pending" | "approved" | "denied" | "processing" | "completed";
const asStatus = (s: PayoutStatus) => s as "processing" | "completed";

export async function POST() {
  try {
    await requireAdmin();
    const supabase = await createServiceClient();

    const { data: commissions, error: fetchErr } = await supabase
      .from("commissions")
      .select("id, affiliate_id, amount")
      .eq("status", "approved")
      .is("payout_id", null);

    if (fetchErr) throw new ApiError(500, fetchErr.message);

    const grouped = new Map<string, { ids: string[]; total: number }>();
    for (const c of commissions ?? []) {
      const entry = grouped.get(c.affiliate_id) ?? { ids: [], total: 0 };
      entry.ids.push(c.id);
      entry.total += Number(c.amount);
      grouped.set(c.affiliate_id, entry);
    }

    let generated = 0;

    for (const [affiliateId, { ids, total }] of grouped) {
      const { data: payout, error: insertErr } = await supabase
        .from("payouts")
        .insert({
          affiliate_id: affiliateId,
          amount: total,
          status: asStatus("pending"),
        })
        .select("id")
        .single();

      if (insertErr) throw new ApiError(500, insertErr.message);

      const { error: linkErr } = await supabase
        .from("commissions")
        .update({ payout_id: payout.id })
        .in("id", ids);

      if (linkErr) throw new ApiError(500, linkErr.message);

      generated++;
    }

    return NextResponse.json({ generated });
  } catch (err) {
    return handleApiError(err);
  }
}

const VALID_ACTIONS = ["approve", "deny", "pay", "revert"] as const;
type Action = (typeof VALID_ACTIONS)[number];

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = await createServiceClient();

    const body = await request.json();
    const { ids, action } = body as { ids: string[]; action: Action };

    if (!ids?.length) throw new ApiError(400, "Missing payout ids");
    if (!VALID_ACTIONS.includes(action))
      throw new ApiError(400, `Invalid action: ${action}`);

    let updated = 0;

    if (action === "approve") {
      const { count, error } = await supabase
        .from("payouts")
        .update({ status: asStatus("approved") })
        .in("id", ids)
        .eq("status", asStatus("pending"));
      if (error) throw new ApiError(500, error.message);
      updated = count ?? 0;
    } else if (action === "deny") {
      const { count, error } = await supabase
        .from("payouts")
        .update({ status: asStatus("denied") })
        .in("id", ids)
        .eq("status", asStatus("pending"));
      if (error) throw new ApiError(500, error.message);
      updated = count ?? 0;
    } else if (action === "pay") {
      const now = new Date().toISOString();

      const { count, error } = await supabase
        .from("payouts")
        .update({ status: "completed", completed_at: now })
        .in("id", ids)
        .eq("status", asStatus("approved"));
      if (error) throw new ApiError(500, error.message);
      updated = count ?? 0;

      if (updated > 0) {
        const { error: commErr } = await supabase
          .from("commissions")
          .update({ status: "paid", paid_at: now })
          .in("payout_id", ids);
        if (commErr) throw new ApiError(500, commErr.message);
      }
    } else if (action === "revert") {
      const { count: c1, error: e1 } = await supabase
        .from("payouts")
        .update({ status: asStatus("pending") })
        .in("id", ids)
        .eq("status", asStatus("denied"));
      if (e1) throw new ApiError(500, e1.message);

      const { count: c2, error: e2 } = await supabase
        .from("payouts")
        .update({ status: asStatus("pending") })
        .in("id", ids)
        .eq("status", asStatus("approved"));
      if (e2) throw new ApiError(500, e2.message);

      updated = (c1 ?? 0) + (c2 ?? 0);
    }

    return NextResponse.json({ updated });
  } catch (err) {
    return handleApiError(err);
  }
}
