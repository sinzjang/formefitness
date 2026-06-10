-- profiles에 이메일 컬럼 추가 + 가입 트리거에서 이메일 저장

alter table profiles add column if not exists email text;

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

-- 기존 가입자: auth.users 이메일을 profiles에 백필 (SQL Editor에서 한 번 실행)
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and p.email is null
  and u.email is not null;
