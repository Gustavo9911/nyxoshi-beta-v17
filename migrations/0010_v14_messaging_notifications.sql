-- Nyxoshi V14: messaging + notification improvements.

create table if not exists message_thread_preferences (
  user_id text not null,
  thread_id text not null,
  muted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, thread_id)
);
create index if not exists message_thread_preferences_thread_idx on message_thread_preferences(thread_id, user_id);

alter table notifications add column if not exists metadata text;
create index if not exists notifications_type_idx on notifications(user_id, type, created_at desc);
