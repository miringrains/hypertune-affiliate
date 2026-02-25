export const ICON_STROKE_WIDTH = 1.75;

export const COOKIE_NAME = "ht_aff";
export const COOKIE_MAX_AGE = 90 * 24 * 60 * 60; // 90 days in seconds

export const DEFAULT_COMMISSION_DURATION_MONTHS = 6;
export const DEFAULT_SUB_AFFILIATE_RATE = 5;
export const DEFAULT_COOKIE_DURATION_DAYS = 90;

export const COMMISSION_RATES = [50, 70] as const;
export const MAX_TIER_DEPTH = 3;

export const PLAN_PRICES = {
  monthly: 4.99,
  annual: 47.88,
} as const;

export const STRIPE_PRICE_IDS = {
  monthly: "price_1RgK4xKgTpq6PPfToKt3vZdq",
  yearly: "price_1RgK4xKgTpq6PPfT8f5nJVtY",
} as const;

export function getPlanTypeFromPriceId(priceId: string | null | undefined): "monthly" | "annual" | null {
  if (!priceId) return null;
  if (priceId === STRIPE_PRICE_IDS.monthly) return "monthly";
  if (priceId === STRIPE_PRICE_IDS.yearly) return "annual";
  return null;
}
