// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.107.0';

type PlanId = 'free' | 'plus' | 'prime';
type SubscriptionStatus = 'active' | 'trialing' | 'canceled' | 'expired' | 'grace_period';

interface RevenueCatEvent {
  id?: string;
  type?: string;
  app_user_id?: string;
  product_id?: string;
  entitlement_id?: string;
  entitlement_ids?: string[];
  expiration_at_ms?: number | null;
  purchased_at_ms?: number | null;
  original_transaction_id?: string | null;
  store?: string | null;
  environment?: string | null;
}

interface RevenueCatPayload {
  event?: RevenueCatEvent;
}

const DEFAULT_ENTITLEMENT_TO_PLAN: Record<string, PlanId> = {
  plus: 'plus',
  prime: 'prime',
  flex: 'plus',
  pro: 'prime',
  premium: 'prime',
};

const DEFAULT_PRODUCT_TO_PLAN: Record<string, PlanId> = {
  forme_plus_monthly: 'plus',
  forme_plus_yearly: 'plus',
  forme_prime_monthly: 'prime',
  forme_prime_yearly: 'prime',
  forme_flex_monthly: 'plus',
  forme_flex_yearly: 'plus',
  forme_pro_monthly: 'prime',
  forme_pro_yearly: 'prime',
  forme_premium_monthly: 'prime',
  forme_premium_yearly: 'prime',
};

const PLAN_PRIORITY: Record<PlanId, number> = {
  free: 0,
  plus: 1,
  prime: 2,
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function parseMapping(envName: string, fallback: Record<string, PlanId>) {
  const raw = Deno.env.get(envName);
  if (!raw) return fallback;
  try {
    return { ...fallback, ...(JSON.parse(raw) as Record<string, PlanId>) };
  } catch {
    return fallback;
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function choosePlan(event: RevenueCatEvent): PlanId {
  const entitlementToPlan = parseMapping(
    'REVENUECAT_ENTITLEMENT_TO_PLAN_JSON',
    DEFAULT_ENTITLEMENT_TO_PLAN
  );
  const productToPlan = parseMapping('REVENUECAT_PRODUCT_TO_PLAN_JSON', DEFAULT_PRODUCT_TO_PLAN);
  const entitlementIds = [
    ...(event.entitlement_ids ?? []),
    event.entitlement_id,
  ].filter((value): value is string => Boolean(value));

  const entitlementPlans = entitlementIds
    .map((id) => entitlementToPlan[id])
    .filter((value): value is PlanId => Boolean(value));

  if (entitlementPlans.length > 0) {
    return entitlementPlans.sort((a, b) => PLAN_PRIORITY[b] - PLAN_PRIORITY[a])[0];
  }

  if (event.product_id && productToPlan[event.product_id]) {
    return productToPlan[event.product_id];
  }

  return 'free';
}

function statusForEvent(event: RevenueCatEvent): {
  planId: PlanId;
  status: SubscriptionStatus;
  willRenew: boolean | null;
} {
  const type = event.type ?? 'UNKNOWN';
  const purchasedPlan = choosePlan(event);

  if (type === 'EXPIRATION' || type === 'REFUND' || type === 'SUBSCRIPTION_PAUSED') {
    return { planId: 'free', status: 'expired', willRenew: false };
  }

  if (type === 'BILLING_ISSUE') {
    return { planId: purchasedPlan, status: 'grace_period', willRenew: true };
  }

  if (type === 'CANCELLATION') {
    return { planId: purchasedPlan, status: 'active', willRenew: false };
  }

  if (type === 'UNCANCELLATION' || type === 'RENEWAL' || type === 'INITIAL_PURCHASE') {
    return { planId: purchasedPlan, status: 'active', willRenew: true };
  }

  if (type === 'PRODUCT_CHANGE' || type === 'SUBSCRIPTION_EXTENDED') {
    return { planId: purchasedPlan, status: 'active', willRenew: true };
  }

  const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms) : null;
  if (expiresAt && expiresAt.getTime() <= Date.now()) {
    return { planId: 'free', status: 'expired', willRenew: false };
  }

  return { planId: purchasedPlan, status: 'active', willRenew: null };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  const expectedAuth = Deno.env.get('REVENUECAT_WEBHOOK_AUTH')?.trim();
  if (expectedAuth) {
    const actualAuth = req.headers.get('authorization')?.trim();
    if (actualAuth !== expectedAuth) {
      return jsonResponse({ error: 'unauthorized' }, 401);
    }
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'missing_supabase_env' }, 500);
  }

  const payload = (await req.json()) as RevenueCatPayload;
  const event = payload.event;
  if (!event?.id || !event.app_user_id) {
    return jsonResponse({ error: 'invalid_revenuecat_event' }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const insertedEvent = await supabase
    .from('revenuecat_webhook_events')
    .insert({
      id: event.id,
      app_user_id: event.app_user_id,
      event_type: event.type ?? null,
      product_id: event.product_id ?? null,
      environment: event.environment ?? null,
      payload,
    });

  if (insertedEvent.error) {
    if (insertedEvent.error.code === '23505') {
      return jsonResponse({ ok: true, duplicate: true });
    }
    throw insertedEvent.error;
  }

  if (!isUuid(event.app_user_id)) {
    return jsonResponse({ error: 'app_user_id_must_be_supabase_user_uuid' }, 400);
  }

  const { planId, status, willRenew } = statusForEvent(event);
  const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;

  const upsert = await supabase
    .from('user_subscriptions')
    .upsert(
      {
        user_id: event.app_user_id,
        plan_id: planId,
        status,
        revenuecat_app_user_id: event.app_user_id,
        product_id: event.product_id ?? null,
        expires_at: expiresAt,
        will_renew: willRenew,
        store: event.store ?? null,
        environment: event.environment ?? null,
        original_transaction_id: event.original_transaction_id ?? null,
        last_event_type: event.type ?? null,
        last_revenuecat_event_id: event.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (upsert.error) throw upsert.error;

  return jsonResponse({
    ok: true,
    eventId: event.id,
    userId: event.app_user_id,
    planId,
    status,
  });
});
