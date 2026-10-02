-- Nyxoshi beta: profiles, roles, moderation and real messaging.

alter table profiles add column if not exists banner_url text;
alter table profiles add column if not exists profile_gif_url text;
alter table profiles add column if not exists website_url text;

create table if not exists user_roles (
  user_id text primary key,
  role text not null default 'user',
  founder_number integer,
  muted_until timestamptz,
  shadow_banned boolean not null default false,
  banned_until timestamptz,
  ban_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists user_roles_role_idx on user_roles(role);

create table if not exists message_requests (
  id text primary key,
  sender_id text not null,
  recipient_id text not null,
  body text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists message_requests_recipient_idx on message_requests(recipient_id, status, created_at desc);
create index if not exists message_requests_sender_idx on message_requests(sender_id, created_at desc);

create table if not exists message_threads (
  id text primary key,
  user_a text not null,
  user_b text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_a, user_b)
);
create index if not exists message_threads_user_a_idx on message_threads(user_a, updated_at desc);
create index if not exists message_threads_user_b_idx on message_threads(user_b, updated_at desc);

create table if not exists messages (
  id text primary key,
  thread_id text not null,
  sender_id text not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  deleted_at timestamptz
);
create index if not exists messages_thread_idx on messages(thread_id, created_at asc);

create table if not exists notification_preferences (
  user_id text primary key,
  likes boolean not null default true,
  comments boolean not null default true,
  follows boolean not null default true,
  messages boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists privacy_preferences (
  user_id text primary key,
  message_policy text not null default 'requests',
  mention_policy text not null default 'everyone',
  discoverable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists moderation_actions (
  id text primary key,
  actor_id text not null,
  target_user_id text not null,
  action text not null,
  reason text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists moderation_actions_target_idx on moderation_actions(target_user_id, created_at desc);

create table if not exists audit_log (
  id text primary key,
  actor_id text not null,
  action text not null,
  target_user_id text,
  metadata text,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_created_idx on audit_log(created_at desc);
