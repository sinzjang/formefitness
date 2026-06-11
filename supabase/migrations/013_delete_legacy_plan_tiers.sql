-- Remove unused legacy plan rows now that the app uses Free / Plus / Prime.
-- Keeps hidden admin.
-- Supabase Dashboard → SQL Editor 에서 실행

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

delete from plan_entitlements
where plan_id in ('basic', 'flex', 'pro', 'premium');

delete from plans
where id in ('basic', 'flex', 'pro', 'premium');
