// 구독 플랜 · 기능 한도 상태 (user_subscriptions 원장 + plan_entitlements)
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type {
  DbUserSubscription,
  FeatureKey,
  FeatureUsage,
  PlanId,
  SubscriptionStatus,
} from '../types/subscription';
import { normalizePlanId } from '../lib/planIds';

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
  isAdmin: () => boolean;
  isPlus: () => boolean;
  isPrime: () => boolean;
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

function isEntitledStatus(status: SubscriptionStatus): boolean {
  return status === 'active' || status === 'trialing' || status === 'grace_period';
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  ...INITIAL,

  reset: () => set({ ...INITIAL }),

  isAdmin: () => {
    const { planId, status } = get();
    return planId === 'admin' && isEntitledStatus(status);
  },

  isPlus: () => {
    const { planId, status } = get();
    return (
      planId === 'plus' ||
      planId === 'prime' ||
      planId === 'admin'
    ) && isEntitledStatus(status);
  },

  isPrime: () => {
    const { planId, status } = get();
    return (
      planId === 'prime' ||
      planId === 'admin'
    ) && isEntitledStatus(status);
  },

  canUse: (feature) => {
    if (get().isAdmin()) return true;
    const limit = get().limits[feature];
    if (limit === null || limit === undefined) return true;
    if (limit === 0) return false;
    const remaining = get().getRemaining(feature);
    return remaining === null || remaining > 0;
  },

  getRemaining: (feature) => {
    if (get().isAdmin()) return null;
    const limit = get().limits[feature];
    if (limit === null || limit === undefined) return null;
    const used = get().usage[feature]?.used ?? 0;
    return Math.max(0, limit - used);
  },

  refresh: async (userId) => {
    const periodKey = currentPeriodKey();

    const [profileRes, subRes, usageRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('plan_id, subscription_status')
        .eq('id', userId)
        .maybeSingle(),
      supabase.from('user_subscriptions').select('*').eq('user_id', userId).maybeSingle(),
      supabase
        .from('usage_events')
        .select('feature_key, quantity')
        .eq('user_id', userId)
        .eq('period_key', periodKey),
    ]);

    if (profileRes.error) throw profileRes.error;
    if (subRes.error) throw subRes.error;
    if (usageRes.error) throw usageRes.error;

    const subscription = subRes.data as DbUserSubscription | null;
    const planId = normalizePlanId(
      (subscription?.plan_id as PlanId | undefined) ??
      (profileRes.data?.plan_id as PlanId | undefined) ??
      'free'
    );
    const status =
      (subscription?.status as SubscriptionStatus | undefined) ??
      (profileRes.data?.subscription_status as SubscriptionStatus | undefined) ??
      'active';

    const entRes = await supabase
      .from('plan_entitlements')
      .select('feature_key, limit_value, period')
      .eq('plan_id', planId);

    /*
     * user_subscriptions is the authority. profiles keeps a denormalized copy
     * for display and older queries; the DB trigger in migration 010 also keeps
     * it aligned, but this repair covers clients opened before that trigger ran.
     */
    if (
      profileRes.data &&
      (
        profileRes.data.plan_id !== planId ||
        profileRes.data.subscription_status !== status
      )
    ) {
      void supabase
        .from('profiles')
        .update({ plan_id: planId, subscription_status: status })
        .eq('id', userId);
    }

    if (!subscription) {
      void supabase
        .from('user_subscriptions')
        .insert({ user_id: userId, plan_id: planId, status });
    }

    if (entRes.error) throw entRes.error;

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
      expiresAt: subscription?.expires_at ?? null,
      limits,
      usage,
      isReady: true,
    });
  },
}));
