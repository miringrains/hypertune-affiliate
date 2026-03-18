/**
 * Baseline display logic for GHL → portal data transition.
 *
 * The DB tables (leads, customers, commissions, clicks) only contain
 * records created AFTER our tracking system went live — no GHL imports.
 * Therefore every stat is: baseline + dbValue.
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
