import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/types";
import { sendCommissionEarnedEmail } from "./email";

type ServiceClient = SupabaseClient<Database>;
type CommissionTierType = Database["public"]["Enums"]["commission_tier_type"];

interface CommissionInput {
  customerId: string;
  affiliateId: string;
  invoiceId: string;
  paymentAmount: number;
  paymentNumber: number;
  planType: "monthly" | "annual";
}

export async function calculateAndInsertCommissions(
  supabase: ServiceClient,
  input: CommissionInput,
) {
  const { customerId, affiliateId, invoiceId, paymentAmount, paymentNumber, planType } = input;

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("id, commission_rate, commission_duration_months, parent_id")
    .eq("id", affiliateId)
    .single();

  if (!affiliate) return;

  const maxPayments = planType === "annual" ? 1 : affiliate.commission_duration_months;
  if (paymentNumber > maxPayments) return;

  const commissions: Database["public"]["Tables"]["commissions"]["Insert"][] = [];

  const directAmount = Math.round(paymentAmount * (affiliate.commission_rate / 100) * 100) / 100;
  commissions.push({
    affiliate_id: affiliate.id,
    customer_id: customerId,
    stripe_invoice_id: invoiceId,
    amount: directAmount,
    rate_snapshot: affiliate.commission_rate,
    payment_number: paymentNumber,
    tier_type: "direct",
  });

  let currentParentId = affiliate.parent_id;
  let tierDepth = 1;

  while (currentParentId && tierDepth < 3) {
    const { data: parent } = await supabase
      .from("affiliates")
      .select("id, sub_affiliate_rate, parent_id, commission_duration_months")
      .eq("id", currentParentId)
      .single();

    if (!parent) break;

    const parentMaxPayments = planType === "annual" ? 1 : parent.commission_duration_months;
    if (paymentNumber <= parentMaxPayments) {
      const tierAmount = Math.round(paymentAmount * (parent.sub_affiliate_rate / 100) * 100) / 100;
      const tierType: CommissionTierType = tierDepth === 1 ? "tier2" : "tier3";

      commissions.push({
        affiliate_id: parent.id,
        customer_id: customerId,
        stripe_invoice_id: invoiceId,
        amount: tierAmount,
        rate_snapshot: parent.sub_affiliate_rate,
        payment_number: paymentNumber,
        tier_type: tierType,
      });
    }

    currentParentId = parent.parent_id;
    tierDepth++;
  }

  if (commissions.length > 0) {
    await supabase.from("commissions").insert(commissions);

    // Look up the customer email for notification context
    const { data: customer } = await supabase
      .from("customers")
      .select("leads(email)")
      .eq("id", customerId)
      .single();
    const custEmail = (customer?.leads as unknown as { email: string } | null)?.email ?? "a customer";

    // Notify each affiliate who earned a commission (fire-and-forget)
    const notifiedIds = new Set<string>();
    for (const c of commissions) {
      if (notifiedIds.has(c.affiliate_id)) continue;
      notifiedIds.add(c.affiliate_id);

      const { data: aff } = await supabase
        .from("affiliates")
        .select("email, name")
        .eq("id", c.affiliate_id)
        .single();

      if (aff) {
        const totalForAffiliate = commissions
          .filter((x) => x.affiliate_id === c.affiliate_id)
          .reduce((s, x) => s + Number(x.amount), 0);
        sendCommissionEarnedEmail(aff.email, aff.name, totalForAffiliate, custEmail).catch(() => {});
      }
    }
  }

  return commissions;
}

export async function voidCommissionsForInvoice(
  supabase: ServiceClient,
  stripeInvoiceId: string,
) {
  await supabase
    .from("commissions")
    .update({ status: "voided" as const })
    .eq("stripe_invoice_id", stripeInvoiceId)
    .eq("status", "pending" as const);
}
