// 구독 · 플랜 · 사용량 타입

export type PlanId = 'free' | 'pro';

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'canceled'
  | 'expired'
  | 'grace_period';

export type FeatureKey =
  | 'coach_message'
  | 'session_eval'
  | 'goal_image'
  | 'cloud_sync'
  | 'body_analysis';

/** Supabase profiles 행 (snake_case) */
export interface DbProfile {
  id: string;
  display_name: string | null;
  email: string | null;
  goal_tier: number | null;
  goal_image_url: string | null;
  weight_unit: 'lb' | 'kg';
  plan_id: PlanId;
  subscription_status: SubscriptionStatus;
  created_at: string;
  updated_at: string;
}

export interface DbUserSubscription {
  user_id: string;
  plan_id: PlanId;
  status: SubscriptionStatus;
  product_id: string | null;
  expires_at: string | null;
  will_renew: boolean | null;
  store: string | null;
  updated_at: string;
}

export interface FeatureUsage {
  used: number;
  limit: number | null;
  remaining: number | null;
}

export interface UsageCheckResult {
  allowed: boolean;
  reason?: 'not_authenticated' | 'plan_required' | 'limit_exceeded';
  plan_id?: PlanId;
  used?: number;
  limit?: number;
  remaining?: number | null;
}
