import type { PlanId } from '../types/subscription';

export type PurchasablePlanId = Extract<PlanId, 'plus' | 'prime'>;

export interface RevenueCatPlanConfig {
  planId: PurchasablePlanId;
  entitlementId: PurchasablePlanId;
  /** App Store Connect / Google Play 에 등록한 Product ID */
  monthlyProductId: string;
  yearlyProductId: string;
  /** 기준 가격 (USD) — UI fallback 및 할인율 계산용 */
  monthlyPriceUSD: number;
  yearlyPriceUSD: number;
}

export const REVENUECAT_OFFERING_ID = 'default';

export const REVENUECAT_PLANS: RevenueCatPlanConfig[] = [
  {
    planId: 'plus',
    entitlementId: 'plus',
    monthlyProductId: 'kyne_plus_monthly',
    yearlyProductId: 'kyne_plus_yearly',
    monthlyPriceUSD: 3.99,
    yearlyPriceUSD: 29.99,
  },
  {
    planId: 'prime',
    entitlementId: 'prime',
    monthlyProductId: 'kyne_prime_monthly',
    yearlyProductId: 'kyne_prime_yearly',
    monthlyPriceUSD: 7.99,
    yearlyPriceUSD: 59.99,
  },
];

/** Product ID → Plan 매핑 */
export const REVENUECAT_PRODUCT_TO_PLAN = REVENUECAT_PLANS.reduce<
  Record<string, PurchasablePlanId>
>((acc, plan) => {
  acc[plan.monthlyProductId] = plan.planId;
  acc[plan.yearlyProductId] = plan.planId;
  return acc;
}, {});

/** 기준 가격에서 연간 할인율(%) 계산 */
export function calcYearlySaving(plan: RevenueCatPlanConfig): number {
  return Math.round((1 - plan.yearlyPriceUSD / (plan.monthlyPriceUSD * 12)) * 100);
}

/** fallback 가격 문자열 ($X.XX 형식) */
export function fallbackPrice(usd: number): string {
  return `$${usd.toFixed(2)}`;
}
