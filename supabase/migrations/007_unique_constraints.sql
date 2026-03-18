-- Migration 007: Add UNIQUE constraints to prevent race-condition duplicates
-- Applied to production via Supabase MCP on 2026-03-18.

-- P0: Prevent duplicate customers for the same Stripe customer.
-- The upsertCustomer() function in the webhook handler relies on catching
-- error code 23505 to handle concurrent inserts idempotently.
ALTER TABLE customers
  ADD CONSTRAINT uq_customers_stripe_customer_id UNIQUE (stripe_customer_id);

-- P1: Prevent duplicate leads for same affiliate + email.
-- findOrCreateLead() does select-then-insert which is a race condition
-- without this constraint.
ALTER TABLE leads
  ADD CONSTRAINT uq_leads_affiliate_email UNIQUE (affiliate_id, email);

-- P2: Prevent duplicate commissions for same invoice + affiliate.
-- handlePaymentSucceeded() checks for existing commissions by invoice_id
-- but without a unique constraint, concurrent webhook deliveries can both pass.
CREATE UNIQUE INDEX IF NOT EXISTS uq_commissions_invoice_affiliate
  ON commissions (stripe_invoice_id, affiliate_id)
  WHERE stripe_invoice_id IS NOT NULL;
