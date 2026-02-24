-- Hypertune Affiliate System — Initial Schema
-- Run this in your Supabase SQL Editor

-- ─────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────
CREATE TYPE affiliate_status AS ENUM ('invited', 'active', 'inactive');
CREATE TYPE affiliate_role AS ENUM ('affiliate', 'admin');
CREATE TYPE customer_state AS ENUM ('signed_up', 'trialing', 'active_monthly', 'active_annual', 'canceled', 'dormant');
CREATE TYPE plan_type AS ENUM ('monthly', 'annual');
CREATE TYPE customer_event_type AS ENUM ('account_created', 'trial_started', 'trial_expired', 'first_payment', 'recurring_payment', 'canceled', 'resubscribed');
CREATE TYPE commission_tier_type AS ENUM ('direct', 'tier2', 'tier3');
CREATE TYPE commission_status AS ENUM ('pending', 'approved', 'paid', 'voided');
CREATE TYPE payout_status AS ENUM ('processing', 'completed');
CREATE TYPE payout_method_type AS ENUM ('paypal', 'bank_transfer');

-- ─────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────

CREATE TABLE affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES affiliates(id) ON DELETE SET NULL,
  tier_level SMALLINT NOT NULL DEFAULT 1 CHECK (tier_level BETWEEN 1 AND 3),
  commission_rate SMALLINT NOT NULL CHECK (commission_rate IN (50, 70)),
  commission_duration_months SMALLINT NOT NULL DEFAULT 6,
  sub_affiliate_rate SMALLINT NOT NULL DEFAULT 5,
  status affiliate_status NOT NULL DEFAULT 'invited',
  role affiliate_role NOT NULL DEFAULT 'affiliate',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  referrer_url TEXT,
  landing_page TEXT,
  ip_hash TEXT,
  user_agent TEXT
);

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  stripe_customer_id TEXT,
  click_id UUID REFERENCES clicks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT,
  current_state customer_state NOT NULL DEFAULT 'signed_up',
  plan_type plan_type,
  payment_count INT NOT NULL DEFAULT 0,
  first_payment_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE customer_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  event_type customer_event_type NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  rate_snapshot SMALLINT NOT NULL,
  payment_number SMALLINT NOT NULL,
  tier_type commission_tier_type NOT NULL DEFAULT 'direct',
  status commission_status NOT NULL DEFAULT 'pending',
  payout_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);

CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  status payout_status NOT NULL DEFAULT 'processing',
  method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Add FK after payouts table exists
ALTER TABLE commissions
  ADD CONSTRAINT fk_commissions_payout
  FOREIGN KEY (payout_id) REFERENCES payouts(id) ON DELETE SET NULL;

CREATE TABLE payout_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  method_type payout_method_type NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tax_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  campaign TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE invite_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  commission_rate SMALLINT NOT NULL CHECK (commission_rate IN (50, 70)),
  parent_affiliate_id UUID REFERENCES affiliates(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_by_affiliate_id UUID REFERENCES affiliates(id) ON DELETE SET NULL,
  is_tracking_only BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────
CREATE INDEX idx_affiliates_user_id ON affiliates(user_id);
CREATE INDEX idx_affiliates_parent_id ON affiliates(parent_id);
CREATE INDEX idx_affiliates_slug ON affiliates(slug);
CREATE INDEX idx_clicks_affiliate_id ON clicks(affiliate_id);
CREATE INDEX idx_clicks_clicked_at ON clicks(clicked_at);
CREATE INDEX idx_leads_affiliate_id ON leads(affiliate_id);
CREATE INDEX idx_leads_stripe_customer_id ON leads(stripe_customer_id);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_customers_affiliate_id ON customers(affiliate_id);
CREATE INDEX idx_customers_stripe_customer_id ON customers(stripe_customer_id);
CREATE INDEX idx_customers_stripe_subscription_id ON customers(stripe_subscription_id);
CREATE INDEX idx_customer_events_customer_id ON customer_events(customer_id);
CREATE INDEX idx_commissions_affiliate_id ON commissions(affiliate_id);
CREATE INDEX idx_commissions_customer_id ON commissions(customer_id);
CREATE INDEX idx_commissions_status ON commissions(status);
CREATE INDEX idx_commissions_payout_id ON commissions(payout_id);
CREATE INDEX idx_payouts_affiliate_id ON payouts(affiliate_id);
CREATE INDEX idx_payout_methods_affiliate_id ON payout_methods(affiliate_id);
CREATE INDEX idx_invite_links_code ON invite_links(code);

-- ─────────────────────────────────────────────
-- AUTO-UPDATE updated_at
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_affiliates_updated_at
  BEFORE UPDATE ON affiliates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────
-- SEED DEFAULT SETTINGS
-- ─────────────────────────────────────────────
INSERT INTO settings (key, value) VALUES
  ('default_commission_duration_months', '6'),
  ('default_sub_affiliate_rate', '5'),
  ('cookie_duration_days', '90');

-- ─────────────────────────────────────────────
-- STORAGE BUCKETS (run in Supabase dashboard or via API)
-- ─────────────────────────────────────────────
-- Create these buckets in Supabase Storage:
--   1. "media" (public) — marketing assets
--   2. "tax-docs" (private) — W-9/W-8BEN uploads
