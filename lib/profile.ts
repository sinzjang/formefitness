// Supabase profiles ↔ 앱 UserProfile 변환
import type { UserProfile } from '../types';
import type { DbProfile } from '../types/subscription';
import { normalizePlanId } from './planIds';

export function dbProfileToUserProfile(row: DbProfile): UserProfile {
  return {
    id: row.id,
    displayName: row.display_name ?? undefined,
    email: row.email ?? undefined,
    goalTier: row.goal_tier ?? undefined,
    goalImageUrl: row.goal_image_url ?? undefined,
    weightUnit: row.weight_unit,
    planId: normalizePlanId(row.plan_id),
    subscriptionStatus: row.subscription_status,
  };
}
