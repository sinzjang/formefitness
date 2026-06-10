-- workout_sessions — 시작 시각 (종료 후 수정 가능)
alter table workout_sessions
  add column if not exists started_at timestamptz;

-- 기존 행: ended_at과 동일하게 채움
update workout_sessions
set started_at = ended_at
where started_at is null;
