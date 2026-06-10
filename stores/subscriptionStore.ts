// 구독 플랜 · 기능 한도 상태 (Supabase profiles + plan_entitlements)
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type {
  DbUserSubscription,
  FeatureKey,
  FeatureUsage,
  PlanId,
  SubscriptionStatus,
} from '../types/subscription';

interface EntitlementRow {
  feature_key: string;
  limit_value: number | null;
  period: string;
}

interface SubscriptionState {
  planId: PlanId;
  status: SubscriptionStatus;
  expiresAt: string | null;
  usage: Partial<Record<FeatureKey, FeatureUsage>>;
  limits: Partial<Record<FeatureKey, number | null>>;
  isReady: boolean;
  refresh: (userId: string) => Promise<void>;
  reset: () => void;
  isPro: () => boolean;
  canUse: (feature: FeatureKey) => boolean;
  getRemaining: (feature: FeatureKey) => number | null;
}

const INITIAL: Pick<SubscriptionState, 'planId' | 'status' | 'expiresAt' | 'usage' | 'limits' | 'isReady'> = {
  planId: 'free',
  status: 'active',
  expiresAt: null,
  usage: {},
  limits: {},
  isReady: false,
};

function currentPeriodKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  ...INITIAL,

  reset: () => set({ ...INITIAL }),

  isPro: () => {
    const { planId, status } = get();
    return planId === 'pro' && (status === 'active' || status === 'trialing');
  },

  canUse: (feature) => {
    const limit = get().limits[feature];
    if (limit === null || limit === undefined) return true;
    if (limit === 0) return false;
    const remaining = get().getRemaining(feature);
    return remaining === null || remaining > 0;
  },

  getRemaining: (feature) => {
    const limit = get().limits[feature];
    if (limit === null || limit === undefined) return null;
    const used = get().usage[feature]?.used ?? 0;
    return Math.max(0, limit - used);
  },

  refresh: async (userId) => {
    const periodKey = currentPeriodKey();

    const profileRes = await supabase
      .from('profiles')
      .select('plan_id, subscription_status')
      .eq('id', userId)
      .maybeSingle();

    const planId = (profileRes.data?.plan_id as PlanId | undefined) ?? 'free';

    const [subRes, entRes, usageRes] = await Promise.all([
      supabase.from('user_subscriptions').select('*').eq('user_id', userId).maybeSingle(),
      supabase
        .from('plan_entitlements')
        .select('feature_key, limit_value, period')
        .eq('plan_id', planId),
      supabase
        .from('usage_events')
        .select('feature_key, quantity')
        .eq('user_id', userId)
        .eq('period_key', periodKey),
    ]);
    const status =
      (profileRes.data?.subscription_status as SubscriptionStatus | undefined) ??
      (subRes.data as DbUserSubscription | null)?.status ??
      'active';

    const limits: Partial<Record<FeatureKey, number | null>> = {};
    for (const row of (entRes.data ?? []) as EntitlementRow[]) {
      limits[row.feature_key as FeatureKey] = row.limit_value;
    }

    const usage: Partial<Record<FeatureKey, FeatureUsage>> = {};
    for (const row of usageRes.data ?? []) {
      const key = row.feature_key as FeatureKey;
      const prev = usage[key]?.used ?? 0;
      const limit = limits[key] ?? null;
      const used = prev + (row.quantity ?? 1);
      usage[key] = {
        used,
        limit,
        remaining: limit === null ? null : Math.max(0, limit - used),
      };
    }

    // 사용 기록 없는 기능도 limit 표시
    for (const [key, limit] of Object.entries(limits)) {
      const fk = key as FeatureKey;
      if (!usage[fk]) {
        usage[fk] = { used: 0, limit, remaining: limit };
      }
    }

    set({
      planId,
      status,
      expiresAt: (subRes.data as DbUserSubscription | null)?.expires_at ?? null,
      limits,
      usage,
      isReady: true,
    });
  },
}));
