-- Forme Fitness — 초기 스키마 (프로필 · 운동 데이터 · 구독 · 사용량)
-- Supabase Dashboard → SQL Editor 에서 실행

-- ─── 플랜 카탈로그 ───────────────────────────────────────────
create table if not exists plans (
  id           text primary key,
  display_name text not null,
  sort_order   int not null default 0,
  is_active    boolean default true,
  created_at   timestamptz default now()
);

insert into plans (id, display_name, sort_order) values
  ('free', 'Free', 0),
  ('pro',  'Pro',  1)
on conflict (id) do nothing;

create table if not exists plan_entitlements (
  plan_id     text not null references plans(id),
  feature_key text not null,
  limit_value int,
  period      text not null default 'monthly',
  primary key (plan_id, feature_key)
);

insert into plan_entitlements (plan_id, feature_key, limit_value, period) values
  ('free', 'coach_message',  20,   'monthly'),
  ('free', 'session_eval',   5,    'monthly'),
  ('free', 'goal_image',     0,    'none'),
  ('free', 'cloud_sync',     null, 'none'),
  ('pro',  'coach_message',  null, 'monthly'),
  ('pro',  'session_eval',   null, 'monthly'),
  ('pro',  'goal_image',     3,    'monthly'),
  ('pro',  'cloud_sync',     null, 'none')
on conflict (plan_id, feature_key) do nothing;

-- ─── 프로필 ─────────────────────────────────────────────────
create table if not exists profiles (
  id                  uuid primary key references auth.users on delete cascade,
  display_name        text,
  email               text,
  goal_tier           int check (goal_tier between 1 and 6),
  goal_image_url      text,
  weight_unit         text not null default 'lb' check (weight_unit in ('lb', 'kg')),
  plan_id             text not null default 'free' references plans(id),
  subscription_status text not null default 'active',
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create table if not exists user_settings (
  user_id               uuid primary key references profiles(id) on delete cascade,
  language              text not null default 'ko',
  coach_name            text not null default 'Kai',
  default_rest_seconds  int not null default 60,
  rest_alerts_enabled   boolean not null default true,
  condition_sleep       int not null default 3,
  condition_fatigue     int not null default 3,
  updated_at            timestamptz default now()
);

-- ─── 구독 (RevenueCat 웹훅 동기화) ───────────────────────────
create table if not exists user_subscriptions (
  user_id                uuid primary key references profiles(id) on delete cascade,
  plan_id                text not null default 'free' references plans(id),
  status                 text not null default 'active',
  revenuecat_app_user_id text,
  product_id             text,
  expires_at             timestamptz,
  trial_ends_at          timestamptz,
  will_renew               boolean,
  store                  text,
  updated_at             timestamptz default now()
);

-- ─── 운동 데이터 ─────────────────────────────────────────────
create table if not exists workout_locations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  client_id  text not null,
  name       text not null,
  is_system  boolean default false,
  color      text,
  created_at timestamptz default now(),
  unique (user_id, client_id)
);

create table if not exists workout_routines (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  client_id   text not null,
  location_id uuid references workout_locations(id) on delete set null,
  name        text not null,
  exercises   jsonb not null default '[]',
  is_active   boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (user_id, client_id)
);

create table if not exists workout_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  client_id   text not null,
  location_id uuid references workout_locations(id) on delete set null,
  routine_id  uuid references workout_routines(id) on delete set null,
  ended_at    timestamptz not null,
  exercises   jsonb not null default '[]',
  created_at  timestamptz default now(),
  unique (user_id, client_id)
);

create table if not exists custom_exercises (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  client_id    text not null,
  name         text not null,
  muscle_group text not null,
  gear         text not null,
  is_active    boolean default true,
  is_favorite  boolean default false,
  created_at   timestamptz default now(),
  unique (user_id, client_id)
);

create table if not exists exercise_catalog_prefs (
  user_id     uuid not null references profiles(id) on delete cascade,
  exercise_key text not null,
  is_active   boolean,
  is_favorite boolean,
  primary key (user_id, exercise_key)
);

