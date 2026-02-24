import { NextResponse, type NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import {
  calculateAndInsertCommissions,
  voidCommissionsForInvoice,
} from "@/lib/commissions";
import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

type ServiceClient = SupabaseClient<Database>;
type CustomerEventType = Database["public"]["Enums"]["customer_event_type"];
type CustomerState = Database["public"]["Enums"]["customer_state"];

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed";
    return NextResponse.json(
      { error: `Webhook verification failed: ${message}` },
      { status: 400 },
    );
  }

  const supabase = await createServiceClient();

  try {
    switch (event.type) {
      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(supabase, event.data.object);
        break;
      case "customer.subscription.created":
        await handleSubscriptionCreated(supabase, event.data.object);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(supabase, event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(supabase, event.data.object);
        break;
      case "charge.refunded":
        await handleChargeRefunded(supabase, event.data.object);
        break;
      case "charge.dispute.created":
        await handleDisputeCreated(supabase, event.data.object);
        break;
    }
  } catch (err) {
    console.error(`Webhook handler error for ${event.type}:`, err);
  }

  return NextResponse.json({ received: true });
}

function getStringId(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

async function handlePaymentSucceeded(supabase: ServiceClient, invoice: Stripe.Invoice) {
  const stripeCustomerId = getStringId(invoice.customer);
  if (!stripeCustomerId) return;

  const { data: lead } = await supabase
    .from("leads")
    .select("id, affiliate_id")
    .eq("stripe_customer_id", stripeCustomerId)
    .single();

  if (!lead) return;

  let { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("stripe_customer_id", stripeCustomerId)
    .single();

  const subscriptionId = getStringId(
    (invoice as unknown as Record<string, unknown>).subscription as string | { id: string } | null,
  );

  const lineItem = invoice.lines?.data?.[0];
  const priceObj = (lineItem as unknown as Record<string, unknown>)?.price as
    | { recurring?: { interval?: string } }
    | null;
  const isAnnual = priceObj?.recurring?.interval === "year";
  const planType = isAnnual ? "annual" : "monthly";

  if (!customer) {
    const newState: CustomerState = isAnnual ? "active_annual" : "active_monthly";

    const { data: newCustomer } = await supabase
      .from("customers")
      .insert({
        affiliate_id: lead.affiliate_id,
        lead_id: lead.id,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: subscriptionId,
        current_state: newState,
        plan_type: planType as Database["public"]["Enums"]["plan_type"],
        payment_count: 1,
        first_payment_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    customer = newCustomer;

    if (customer) {
      await logEvent(supabase, customer.id, "first_payment", {
        invoice_id: invoice.id,
        amount: (invoice.amount_paid ?? 0) / 100,
      });
    }
  } else {
    const newCount = customer.payment_count + 1;
    const newState: CustomerState = isAnnual ? "active_annual" : "active_monthly";

    await supabase
      .from("customers")
      .update({
        payment_count: newCount,
        current_state: newState,
        plan_type: planType as Database["public"]["Enums"]["plan_type"],
        stripe_subscription_id: subscriptionId,
      })
      .eq("id", customer.id);

    const eventType: CustomerEventType = newCount === 1 ? "first_payment" : "recurring_payment";
    await logEvent(supabase, customer.id, eventType, {
      invoice_id: invoice.id,
      amount: (invoice.amount_paid ?? 0) / 100,
      payment_number: newCount,
    });

    customer = { ...customer, payment_count: newCount };
  }

  if (customer) {
    await calculateAndInsertCommissions(supabase, {
      customerId: customer.id,
      affiliateId: lead.affiliate_id,
      invoiceId: invoice.id!,
      paymentAmount: (invoice.amount_paid ?? 0) / 100,
      paymentNumber: customer.payment_count,
      planType: planType as "monthly" | "annual",
    });
  }
}

async function handleSubscriptionCreated(supabase: ServiceClient, sub: Stripe.Subscription) {
  const stripeCustomerId = getStringId(sub.customer);
  if (!stripeCustomerId) return;

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("stripe_customer_id", stripeCustomerId)
    .single();

  if (!customer) return;

  if (sub.status === "trialing") {
    await supabase
      .from("customers")
      .update({ current_state: "trialing" as CustomerState })
      .eq("id", customer.id);

    await logEvent(supabase, customer.id, "trial_started", {
      trial_end: sub.trial_end,
    });
  }
}

async function handleSubscriptionUpdated(supabase: ServiceClient, sub: Stripe.Subscription) {
  const stripeCustomerId = getStringId(sub.customer);
  if (!stripeCustomerId) return;

  const { data: customer } = await supabase
    .from("customers")
    .select("id, current_state")
    .eq("stripe_customer_id", stripeCustomerId)
    .single();

  if (!customer) return;

  if (sub.status === "active" && customer.current_state === "canceled") {
    const isAnnual = sub.items.data[0]?.price?.recurring?.interval === "year";
    const newState: CustomerState = isAnnual ? "active_annual" : "active_monthly";

    await supabase
      .from("customers")
      .update({ current_state: newState, canceled_at: null, payment_count: 0 })
      .eq("id", customer.id);

    await logEvent(supabase, customer.id, "resubscribed", {
      subscription_id: sub.id,
    });
  }
}

async function handleSubscriptionDeleted(supabase: ServiceClient, sub: Stripe.Subscription) {
  const stripeCustomerId = getStringId(sub.customer);
  if (!stripeCustomerId) return;

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("stripe_customer_id", stripeCustomerId)
    .single();

  if (!customer) return;

  await supabase
    .from("customers")
    .update({ current_state: "canceled" as CustomerState, canceled_at: new Date().toISOString() })
    .eq("id", customer.id);

  await logEvent(supabase, customer.id, "canceled", {
    subscription_id: sub.id,
    reason: sub.cancellation_details?.reason,
  });
}

async function handleChargeRefunded(supabase: ServiceClient, charge: Stripe.Charge) {
  const invoiceId = getStringId(
    (charge as unknown as Record<string, unknown>).invoice as string | { id: string } | null,
  );
  if (!invoiceId) return;
  await voidCommissionsForInvoice(supabase, invoiceId);
}

async function handleDisputeCreated(supabase: ServiceClient, dispute: Stripe.Dispute) {
  const chargeId = getStringId(dispute.charge as string | { id: string } | null);
  if (!chargeId) return;

  const charge = await stripe.charges.retrieve(chargeId);
  const invoiceId = getStringId(
    (charge as unknown as Record<string, unknown>).invoice as string | { id: string } | null,
  );
  if (!invoiceId) return;
  await voidCommissionsForInvoice(supabase, invoiceId);
}

async function logEvent(
  supabase: ServiceClient,
  customerId: string,
  eventType: CustomerEventType,
  metadata: Record<string, unknown>,
) {
  await supabase.from("customer_events").insert({
    customer_id: customerId,
    event_type: eventType,
    metadata: metadata as Database["public"]["Tables"]["customer_events"]["Insert"]["metadata"],
  });
}
