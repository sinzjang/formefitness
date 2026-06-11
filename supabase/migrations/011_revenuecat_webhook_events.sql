-- RevenueCat webhook idempotency and subscription metadata
-- Supabase Dashboard → SQL Editor 에서 실행

alter table user_subscriptions add column if not exists environment text;
alter table user_subscriptions add column if not exists original_transaction_id text;
alter table user_subscriptions add column if not exists last_event_type text;
alter table user_subscriptions add column if not exists last_revenuecat_event_id text;

create table if not exists revenuecat_webhook_events (
  id text primary key,
  app_user_id text,
  event_type text,
  product_id text,
  environment text,
  received_at timestamptz not null default now(),
  payload jsonb not null default '{}'
);

create index if not exists revenuecat_webhook_events_app_user_received
  on revenuecat_webhook_events (app_user_id, received_at desc);
