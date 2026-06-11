-- Forme Pulse — attach workout history snapshots to posts
-- Supabase Dashboard → SQL Editor 에서 실행

alter table social_posts
  add column if not exists workout_snapshot jsonb;
