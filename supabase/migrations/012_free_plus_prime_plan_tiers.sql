-- Forme plan simplification — Free / Plus / Prime (+ hidden admin)
-- Supabase Dashboard → SQL Editor 에서 실행

insert into plans (id, display_name, sort_order, is_active) values
  ('free', 'Free', 0, true),
  ('plus', 'Plus', 1, true),
  ('prime', 'Prime', 2, true)
on conflict (id) do update
set display_name = excluded.display_name,
    sort_order = excluded.sort_order,
    is_active = true;

update plans
set is_active = false
where id in ('basic', 'flex', 'pro', 'premium');

alter table profiles alter column plan_id set default 'free';
alter table user_subscriptions alter column plan_id set default 'free';

update user_subscriptions
set plan_id = case
  when plan_id = 'basic' then 'free'
  when plan_id = 'flex' then 'plus'
  when plan_id in ('pro', 'premium') then 'prime'
  else plan_id
end,
updated_at = now()
where plan_id in ('basic', 'flex', 'pro', 'premium');

update profiles
set plan_id = case
  when plan_id = 'basic' then 'free'
  when plan_id = 'flex' then 'plus'
  when plan_id in ('pro', 'premium') then 'prime'
  else plan_id
end,
updated_at = now()
where plan_id in ('basic', 'flex', 'pro', 'premium');

insert into plan_entitlements (plan_id, feature_key, limit_value, period) values
  -- Free: useful training log + limited Forme-paid AI. BYO API is open.
  ('free', 'routine_limit', 3, 'none'),
  ('free', 'custom_exercise_limit', 10, 'none'),
  ('free', 'coach_message', 20, 'monthly'),
  ('free', 'session_eval', 5, 'monthly'),
  ('free', 'goal_image', 0, 'none'),
  ('free', 'body_analysis', 0, 'none'),
  ('free', 'form_check_photo', 1, 'monthly'),
  ('free', 'form_check_video', 0, 'none'),
  ('free', 'pulse_post', 3, 'monthly'),
  ('free', 'cloud_sync', null, 'none'),
  ('free', 'bring_your_own_api', null, 'none'),

  -- Plus: lightweight paid training app, with modest Forme-paid coaching.
  ('plus', 'routine_limit', null, 'none'),
  ('plus', 'custom_exercise_limit', null, 'none'),
  ('plus', 'coach_message', 100, 'monthly'),
  ('plus', 'session_eval', 20, 'monthly'),
  ('plus', 'goal_image', 0, 'none'),
  ('plus', 'body_analysis', 1, 'monthly'),
  ('plus', 'form_check_photo', 3, 'monthly'),
  ('plus', 'form_check_video', 0, 'none'),
  ('plus', 'pulse_post', null, 'monthly'),
  ('plus', 'cloud_sync', null, 'none'),
  ('plus', 'bring_your_own_api', null, 'none'),

  -- Prime: full Forme AI coaching tier.
  ('prime', 'routine_limit', null, 'none'),
  ('prime', 'custom_exercise_limit', null, 'none'),
  ('prime', 'coach_message', 300, 'monthly'),
  ('prime', 'session_eval', 80, 'monthly'),
  ('prime', 'goal_image', 5, 'monthly'),
  ('prime', 'body_analysis', 4, 'monthly'),
  ('prime', 'form_check_photo', 30, 'monthly'),
  ('prime', 'form_check_video', 10, 'monthly'),
  ('prime', 'pulse_post', null, 'monthly'),
  ('prime', 'cloud_sync', null, 'none'),
  ('prime', 'bring_your_own_api', null, 'none')
on conflict (plan_id, feature_key) do update
set limit_value = excluded.limit_value,
    period = excluded.period;
