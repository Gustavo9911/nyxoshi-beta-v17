-- Nyxoshi app schema. Identity lives in "user" (0001_auth.sql).
-- user_id is TEXT to match Better Auth ids (and the preview 'dev-user').

create table if not exists profiles (
  user_id text primary key,
  username text not null unique,
  display_name text not null,
  bio text not null default '',
  image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists posts (
  id text primary key,
  user_id text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists posts_user_id_idx on posts (user_id);
create index if not exists posts_created_at_idx on posts (created_at desc);

create table if not exists likes (
  user_id text not null,
  post_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index if not exists likes_post_id_idx on likes (post_id);

create table if not exists comments (
  id text primary key,
  post_id text not null,
  user_id text not null,
  body text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists comments_post_id_idx on comments (post_id);

create table if not exists follows (
  follower_id text not null,
  following_id text not null,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id)
);

create index if not exists follows_following_id_idx on follows (following_id);

create table if not exists notifications (
  id text primary key,
  user_id text not null,
  actor_id text not null,
  type text not null,
  post_id text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on notifications (user_id, created_at desc);

create table if not exists blocks (
  blocker_id text not null,
  blocked_id text not null,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

create table if not exists reports (
  id text primary key,
  reporter_id text not null,
  target_user_id text,
  target_post_id text,
  reason text not null,
  created_at timestamptz not null default now()
);
