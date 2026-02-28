ALTER TABLE payouts DROP CONSTRAINT IF EXISTS payouts_status_check;
ALTER TABLE payouts ADD CONSTRAINT payouts_status_check
  CHECK (status IN ('pending', 'approved', 'denied', 'processing', 'completed'));
