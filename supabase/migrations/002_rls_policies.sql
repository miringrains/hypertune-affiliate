-- Hypertune Affiliate System — Row Level Security Policies

-- Helper: check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM affiliates
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: get current affiliate id
CREATE OR REPLACE FUNCTION current_affiliate_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM affiliates
    WHERE user_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: check if affiliate is self or descendant
CREATE OR REPLACE FUNCTION is_self_or_descendant(target_affiliate_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  my_id UUID;
BEGIN
  my_id := current_affiliate_id();
  IF my_id IS NULL THEN RETURN FALSE; END IF;
  IF target_affiliate_id = my_id THEN RETURN TRUE; END IF;
  RETURN EXISTS (
    WITH RECURSIVE tree AS (
      SELECT id, parent_id FROM affiliates WHERE parent_id = my_id
      UNION ALL
      SELECT a.id, a.parent_id FROM affiliates a JOIN tree t ON a.parent_id = t.id
    )
    SELECT 1 FROM tree WHERE id = target_affiliate_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────
-- AFFILIATES
-- ─────────────────────────────────────────────
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on affiliates"
  ON affiliates FOR ALL
  USING (is_admin());

CREATE POLICY "Affiliates can read themselves and descendants"
  ON affiliates FOR SELECT
  USING (is_self_or_descendant(id));

CREATE POLICY "Affiliates can update their own row"
  ON affiliates FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─────────────────────────────────────────────
-- CLICKS
-- ─────────────────────────────────────────────
ALTER TABLE clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on clicks"
  ON clicks FOR ALL
  USING (is_admin());

CREATE POLICY "Affiliates can read their own clicks"
  ON clicks FOR SELECT
  USING (is_self_or_descendant(affiliate_id));

-- Insert allowed from service role only (tracking API)

-- ─────────────────────────────────────────────
-- LEADS
-- ─────────────────────────────────────────────
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on leads"
  ON leads FOR ALL
  USING (is_admin());

CREATE POLICY "Affiliates can read their own leads"
  ON leads FOR SELECT
  USING (is_self_or_descendant(affiliate_id));

-- ─────────────────────────────────────────────
-- CUSTOMERS
-- ─────────────────────────────────────────────
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on customers"
  ON customers FOR ALL
  USING (is_admin());

CREATE POLICY "Affiliates can read their own customers"
  ON customers FOR SELECT
  USING (is_self_or_descendant(affiliate_id));

-- ─────────────────────────────────────────────
-- CUSTOMER EVENTS
-- ─────────────────────────────────────────────
ALTER TABLE customer_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on customer_events"
  ON customer_events FOR ALL
  USING (is_admin());

CREATE POLICY "Affiliates can read events for their customers"
  ON customer_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_events.customer_id
      AND is_self_or_descendant(c.affiliate_id)
    )
  );

-- ─────────────────────────────────────────────
-- COMMISSIONS
-- ─────────────────────────────────────────────
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on commissions"
  ON commissions FOR ALL
  USING (is_admin());

CREATE POLICY "Affiliates can read their own commissions"
  ON commissions FOR SELECT
  USING (affiliate_id = current_affiliate_id());

-- ─────────────────────────────────────────────
-- PAYOUTS
-- ─────────────────────────────────────────────
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on payouts"
  ON payouts FOR ALL
  USING (is_admin());

CREATE POLICY "Affiliates can read their own payouts"
  ON payouts FOR SELECT
  USING (affiliate_id = current_affiliate_id());

-- ─────────────────────────────────────────────
-- PAYOUT METHODS
-- ─────────────────────────────────────────────
ALTER TABLE payout_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on payout_methods"
  ON payout_methods FOR ALL
  USING (is_admin());

CREATE POLICY "Affiliates can manage their own payout methods"
  ON payout_methods FOR ALL
  USING (affiliate_id = current_affiliate_id())
  WITH CHECK (affiliate_id = current_affiliate_id());

-- ─────────────────────────────────────────────
-- TAX DOCUMENTS
-- ─────────────────────────────────────────────
ALTER TABLE tax_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on tax_documents"
  ON tax_documents FOR ALL
  USING (is_admin());

CREATE POLICY "Affiliates can manage their own tax documents"
  ON tax_documents FOR ALL
  USING (affiliate_id = current_affiliate_id())
  WITH CHECK (affiliate_id = current_affiliate_id());

-- ─────────────────────────────────────────────
-- MEDIA ASSETS (readable by all authenticated)
-- ─────────────────────────────────────────────
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage media assets"
  ON media_assets FOR ALL
  USING (is_admin());

CREATE POLICY "All authenticated can read media assets"
  ON media_assets FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ─────────────────────────────────────────────
-- INVITE LINKS
-- ─────────────────────────────────────────────
ALTER TABLE invite_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invite links"
  ON invite_links FOR ALL
  USING (is_admin());

CREATE POLICY "Affiliates can read invite links they created or were used by their sub-affiliates"
  ON invite_links FOR SELECT
  USING (
    parent_affiliate_id = current_affiliate_id()
    OR is_admin()
  );

-- ─────────────────────────────────────────────
-- SETTINGS (admin only for write, readable by all authenticated)
-- ─────────────────────────────────────────────
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settings"
  ON settings FOR ALL
  USING (is_admin());

CREATE POLICY "All authenticated can read settings"
  ON settings FOR SELECT
  USING (auth.uid() IS NOT NULL);
