import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin, handleApiError, ApiError } from "@/lib/auth";
import { sendPayoutProcessedEmail } from "@/lib/email";
import { sendPaypalPayout, type PayoutItem } from "@/lib/paypal";

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

async function loadPaypalCredentials(supabase: Awaited<ReturnType<typeof createServiceClient>>) {
  const { data } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["paypal_client_id", "paypal_client_secret", "paypal_mode"]);

  const map = new Map((data ?? []).map((s) => [s.key, String(s.value)]));
  const clientId = map.get("paypal_client_id");
  const clientSecret = map.get("paypal_client_secret");
  const mode = map.get("paypal_mode") ?? "sandbox";

  if (!clientId || !clientSecret) return null;

  process.env.PAYPAL_CLIENT_ID = clientId;
  process.env.PAYPAL_CLIENT_SECRET = clientSecret;
  process.env.PAYPAL_MODE = mode;

  return { clientId, clientSecret, mode };
}

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
      const { data: payoutRows } = await supabase
        .from("payouts")
        .select("id, affiliate_id, amount")
        .in("id", ids)
        .eq("status", asStatus("approved"));

      if (!payoutRows?.length) {
        return NextResponse.json({ updated: 0, paypal: false });
      }

      const affiliateIds = [...new Set(payoutRows.map((p) => p.affiliate_id))];
      const { data: affiliates } = await supabase
        .from("affiliates")
        .select("id, name, email")
        .in("id", affiliateIds);
      const affMap = new Map((affiliates ?? []).map((a) => [a.id, a]));

      const { data: allMethods } = await supabase
        .from("payout_methods")
        .select("affiliate_id, details")
        .in("affiliate_id", affiliateIds)
        .eq("method_type", "paypal")
        .eq("is_primary", true);
      const methodMap = new Map((allMethods ?? []).map((m) => [m.affiliate_id, m]));

      const creds = await loadPaypalCredentials(supabase);
      const paypalItems: PayoutItem[] = [];
      const manualIds: string[] = [];

      for (const p of payoutRows) {
        const method = methodMap.get(p.affiliate_id);
        const aff = affMap.get(p.affiliate_id);
        const email = (method?.details as Record<string, string> | null)?.email;

        if (creds && email && aff) {
          paypalItems.push({
            recipientEmail: email,
            amount: Number(p.amount),
            payoutId: p.id,
            affiliateName: aff.name,
          });
        } else {
          manualIds.push(p.id);
        }
      }

      let paypalResult = null;

      if (paypalItems.length > 0) {
        try {
          paypalResult = await sendPaypalPayout(paypalItems);
        } catch (e) {
          throw new ApiError(
            502,
            `PayPal payout failed: ${e instanceof Error ? e.message : "Unknown error"}`,
          );
        }
      }

      const now = new Date().toISOString();
      const paidIds = paypalItems.map((i) => i.payoutId);
      const allPaidIds = [...paidIds, ...manualIds];

      if (allPaidIds.length > 0) {
        const { count, error } = await supabase
          .from("payouts")
          .update({ status: "completed", completed_at: now })
          .in("id", allPaidIds);
        if (error) throw new ApiError(500, error.message);
        updated = count ?? 0;

        const { error: commErr } = await supabase
          .from("commissions")
          .update({ status: "paid", paid_at: now })
          .in("payout_id", allPaidIds);
        if (commErr) throw new ApiError(500, commErr.message);

        for (const p of payoutRows.filter((r) => allPaidIds.includes(r.id))) {
          const aff = affMap.get(p.affiliate_id);
          if (aff) {
            sendPayoutProcessedEmail(aff.email, aff.name, Number(p.amount)).catch(() => {});
          }
        }
      }

      return NextResponse.json({
        updated,
        paypal: !!paypalResult,
        paypalBatchId: paypalResult?.batchId ?? null,
        manualCount: manualIds.length,
      });
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
