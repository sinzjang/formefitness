-- Forme plan tiers — Basic / Flex / Pro / Premium
-- Flex: workout features unlocked, AI requires bring-your-own API key

insert into plans (id, display_name, sort_order, is_active) values
  ('basic', 'Basic', 0, true),
  ('flex', 'Flex', 1, true),
  ('pro', 'Pro', 2, true),
  ('premium', 'Premium', 3, true)
on conflict (id) do update
set display_name = excluded.display_name,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active;

-- 기존 free는 하위 호환용으로 유지하되 Basic과 같은 역할
update plans
set display_name = 'Basic (legacy)', sort_order = 0, is_active = true
where id = 'free';

alter table profiles alter column plan_id set default 'basic';
alter table user_subscriptions alter column plan_id set default 'basic';

insert into plan_entitlements (plan_id, feature_key, limit_value, period) values
  -- Basic: try the app, limited AI/social
  ('basic', 'routine_limit', 3, 'none'),
  ('basic', 'custom_exercise_limit', 10, 'none'),
  ('basic', 'coach_message', 20, 'monthly'),
  ('basic', 'session_eval', 5, 'monthly'),
  ('basic', 'goal_image', 0, 'none'),
  ('basic', 'body_analysis', 0, 'none'),
  ('basic', 'form_check_photo', 1, 'monthly'),
  ('basic', 'form_check_video', 0, 'none'),
  ('basic', 'pulse_post', 5, 'monthly'),
  ('basic', 'cloud_sync', null, 'none'),
  ('basic', 'bring_your_own_api', 0, 'none'),

  -- Flex: workout app unlocked, AI via user API key
  ('flex', 'routine_limit', null, 'none'),
  ('flex', 'custom_exercise_limit', null, 'none'),
  ('flex', 'coach_message', 0, 'none'),
  ('flex', 'session_eval', 0, 'none'),
  ('flex', 'goal_image', 0, 'none'),
  ('flex', 'body_analysis', 0, 'none'),
  ('flex', 'form_check_photo', 0, 'none'),
  ('flex', 'form_check_video', 0, 'none'),
  ('flex', 'pulse_post', null, 'monthly'),
  ('flex', 'cloud_sync', null, 'none'),
  ('flex', 'bring_your_own_api', null, 'none'),

  -- Pro: Forme AI included
  ('pro', 'routine_limit', null, 'none'),
  ('pro', 'custom_exercise_limit', null, 'none'),
  ('pro', 'coach_message', 300, 'monthly'),
  ('pro', 'session_eval', 60, 'monthly'),
  ('pro', 'goal_image', 3, 'monthly'),
  ('pro', 'body_analysis', 4, 'monthly'),
  ('pro', 'form_check_photo', 20, 'monthly'),
  ('pro', 'form_check_video', 8, 'monthly'),
  ('pro', 'pulse_post', null, 'monthly'),
  ('pro', 'cloud_sync', null, 'none'),
  ('pro', 'bring_your_own_api', null, 'none'),

  -- Premium: advanced coaching and high form-check allowance
  ('premium', 'routine_limit', null, 'none'),
  ('premium', 'custom_exercise_limit', null, 'none'),
  ('premium', 'coach_message', null, 'monthly'),
  ('premium', 'session_eval', null, 'monthly'),
  ('premium', 'goal_image', 10, 'monthly'),
  ('premium', 'body_analysis', 12, 'monthly'),
  ('premium', 'form_check_photo', 80, 'monthly'),
  ('premium', 'form_check_video', 40, 'monthly'),
  ('premium', 'pulse_post', null, 'monthly'),
  ('premium', 'cloud_sync', null, 'none'),
  ('premium', 'bring_your_own_api', null, 'none')
on conflict (plan_id, feature_key) do update
set limit_value = excluded.limit_value,
    period = excluded.period;
