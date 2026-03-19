/**
 * Baseline display logic for GHL → portal data transition.
 *
 * baseline = csv_value - live_count_at_sync_time
 * displayed = baseline + current_live_count
 *
 * At sync time: displayed = csv_value (exact match).
 * After sync: new data increments displayed naturally.
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

/** Historical baseline + new data tracked by our system. */
export function withBaseline(baseline: number, dbValue: number): number {
  return baseline + dbValue;
}

/** Clicks: same addition logic (kept as named alias for readability). */
export function withBaselineClicks(baselineClicks: number, dbClicks: number): number {
  return baselineClicks + dbClicks;
}

/** Money-valued baseline (earned, paid, owed): same addition logic. */
export function withBaselineMoney(baseline: number, dbValue: number): number {
  return baseline + dbValue;
}
