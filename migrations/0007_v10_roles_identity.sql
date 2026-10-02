-- Nyxoshi V10: expanded role system, immutable profile IDs and email/ID role assignments.

alter table profiles add column if not exists permanent_id text;
update profiles
set permanent_id = concat('nyx_', md5(random()::text || clock_timestamp()::text))
where permanent_id is null;
alter table profiles alter column permanent_id set not null;
create unique index if not exists profiles_permanent_id_idx on profiles(permanent_id);

alter table user_roles add column if not exists assignment_source text not null default 'manual';
alter table user_roles add column if not exists assignment_key text;
create index if not exists user_roles_assignment_idx on user_roles(assignment_source, assignment_key);

-- Founders #1/#2/#3 are email-defined only. The special roles below are also email-defined.
-- Sub Founders are assigned by the immutable user/profile ID through the founder panel.

-- V9 allowed manual founder assignment; V10 removes that path. Correct founder emails are restored by syncRoleForUser.
update user_roles set role='user', founder_number=null, assignment_source='manual', assignment_key=null, updated_at=now() where role='founder';
