import { NextResponse, type NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import {
  calculateAndInsertCommissions,
  voidCommissionsForInvoice,
} from "@/lib/commissions";
import { STRIPE_PRICE_IDS } from "@/lib/constants";
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
      case "checkout.session.completed":
        await handleCheckoutCompleted(supabase, event.data.object);
        break;
      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(supabase, event.data.object);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(supabase, event.data.object);
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStringId(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function resolvePlanType(priceId: string | null | undefined, interval: string | null | undefined): "monthly" | "annual" {
  if (priceId === STRIPE_PRICE_IDS.yearly) return "annual";
  if (priceId === STRIPE_PRICE_IDS.monthly) return "monthly";
  if (interval === "year") return "annual";
  return "monthly";
}

function extractPriceId(sub: Stripe.Subscription): string | null {
  const item = sub.items?.data?.[0];
  return item?.price?.id ?? null;
}

async function findOrCreateLead(
  supabase: ServiceClient,
  affiliateId: string,
  email: string,
  stripeCustomerId: string | null,
) {
  const { data: existingLead } = await supabase
    .from("leads")
    .select("id, affiliate_id")
    .eq("email", email)
    .eq("affiliate_id", affiliateId)
    .single();

  if (existingLead) {
    if (stripeCustomerId) {
      await supabase
        .from("leads")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", existingLead.id);
    }
    return existingLead;
  }

  const { data: newLead } = await supabase
    .from("leads")
    .insert({
      affiliate_id: affiliateId,
      email,
      stripe_customer_id: stripeCustomerId,
    })
    .select("id, affiliate_id")
    .single();

  return newLead;
}

async function resolveAffiliateBySlug(supabase: ServiceClient, slug: string) {
  const { data } = await supabase
    .from("affiliates")
    .select("id")
    .eq("slug", slug)
    .eq("status", "active")
    .single();
  return data;
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

// ---------------------------------------------------------------------------
// checkout.session.completed — attribution bridge
// ---------------------------------------------------------------------------

async function handleCheckoutCompleted(
  supabase: ServiceClient,
  session: Stripe.Checkout.Session,
) {
  const amId = session.metadata?.am_id;
  if (!amId) return;

  const affiliate = await resolveAffiliateBySlug(supabase, amId);
  if (!affiliate) return;

  const email = session.customer_details?.email;
  if (!email) return;

  const stripeCustomerId = getStringId(session.customer);
  const stripeSubscriptionId = getStringId(
    (session as unknown as Record<string, unknown>).subscription as string | { id: string } | null,
  );

  const lead = await findOrCreateLead(supabase, affiliate.id, email, stripeCustomerId);
  if (!lead) return;

  if (!stripeCustomerId) return;

  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("id")
    .eq("stripe_customer_id", stripeCustomerId)
    .single();

  if (existingCustomer) return;

  let initialState: CustomerState = "signed_up";
  let eventType: CustomerEventType = "account_created";

  if (stripeSubscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      const priceId = extractPriceId(sub);
      const planType = resolvePlanType(priceId, sub.items?.data?.[0]?.price?.recurring?.interval);

      if (sub.status === "trialing") {
        initialState = "trialing";
        eventType = "trial_started";
      } else if (sub.status === "active") {
        initialState = planType === "annual" ? "active_annual" : "active_monthly";
        eventType = "first_payment";
      }
    } catch {
      // If we can't fetch the subscription, default to signed_up
    }
  }

  const { data: customer } = await supabase
    .from("customers")
    .insert({
      affiliate_id: affiliate.id,
      lead_id: lead.id,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      current_state: initialState,
      payment_count: 0,
    })
    .select("id")
    .single();

  if (customer) {
    await logEvent(supabase, customer.id, eventType, {
      checkout_session_id: session.id,
      subscription_id: stripeSubscriptionId,
    });
  }
}

// ---------------------------------------------------------------------------
// invoice.payment_succeeded
// ---------------------------------------------------------------------------

async function handlePaymentSucceeded(supabase: ServiceClient, invoice: Stripe.Invoice) {
  const amountPaid = invoice.amount_paid ?? 0;

  // Skip $0 trial invoices — no commission, no customer update needed
  if (amountPaid === 0) return;

  const stripeCustomerId = getStringId(invoice.customer);
  if (!stripeCustomerId) return;

  // Idempotency: check if commissions already exist for this invoice
  const { data: existingCommissions } = await supabase
    .from("commissions")
    .select("id")
    .eq("stripe_invoice_id", invoice.id)
    .limit(1);

  if (existingCommissions && existingCommissions.length > 0) return;

  // Try to find lead by stripe_customer_id
  let lead = await findLeadByStripeCustomer(supabase, stripeCustomerId);

  // If no lead found, try to attribute via checkout session metadata
  // This handles cases where the checkout handler ran but lead wasn't linked yet
  if (!lead) {
    const customerEmail = invoice.customer_email;
    if (customerEmail) {
      const { data: leadByEmail } = await supabase
        .from("leads")
        .select("id, affiliate_id")
        .eq("email", customerEmail)
        .single();

      if (leadByEmail) {
        await supabase
          .from("leads")
          .update({ stripe_customer_id: stripeCustomerId })
          .eq("id", leadByEmail.id);
        lead = leadByEmail;
      }
    }
  }

  if (!lead) return;

  const subscriptionId = getStringId(
    (invoice as unknown as Record<string, unknown>).subscription as string | { id: string } | null,
  );

  const lineItem = invoice.lines?.data?.[0];
  const priceId = (lineItem as unknown as Record<string, unknown>)?.price as
    | { id?: string; recurring?: { interval?: string } }
    | null;
  const planType = resolvePlanType(priceId?.id, priceId?.recurring?.interval);

  let { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("stripe_customer_id", stripeCustomerId)
    .single();

  if (!customer) {
    const newState: CustomerState = planType === "annual" ? "active_annual" : "active_monthly";

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
        amount: amountPaid / 100,
      });
    }
  } else {
    const wasTrialing = customer.current_state === "trialing" || customer.current_state === "signed_up";
    const newCount = customer.payment_count + 1;
    const newState: CustomerState = planType === "annual" ? "active_annual" : "active_monthly";

    await supabase
      .from("customers")
      .update({
        payment_count: newCount,
        current_state: newState,
        plan_type: planType as Database["public"]["Enums"]["plan_type"],
        stripe_subscription_id: subscriptionId,
        first_payment_at: customer.first_payment_at || new Date().toISOString(),
      })
      .eq("id", customer.id);

    const eventType: CustomerEventType = wasTrialing || newCount === 1 ? "first_payment" : "recurring_payment";
    await logEvent(supabase, customer.id, eventType, {
      invoice_id: invoice.id,
      amount: amountPaid / 100,
      payment_number: newCount,
    });

    customer = { ...customer, payment_count: newCount };
  }

  if (customer) {
    await calculateAndInsertCommissions(supabase, {
      customerId: customer.id,
      affiliateId: lead.affiliate_id,
      invoiceId: invoice.id!,
      paymentAmount: amountPaid / 100,
      paymentNumber: customer.payment_count,
      planType,
    });
  }
}

