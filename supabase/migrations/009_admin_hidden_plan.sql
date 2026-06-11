-- Forme internal plan — hidden ADMIN tier
-- Supabase Dashboard → SQL Editor 에서 실행

insert into plans (id, display_name, sort_order, is_active)
values ('admin', 'ADMIN', 99, false)
on conflict (id) do update
set display_name = excluded.display_name,
    sort_order = excluded.sort_order,
    is_active = false;

insert into plan_entitlements (plan_id, feature_key, limit_value, period) values
  ('admin', 'routine_limit', null, 'none'),
  ('admin', 'custom_exercise_limit', null, 'none'),
  ('admin', 'coach_message', null, 'monthly'),
  ('admin', 'session_eval', null, 'monthly'),
  ('admin', 'goal_image', null, 'monthly'),
  ('admin', 'body_analysis', null, 'monthly'),
  ('admin', 'form_check_photo', null, 'monthly'),
  ('admin', 'form_check_video', null, 'monthly'),
  ('admin', 'pulse_post', null, 'monthly'),
  ('admin', 'cloud_sync', null, 'none'),
  ('admin', 'bring_your_own_api', null, 'none')
on conflict (plan_id, feature_key) do update
set limit_value = excluded.limit_value,
    period = excluded.period;
