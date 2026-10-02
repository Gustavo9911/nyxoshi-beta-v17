-- Nyxoshi V13: hardened moderation state and privileged-role revocation.

alter table user_roles add column if not exists permanent_ban boolean not null default false;
alter table user_roles add column if not exists punishment_reason text;
alter table user_roles add column if not exists punished_at timestamptz;
alter table user_roles add column if not exists punished_by text;
alter table user_roles add column if not exists revoked_role text;
alter table user_roles add column if not exists revoked_founder_number integer;
create index if not exists user_roles_punishment_idx on user_roles(permanent_ban, shadow_banned, banned_until, muted_until);
create index if not exists moderation_actions_actor_idx on moderation_actions(actor_id, created_at desc);
create table if not exists moderation_case_notes (id text primary key,target_user_id text not null,actor_id text not null,note text not null,created_at timestamptz not null default now());
create index if not exists moderation_case_notes_target_idx on moderation_case_notes(target_user_id, created_at desc);