// ---------------------------------------------------------------------------
// invoice.payment_failed
// ---------------------------------------------------------------------------

async function handlePaymentFailed(supabase: ServiceClient, invoice: Stripe.Invoice) {
  const stripeCustomerId = getStringId(invoice.customer);
  if (!stripeCustomerId) return;

  const { data: customer } = await supabase
    .from("customers")
    .select("id, current_state")
    .eq("stripe_customer_id", stripeCustomerId)
    .single();

  if (!customer) return;

  await logEvent(supabase, customer.id, "recurring_payment", {
    invoice_id: invoice.id,
    amount: (invoice.amount_due ?? 0) / 100,
    status: "failed",
    attempt_count: invoice.attempt_count,
  });
}

// ---------------------------------------------------------------------------
// customer.subscription.created
// ---------------------------------------------------------------------------

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
      subscription_id: sub.id,
      trial_end: sub.trial_end,
    });
  }
}

// ---------------------------------------------------------------------------
// customer.subscription.updated
// ---------------------------------------------------------------------------

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
    const priceId = extractPriceId(sub);
    const planType = resolvePlanType(priceId, sub.items?.data?.[0]?.price?.recurring?.interval);
    const newState: CustomerState = planType === "annual" ? "active_annual" : "active_monthly";

    await supabase
      .from("customers")
      .update({ current_state: newState, canceled_at: null, payment_count: 0 })
      .eq("id", customer.id);

    await logEvent(supabase, customer.id, "resubscribed", {
      subscription_id: sub.id,
    });
  }
}

// ---------------------------------------------------------------------------
// customer.subscription.deleted
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// charge.refunded
// ---------------------------------------------------------------------------

async function handleChargeRefunded(supabase: ServiceClient, charge: Stripe.Charge) {
  const invoiceId = getStringId(
    (charge as unknown as Record<string, unknown>).invoice as string | { id: string } | null,
  );
  if (!invoiceId) return;
  await voidCommissionsForInvoice(supabase, invoiceId);
}

// ---------------------------------------------------------------------------
// charge.dispute.created
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function findLeadByStripeCustomer(supabase: ServiceClient, stripeCustomerId: string) {
  const { data } = await supabase
    .from("leads")
    .select("id, affiliate_id")
    .eq("stripe_customer_id", stripeCustomerId)
    .single();
  return data;
}