-- ─── 사용량 ledger ───────────────────────────────────────────
create table if not exists usage_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  feature_key text not null,
  quantity    int not null default 1,
  period_key  text not null,
  metadata    jsonb default '{}',
  created_at  timestamptz default now()
);

create index if not exists usage_events_user_feature_period
  on usage_events (user_id, feature_key, period_key);

-- ─── 가입 트리거 ─────────────────────────────────────────────
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.email, new.raw_user_meta_data->>'email')
  );
  insert into user_settings (user_id) values (new.id);
  insert into user_subscriptions (user_id, plan_id, status)
  values (new.id, 'free', 'active');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─── 한도 확인 RPC (Edge Function / 클라이언트에서 호출) ─────
create or replace function check_and_consume_usage(
  p_feature_key text,
  p_quantity int default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id    uuid := auth.uid();
  v_plan_id    text;
  v_limit      int;
  v_period_key text := to_char(now(), 'YYYY-MM');
  v_used       int;
begin
  if v_user_id is null then
    return jsonb_build_object('allowed', false, 'reason', 'not_authenticated');
  end if;

  select plan_id into v_plan_id from profiles where id = v_user_id;

  select limit_value into v_limit
  from plan_entitlements
  where plan_id = v_plan_id and feature_key = p_feature_key;

  if v_limit is null then
    insert into usage_events (user_id, feature_key, quantity, period_key)
    values (v_user_id, p_feature_key, p_quantity, v_period_key);
    return jsonb_build_object('allowed', true, 'remaining', null, 'plan_id', v_plan_id);
  end if;

  if v_limit = 0 then
    return jsonb_build_object('allowed', false, 'reason', 'plan_required', 'plan_id', v_plan_id);
  end if;

  select coalesce(sum(quantity), 0) into v_used
  from usage_events
  where user_id = v_user_id
    and feature_key = p_feature_key
    and period_key = v_period_key;

  if v_used + p_quantity > v_limit then
    return jsonb_build_object(
      'allowed', false, 'reason', 'limit_exceeded',
      'used', v_used, 'limit', v_limit, 'plan_id', v_plan_id
    );
  end if;

  insert into usage_events (user_id, feature_key, quantity, period_key)
  values (v_user_id, p_feature_key, p_quantity, v_period_key);

  return jsonb_build_object(
    'allowed', true,
    'used', v_used + p_quantity,
    'limit', v_limit,
    'remaining', v_limit - v_used - p_quantity,
    'plan_id', v_plan_id
  );
end;
$$;

-- ─── RLS ─────────────────────────────────────────────────────
alter table plans enable row level security;
alter table plan_entitlements enable row level security;
alter table profiles enable row level security;
alter table user_settings enable row level security;
alter table user_subscriptions enable row level security;
alter table workout_locations enable row level security;
alter table workout_routines enable row level security;
alter table workout_sessions enable row level security;
alter table custom_exercises enable row level security;
alter table exercise_catalog_prefs enable row level security;
alter table usage_events enable row level security;

-- 플랜 카탈로그: 읽기 전용 공개
create policy "plans_read" on plans for select using (true);
create policy "entitlements_read" on plan_entitlements for select using (true);

-- 프로필
create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

-- 설정
create policy "settings_select_own" on user_settings for select using (auth.uid() = user_id);
create policy "settings_update_own" on user_settings for update using (auth.uid() = user_id);
create policy "settings_insert_own" on user_settings for insert with check (auth.uid() = user_id);

-- 구독: 읽기만 (쓰기는 service_role 웹훅)
create policy "subscriptions_select_own" on user_subscriptions for select using (auth.uid() = user_id);

-- 운동 데이터
create policy "locations_own" on workout_locations for all using (auth.uid() = user_id);
create policy "routines_own" on workout_routines for all using (auth.uid() = user_id);
create policy "sessions_own" on workout_sessions for all using (auth.uid() = user_id);
create policy "custom_exercises_own" on custom_exercises for all using (auth.uid() = user_id);
create policy "catalog_prefs_own" on exercise_catalog_prefs for all using (auth.uid() = user_id);

-- 사용량: 본인 읽기만 (insert는 RPC)
create policy "usage_select_own" on usage_events for select using (auth.uid() = user_id);
