import type { DbPlanId, PlanId } from '../types/subscription';

export function normalizePlanId(planId?: DbPlanId | null): PlanId {
  if (planId === 'admin') return 'admin';
  if (planId === 'prime' || planId === 'premium' || planId === 'pro') return 'prime';
  if (planId === 'plus' || planId === 'flex') return 'plus';
  return 'free';
}

export function planDisplayName(planId: PlanId): string {
  if (planId === 'admin') return 'Prime';
  if (planId === 'prime') return 'Prime';
  if (planId === 'plus') return 'Plus';
  return 'Free';
}
