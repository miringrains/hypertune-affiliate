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
        await handleCheckoutCompleted(supabase, event.data.object, event.id);
        break;
      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(supabase, event.data.object, event.id);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(supabase, event.data.object);
        break;
      case "customer.subscription.created":
        await handleSubscriptionCreated(supabase, event.data.object, event.id);
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
    return NextResponse.json(
      { error: `Handler failed: ${event.type}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}

// ---------------------------------------------------------------------------
// Shared helpers
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

function extractPriceInfo(sub: Stripe.Subscription): { priceId: string | null; interval: string | null } {
  const item = sub.items?.data?.[0];
  return {
    priceId: item?.price?.id ?? null,
    interval: item?.price?.recurring?.interval ?? null,
  };
}

function planTypeFromSub(sub: Stripe.Subscription): "monthly" | "annual" {
  const { priceId, interval } = extractPriceInfo(sub);
  return resolvePlanType(priceId, interval);
}

function activeStateForPlan(planType: "monthly" | "annual"): CustomerState {
  return planType === "annual" ? "active_annual" : "active_monthly";
}

const STATE_RANK: Record<string, number> = {
  signed_up: 0,
  trialing: 1,
  active_monthly: 2,
  active_annual: 2,
  canceled: 3,
  dormant: 4,
};

/**
 * Returns true if the new state should overwrite the current state.
 * Prevents regressions (e.g., active -> trialing due to event reordering).
 * Canceled can only be set by subscription.deleted, so this function
 * should not be called with newState=canceled — that handler sets it directly.
 */
function shouldTransitionTo(currentState: CustomerState, newState: CustomerState): boolean {
  if (currentState === newState) return false;
  return (STATE_RANK[newState] ?? 0) >= (STATE_RANK[currentState] ?? 0);
}

// ---------------------------------------------------------------------------
// Lead / affiliate resolution
// ---------------------------------------------------------------------------

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

async function findLeadByStripeCustomer(supabase: ServiceClient, stripeCustomerId: string) {
  const { data } = await supabase
    .from("leads")
    .select("id, affiliate_id")
    .eq("stripe_customer_id", stripeCustomerId)
    .single();
  return data;
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
// am_id resolution: subscription metadata > session metadata > customer metadata
// ---------------------------------------------------------------------------

async function resolveAmId(
  sub?: Stripe.Subscription | null,
  stripeCustomerId?: string | null,
): Promise<string | null> {
  if (sub?.metadata?.am_id) return sub.metadata.am_id;

  if (stripeCustomerId) {
    try {
      const sessions = await stripe.checkout.sessions.list({
        customer: stripeCustomerId,
        limit: 5,
      });
      const fromSession = sessions.data
        .map((s) => s.metadata?.am_id)
        .find((id) => !!id);
      if (fromSession) return fromSession;
    } catch { /* ignore */ }

    try {
      const cust = await stripe.customers.retrieve(stripeCustomerId);
      if (!cust.deleted && "metadata" in cust && cust.metadata?.am_id) {
        return cust.metadata.am_id;
      }
    } catch { /* ignore */ }
  }

  return null;
}

async function getStripeCustomerEmail(stripeCustomerId: string): Promise<string | null> {
  try {
    const cust = await stripe.customers.retrieve(stripeCustomerId);
    if (!cust.deleted && "email" in cust) return cust.email;
  } catch { /* ignore */ }
  return null;
}

// ---------------------------------------------------------------------------
// Idempotent customer upsert
// ---------------------------------------------------------------------------

/**
 * Attempts to insert a customer record. If the stripe_customer_id already
 * exists (unique constraint), returns the existing record instead.
 */
async function upsertCustomer(
  supabase: ServiceClient,
  fields: Database["public"]["Tables"]["customers"]["Insert"],
): Promise<Database["public"]["Tables"]["customers"]["Row"] | null> {
  const { data: inserted, error } = await supabase
    .from("customers")
    .insert(fields)
    .select("*")
    .single();

  if (inserted) return inserted;

  if (error && error.code === "23505") {
    const { data: existing } = await supabase
      .from("customers")
      .select("*")
      .eq("stripe_customer_id", fields.stripe_customer_id)
      .single();
    return existing;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Resolve lead from am_id when not found by stripe_customer_id
// ---------------------------------------------------------------------------

async function resolveLeadFromAmId(
  supabase: ServiceClient,
  stripeCustomerId: string,
  subscriptionId: string | null,
  email: string | null,
): Promise<{ id: string; affiliate_id: string } | null> {
  let sub: Stripe.Subscription | null = null;
  if (subscriptionId) {
    try { sub = await stripe.subscriptions.retrieve(subscriptionId); } catch { /* ignore */ }
  }

  const amId = await resolveAmId(sub, stripeCustomerId);
  if (!amId || !email) return null;

  const affiliate = await resolveAffiliateBySlug(supabase, amId);
  if (!affiliate) return null;

  return findOrCreateLead(supabase, affiliate.id, email, stripeCustomerId);
}

// ---------------------------------------------------------------------------
// Campaign helpers
// ---------------------------------------------------------------------------

async function resolveCampaignBySlug(supabase: ServiceClient, slug: string) {
  const { data } = await (supabase as any)
    .from("campaigns")
    .select("id")
    .eq("slug", slug)
    .single() as { data: { id: string } | null; error: any };
  return data;
}

async function recordCampaignEvent(
  supabase: ServiceClient,
  campaignId: string,
  eventType: string,
  email: string | null,
  stripeEventId: string | null,
  metadata: Record<string, unknown> = {},
) {
  if (email && (eventType === "customer" || eventType === "trial")) {
    const { data: existing } = await (supabase as any)
      .from("campaign_events")
      .select("id")
      .eq("campaign_id", campaignId)
      .eq("event_type", eventType)
      .eq("email", email)
      .limit(1) as { data: { id: string }[] | null; error: any };

    if (existing && existing.length > 0) return;
  }

  const { error } = await (supabase as any).from("campaign_events").insert({
    campaign_id: campaignId,
    event_type: eventType,
    email,
    stripe_event_id: stripeEventId,
    metadata,
  });
  if (error && error.code === "23505") return;
}

async function findCampaignByLeadEmail(supabase: ServiceClient, email: string) {
  const { data } = await (supabase as any)
    .from("campaign_events")
    .select("campaign_id")
    .eq("event_type", "lead")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1) as { data: { campaign_id: string }[] | null; error: any };

  return data?.[0]?.campaign_id ?? null;
}

/**
 * Attempts affiliate attribution first, then campaign attribution for a
 * subscription event. Used by subscription.created for both trial and active.
 */
async function attributeSubscription(
  supabase: ServiceClient,
  sub: Stripe.Subscription,
  stripeCustomerId: string,
  stripeEventId: string,
): Promise<boolean> {
  const amId = sub.metadata?.am_id ?? await resolveAmId(null, stripeCustomerId);
  if (!amId) return false;

  const email = await getStripeCustomerEmail(stripeCustomerId);
  const planType = planTypeFromSub(sub);
  const isTrial = sub.status === "trialing";

  // Try affiliate path
  const affiliate = await resolveAffiliateBySlug(supabase, amId);
  if (affiliate && email) {
    const lead = await findOrCreateLead(supabase, affiliate.id, email, stripeCustomerId);
    if (lead) {
      const initialState: CustomerState = isTrial ? "trialing" : activeStateForPlan(planType);
      const customer = await upsertCustomer(supabase, {
        affiliate_id: affiliate.id,
        lead_id: lead.id,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: sub.id,
        current_state: initialState,
        payment_count: 0,
      });
      if (customer) {
        const eventType: CustomerEventType = isTrial ? "trial_started" : "account_created";
        await logEvent(supabase, customer.id, eventType, {
          subscription_id: sub.id,
          trial_end: sub.trial_end,
        });
      }
      return true;
    }
  }

  // Try campaign path
  const campaign = await resolveCampaignBySlug(supabase, amId);
  if (campaign) {
    const campaignEventType = isTrial ? "trial" : "customer";
    await recordCampaignEvent(supabase, campaign.id, campaignEventType, email, stripeEventId, {
      stripe_customer_id: stripeCustomerId,
      subscription_id: sub.id,
      trial_end: sub.trial_end,
    });
    return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// checkout.session.completed
//
// NOTE: The hypertune.gg checkout flow may not use Stripe Checkout, so this
// event may never fire. subscription.created is the primary attribution handler.
// This is kept as a secondary path for resilience.
// ---------------------------------------------------------------------------

async function handleCheckoutCompleted(
  supabase: ServiceClient,
  session: Stripe.Checkout.Session,
  stripeEventId: string,
) {
  const stripeCustomerId = getStringId(session.customer);
  if (!stripeCustomerId) return;

  const stripeSubscriptionId = getStringId(
    (session as unknown as Record<string, unknown>).subscription as string | { id: string } | null,
  );

  let amId = session.metadata?.am_id;

  if (!amId && stripeSubscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      amId = sub.metadata?.am_id ?? null;
    } catch { /* ignore */ }
  }

  if (!amId) {
    try {
      const cust = await stripe.customers.retrieve(stripeCustomerId);
      if (!cust.deleted && "metadata" in cust) amId = cust.metadata?.am_id ?? null;
    } catch { /* ignore */ }
  }

  if (!amId) {
    const email = session.customer_details?.email;
    if (email) {
      const campaignId = await findCampaignByLeadEmail(supabase, email);
      if (campaignId) {
        let eventType = "customer";
        if (stripeSubscriptionId) {
          try {
            const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
            if (sub.status === "trialing") eventType = "trial";
          } catch { /* ignore */ }
        }
        await recordCampaignEvent(supabase, campaignId, eventType, email, stripeEventId, {
          checkout_session_id: session.id,
          stripe_customer_id: stripeCustomerId,
        });
      }
    }
    return;
  }

  // Affiliate path
  const affiliate = await resolveAffiliateBySlug(supabase, amId);
  if (!affiliate) {
    const campaign = await resolveCampaignBySlug(supabase, amId);
    if (campaign) {
      const email = session.customer_details?.email ?? null;
      let eventType = "customer";
      if (stripeSubscriptionId) {
        try {
          const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
          if (sub.status === "trialing") eventType = "trial";
        } catch { /* ignore */ }
      }
      await recordCampaignEvent(supabase, campaign.id, eventType, email, stripeEventId, {
        checkout_session_id: session.id,
        stripe_customer_id: stripeCustomerId,
      });
    }
    return;
  }

  const email = session.customer_details?.email;
  if (!email) return;

  const lead = await findOrCreateLead(supabase, affiliate.id, email, stripeCustomerId);
  if (!lead) return;

  let initialState: CustomerState = "signed_up";
  let eventType: CustomerEventType = "account_created";

  if (stripeSubscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      const planType = planTypeFromSub(sub);
      if (sub.status === "trialing") {
        initialState = "trialing";
        eventType = "trial_started";
      } else if (sub.status === "active") {
        initialState = activeStateForPlan(planType);
        eventType = "first_payment";
      }
    } catch { /* ignore */ }
  }

  const customer = await upsertCustomer(supabase, {
    affiliate_id: affiliate.id,
    lead_id: lead.id,
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubscriptionId,
    current_state: initialState,
    payment_count: 0,
  });

  if (customer && customer.current_state === initialState) {
    await logEvent(supabase, customer.id, eventType, {
      checkout_session_id: session.id,
      subscription_id: stripeSubscriptionId,
    });
  }
}

// ---------------------------------------------------------------------------
// customer.subscription.created — PRIMARY attribution handler
// ---------------------------------------------------------------------------

async function handleSubscriptionCreated(
  supabase: ServiceClient,
  sub: Stripe.Subscription,
  stripeEventId: string,
) {
  const stripeCustomerId = getStringId(sub.customer);
  if (!stripeCustomerId) return;

  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("id, current_state")
    .eq("stripe_customer_id", stripeCustomerId)
    .single();

  if (existingCustomer) {
    if (sub.status === "trialing" && shouldTransitionTo(existingCustomer.current_state, "trialing")) {
      await supabase
        .from("customers")
        .update({
          current_state: "trialing" as CustomerState,
          stripe_subscription_id: sub.id,
        })
        .eq("id", existingCustomer.id);
      await logEvent(supabase, existingCustomer.id, "trial_started", {
        subscription_id: sub.id,
        trial_end: sub.trial_end,
      });
    }
    return;
  }

  // No customer record yet — attempt full attribution
  const attributed = await attributeSubscription(supabase, sub, stripeCustomerId, stripeEventId);
  if (attributed) return;

  // Last resort: email-based campaign fallback
  const email = await getStripeCustomerEmail(stripeCustomerId);
  if (email) {
    const campaignId = await findCampaignByLeadEmail(supabase, email);
    if (campaignId) {
      const eventType = sub.status === "trialing" ? "trial" : "customer";
      await recordCampaignEvent(supabase, campaignId, eventType, email, stripeEventId, {
        stripe_customer_id: stripeCustomerId,
        subscription_id: sub.id,
        trial_end: sub.trial_end,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// customer.subscription.updated — state transitions
// ---------------------------------------------------------------------------

async function handleSubscriptionUpdated(supabase: ServiceClient, sub: Stripe.Subscription) {
  const stripeCustomerId = getStringId(sub.customer);
  if (!stripeCustomerId) return;

  const { data: customer } = await supabase
    .from("customers")
    .select("id, current_state, payment_count")
    .eq("stripe_customer_id", stripeCustomerId)
    .single();

  if (!customer) return;

  const planType = planTypeFromSub(sub);
  const activeState = activeStateForPlan(planType);

  if (sub.status === "active") {
    // trial -> active (trial ended and payment succeeded)
    if (customer.current_state === "trialing" || customer.current_state === "signed_up") {
      await supabase
        .from("customers")
        .update({
          current_state: activeState,
          plan_type: planType as Database["public"]["Enums"]["plan_type"],
          stripe_subscription_id: sub.id,
        })
        .eq("id", customer.id);
      return;
    }

    // canceled -> active (resubscribed)
    if (customer.current_state === "canceled") {
      await supabase
        .from("customers")
        .update({
          current_state: activeState,
          plan_type: planType as Database["public"]["Enums"]["plan_type"],
          canceled_at: null,
          payment_count: 0,
          stripe_subscription_id: sub.id,
        })
        .eq("id", customer.id);
      await logEvent(supabase, customer.id, "resubscribed", {
        subscription_id: sub.id,
      });
      return;
    }

    // Plan change (monthly <-> annual) while already active
    if (
      (customer.current_state === "active_monthly" || customer.current_state === "active_annual") &&
      customer.current_state !== activeState
    ) {
      await supabase
        .from("customers")
        .update({
          current_state: activeState,
          plan_type: planType as Database["public"]["Enums"]["plan_type"],
          stripe_subscription_id: sub.id,
        })
        .eq("id", customer.id);
      return;
    }
  }

  if (sub.status === "past_due") {
    await logEvent(supabase, customer.id, "recurring_payment", {
      subscription_id: sub.id,
      status: "past_due",
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
    .select("id, current_state")
    .eq("stripe_customer_id", stripeCustomerId)
    .single();

  if (!customer) return;
  if (customer.current_state === "canceled") return;

  await supabase
    .from("customers")
    .update({
      current_state: "canceled" as CustomerState,
      canceled_at: new Date().toISOString(),
    })
    .eq("id", customer.id);

  await logEvent(supabase, customer.id, "canceled", {
    subscription_id: sub.id,
    reason: sub.cancellation_details?.reason,
  });
}

// ---------------------------------------------------------------------------
// invoice.payment_succeeded
// ---------------------------------------------------------------------------

async function handlePaymentSucceeded(
  supabase: ServiceClient,
  invoice: Stripe.Invoice,
  stripeEventId: string,
) {
  const amountPaid = invoice.amount_paid ?? 0;
  if (amountPaid === 0) return;

  const stripeCustomerId = getStringId(invoice.customer);
  if (!stripeCustomerId) return;

  const { data: existingCommissions } = await supabase
    .from("commissions")
    .select("id")
    .eq("stripe_invoice_id", invoice.id)
    .limit(1);

  if (existingCommissions && existingCommissions.length > 0) return;

  const subscriptionId = getStringId(
    (invoice as unknown as Record<string, unknown>).subscription as string | { id: string } | null,
  );

  // Resolve lead through multiple strategies
  let lead = await findLeadByStripeCustomer(supabase, stripeCustomerId);

  if (!lead && invoice.customer_email) {
    const { data: leadByEmail } = await supabase
      .from("leads")
      .select("id, affiliate_id")
      .eq("email", invoice.customer_email)
      .single();

    if (leadByEmail) {
      await supabase
        .from("leads")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", leadByEmail.id);
      lead = leadByEmail;
    }
  }

  if (!lead) {
    lead = await resolveLeadFromAmId(supabase, stripeCustomerId, subscriptionId, invoice.customer_email ?? null);
  }

  if (!lead) {
    await handleCampaignPayment(supabase, invoice, stripeCustomerId, subscriptionId, stripeEventId);
    return;
  }

  const lineItem = invoice.lines?.data?.[0];
  const priceId = (lineItem as unknown as Record<string, unknown>)?.price as
    | { id?: string; recurring?: { interval?: string } }
    | null;
  const planType = resolvePlanType(priceId?.id, priceId?.recurring?.interval);
  const activeState = activeStateForPlan(planType);

  let { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("stripe_customer_id", stripeCustomerId)
    .single();

  if (!customer) {
    customer = await upsertCustomer(supabase, {
      affiliate_id: lead.affiliate_id,
      lead_id: lead.id,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: subscriptionId,
      current_state: activeState,
      plan_type: planType as Database["public"]["Enums"]["plan_type"],
      payment_count: 1,
      first_payment_at: new Date().toISOString(),
    });

    if (customer && customer.payment_count === 1) {
      await logEvent(supabase, customer.id, "first_payment", {
        invoice_id: invoice.id,
        amount: amountPaid / 100,
      });
    }
  } else {
    const wasTrialing = customer.current_state === "trialing" || customer.current_state === "signed_up";
    const newCount = customer.payment_count + 1;

    await supabase
      .from("customers")
      .update({
        payment_count: newCount,
        current_state: activeState,
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
// charge.refunded / charge.dispute.created
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Campaign payment tracking
// ---------------------------------------------------------------------------

async function handleCampaignPayment(
  supabase: ServiceClient,
  invoice: Stripe.Invoice,
  stripeCustomerId: string,
  subscriptionId: string | null,
  stripeEventId: string,
) {
  const email = invoice.customer_email;

  let sub: Stripe.Subscription | null = null;
  if (subscriptionId) {
    try { sub = await stripe.subscriptions.retrieve(subscriptionId); } catch { /* ignore */ }
  }

  const amId = await resolveAmId(sub, stripeCustomerId);
  if (amId) {
    const campaign = await resolveCampaignBySlug(supabase, amId);
    if (campaign) {
      await recordCampaignEvent(supabase, campaign.id, "customer", email ?? null, stripeEventId, {
        invoice_id: invoice.id,
        amount: (invoice.amount_paid ?? 0) / 100,
        stripe_customer_id: stripeCustomerId,
      });
      return;
    }
  }

  if (!email) return;
  const campaignId = await findCampaignByLeadEmail(supabase, email);
  if (!campaignId) return;

  await recordCampaignEvent(supabase, campaignId, "customer", email, stripeEventId, {
    invoice_id: invoice.id,
    amount: (invoice.amount_paid ?? 0) / 100,
    stripe_customer_id: stripeCustomerId,
  });
}
