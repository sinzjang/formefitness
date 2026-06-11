import type { PlanId } from '../types/subscription';

export type PurchasablePlanId = Extract<PlanId, 'plus' | 'prime'>;

export interface RevenueCatPlanConfig {
  planId: PurchasablePlanId;
  entitlementId: PurchasablePlanId;
  monthlyProductId: string;
  yearlyProductId: string;
}

export const REVENUECAT_OFFERING_ID = 'default';

export const REVENUECAT_PLANS: RevenueCatPlanConfig[] = [
  {
    planId: 'plus',
    entitlementId: 'plus',
    monthlyProductId: 'forme_plus_monthly',
    yearlyProductId: 'forme_plus_yearly',
  },
  {
    planId: 'prime',
    entitlementId: 'prime',
    monthlyProductId: 'forme_prime_monthly',
    yearlyProductId: 'forme_prime_yearly',
  },
];

export const REVENUECAT_PRODUCT_TO_PLAN = REVENUECAT_PLANS.reduce<
  Record<string, PurchasablePlanId>
>((acc, plan) => {
  acc[plan.monthlyProductId] = plan.planId;
  acc[plan.yearlyProductId] = plan.planId;
  return acc;
}, {});
