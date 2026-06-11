-- Forme Pulse — public social feed
-- Supabase Dashboard → SQL Editor 에서 실행

alter table profiles add column if not exists username text;
alter table profiles add column if not exists bio text;
alter table profiles add column if not exists avatar_url text;

create unique index if not exists profiles_username_unique
  on profiles (lower(username))
  where username is not null and length(trim(username)) > 0;

create table if not exists social_posts (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references profiles(id) on delete cascade,
  image_path  text not null,
  caption     text not null default '',
  visibility  text not null default 'public' check (visibility in ('public', 'followers')),
  status      text not null default 'active' check (status in ('active', 'deleted')),
  like_count  int not null default 0 check (like_count >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists social_posts_public_created_at
  on social_posts (created_at desc)
  where visibility = 'public' and status = 'active';

create index if not exists social_posts_author_created_at
  on social_posts (author_id, created_at desc);

create table if not exists social_post_likes (
  post_id    uuid not null references social_posts(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists social_post_likes_user_created_at
  on social_post_likes (user_id, created_at desc);

create table if not exists social_follows (
  follower_id  uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists social_follows_following_created_at
  on social_follows (following_id, created_at desc);

create or replace function update_social_post_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update social_posts
      set like_count = like_count + 1,
          updated_at = now()
      where id = new.post_id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    update social_posts
      set like_count = greatest(0, like_count - 1),
          updated_at = now()
      where id = old.post_id;
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists social_post_likes_count_insert on social_post_likes;
create trigger social_post_likes_count_insert
  after insert on social_post_likes
  for each row execute function update_social_post_like_count();

drop trigger if exists social_post_likes_count_delete on social_post_likes;
create trigger social_post_likes_count_delete
  after delete on social_post_likes
  for each row execute function update_social_post_like_count();

create or replace view public_profiles as
select
  p.id,
  coalesce(nullif(trim(p.username), ''), nullif(trim(p.display_name), ''), 'Guest') as display_name,
  p.username,
  p.bio,
  p.avatar_url,
  coalesce(followers.count, 0)::int as follower_count,
  coalesce(following.count, 0)::int as following_count
from profiles p
left join lateral (
  select count(*) from social_follows sf where sf.following_id = p.id
) followers on true
left join lateral (
  select count(*) from social_follows sf where sf.follower_id = p.id
) following on true;

grant select on public_profiles to anon, authenticated;
grant select on social_posts to anon, authenticated;
grant select on social_post_likes to anon, authenticated;
grant select on social_follows to anon, authenticated;
grant insert, update, delete on social_posts to authenticated;
grant insert, delete on social_post_likes to authenticated;
grant insert, delete on social_follows to authenticated;

alter table social_posts enable row level security;
alter table social_post_likes enable row level security;
alter table social_follows enable row level security;

create policy "social_posts_public_read"
  on social_posts for select
  using (status = 'active' and visibility = 'public');

create policy "social_posts_insert_own"
  on social_posts for insert
  with check (auth.uid() = author_id);

create policy "social_posts_update_own"
  on social_posts for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "social_posts_delete_own"
  on social_posts for delete
  using (auth.uid() = author_id);

create policy "social_post_likes_read"
  on social_post_likes for select
  using (true);

create policy "social_post_likes_insert_own"
  on social_post_likes for insert
  with check (auth.uid() = user_id);

create policy "social_post_likes_delete_own"
  on social_post_likes for delete
  using (auth.uid() = user_id);

create policy "social_follows_read"
  on social_follows for select
  using (true);

create policy "social_follows_insert_own"
  on social_follows for insert
  with check (auth.uid() = follower_id);

create policy "social_follows_delete_own"
  on social_follows for delete
  using (auth.uid() = follower_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pulse-posts',
  'pulse-posts',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "pulse_posts_public_read"
  on storage.objects for select
  using (bucket_id = 'pulse-posts');

create policy "pulse_posts_insert_own_folder"
  on storage.objects for insert
  with check (
    bucket_id = 'pulse-posts'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "pulse_posts_update_own_folder"
  on storage.objects for update
  using (
    bucket_id = 'pulse-posts'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "pulse_posts_delete_own_folder"
  on storage.objects for delete
  using (
    bucket_id = 'pulse-posts'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
