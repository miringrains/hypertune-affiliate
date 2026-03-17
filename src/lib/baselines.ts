/**
 * Baseline display logic for GHL → portal data transition.
 *
 * Formula for every stat:
 *   Pre go-live  → baseline > 0 ? baseline : dbValue
 *   Post go-live → baseline + newValuesSinceGoLive
 *
 * For clicks the DB table only contains post-system records (no GHL import),
 * so the formula is always: baseline_clicks + dbClicks.
 */

export type AffiliateBaselines = {
  baseline_leads: number;
  baseline_clicks: number;
  baseline_customers: number;
  baseline_revenue: number;
  baseline_paid: number;
  baseline_owed: number;
  baseline_churned: number;
  go_live_at: string | null;
};

/** Picks the displayed value: baseline overrides DB, or post-go-live adds on top. */
export function withBaseline(baseline: number, dbValue: number, goLiveAt: string | null, newSinceGoLive?: number): number {
  if (goLiveAt) {
    return baseline + (newSinceGoLive ?? 0);
  }
  return baseline > 0 ? baseline : dbValue;
}

/** Clicks always add since the clicks table has no GHL-imported rows. */
export function withBaselineClicks(baselineClicks: number, dbClicks: number): number {
  return baselineClicks + dbClicks;
}

/** Money-valued baseline (earned, paid, owed): same logic as counts. */
export function withBaselineMoney(baseline: number, dbValue: number, goLiveAt: string | null, newSinceGoLive?: number): number {
  if (goLiveAt) {
    return baseline + (newSinceGoLive ?? 0);
  }
  return baseline > 0 ? baseline : dbValue;
}
