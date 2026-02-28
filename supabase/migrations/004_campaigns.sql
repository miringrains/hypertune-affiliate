-- Admin campaign tracking (0% commission, for admin's own marketing campaigns)

CREATE TABLE campaigns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE campaign_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('click', 'lead', 'customer', 'trial')),
  email text,
  metadata jsonb DEFAULT '{}',
  ip_hash text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_campaign_events_campaign_id ON campaign_events(campaign_id);
CREATE INDEX idx_campaign_events_type ON campaign_events(campaign_id, event_type);
CREATE INDEX idx_campaign_events_created ON campaign_events(created_at);
CREATE INDEX idx_campaigns_slug ON campaigns(slug);

-- RLS: only service role should access these (admin-only via API)
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_events ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (API routes use service client)
CREATE POLICY "Service role full access on campaigns"
  ON campaigns FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on campaign_events"
  ON campaign_events FOR ALL
  USING (true)
  WITH CHECK (true);
