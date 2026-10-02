-- Nyxoshi V7: founder-only security, group chats, message replies/reactions, global founder announcements.

alter table messages add column if not exists reply_to_id text;
create index if not exists messages_reply_idx on messages(reply_to_id);

create table if not exists message_groups (
  id text primary key,
  name text not null,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists message_group_members (
  group_id text not null,
  user_id text not null,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key(group_id,user_id)
);
create index if not exists message_group_members_user_idx on message_group_members(user_id,joined_at desc);

create table if not exists group_messages (
  id text primary key,
  group_id text not null,
  sender_id text not null,
  body text not null,
  reply_to_id text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists group_messages_group_idx on group_messages(group_id,created_at asc);
create index if not exists group_messages_reply_idx on group_messages(reply_to_id);

create table if not exists group_message_reactions (
  user_id text not null,
  message_id text not null,
  reaction text not null,
  created_at timestamptz not null default now(),
  primary key(user_id,message_id,reaction)
);

create table if not exists global_announcements (
  id text primary key,
  body text not null,
  created_by text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists global_announcements_active_idx on global_announcements(expires_at,created_at desc);

alter table reports add column if not exists target_message_id text;
create index if not exists reports_target_message_idx on reports(target_message_id);
