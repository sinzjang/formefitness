-- 커스텀 운동 측정 방식 + 개인 미디어

alter table custom_exercises
  add column if not exists measurement_type text not null default 'weight'
    check (measurement_type in ('weight', 'level', 'bodyweight', 'repsOnly')),
  add column if not exists media_uri text,
  add column if not exists media_type text
    check (media_type in ('gif', 'image'));
