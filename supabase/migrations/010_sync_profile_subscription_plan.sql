-- Treat user_subscriptions as the subscription source of truth.
-- profiles.plan_id/subscription_status are denormalized display copies.
-- Supabase Dashboard → SQL Editor 에서 실행

drop trigger if exists profiles_sync_subscription_plan on profiles;
drop function if exists sync_subscription_from_profile();

create or replace function sync_profile_from_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles
  set plan_id = new.plan_id,
      subscription_status = new.status,
      updated_at = now()
  where id = new.user_id
    and (
      plan_id is distinct from new.plan_id
      or subscription_status is distinct from new.status
    );

  return new;
end;
$$;

drop trigger if exists user_subscriptions_sync_profile_plan on user_subscriptions;
create trigger user_subscriptions_sync_profile_plan
  after insert or update of plan_id, status on user_subscriptions
  for each row execute function sync_profile_from_subscription();

-- Make sure every profile has a subscription row, without overriding existing
-- subscription records. Existing user_subscriptions rows remain authoritative.
insert into user_subscriptions (user_id, plan_id, status, updated_at)
select p.id, p.plan_id, p.subscription_status, now()
from profiles p
where not exists (
  select 1 from user_subscriptions s where s.user_id = p.id
);

-- Align profile copies from the authoritative subscription table.
update profiles p
set plan_id = s.plan_id,
    subscription_status = s.status,
    updated_at = now()
from user_subscriptions s
where p.id = s.user_id
  and (
    p.plan_id is distinct from s.plan_id
    or p.subscription_status is distinct from s.status
  );
