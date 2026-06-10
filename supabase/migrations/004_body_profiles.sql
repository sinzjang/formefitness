-- 비공개 체형 분석 프로필
-- Goal/check-in 사진 분석 결과를 코치 컨텍스트로 재사용하기 위한 개인 데이터

create table if not exists body_profiles (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references profiles(id) on delete cascade,
  client_id                text not null,
  source                   text not null default 'goal_photo',
  photo_uri                text,
  captured_at              timestamptz not null,
  goal_tier                int check (goal_tier between 1 and 6),
  recommended_tier         int check (recommended_tier between 1 and 6),
  current_body_assessment  text not null,
  focus_areas              jsonb not null default '[]',
  avoid_areas              jsonb not null default '[]',
  key_exercises            jsonb not null default '[]',
  nutrition_tip            text,
  coach_notes              text not null,
  timeline_months          int,
  created_at               timestamptz default now(),
  updated_at               timestamptz default now(),
  unique (user_id, client_id)
);

create index if not exists body_profiles_user_captured_at
  on body_profiles (user_id, captured_at desc);

alter table body_profiles enable row level security;

create policy "body_profiles_own"
  on body_profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
