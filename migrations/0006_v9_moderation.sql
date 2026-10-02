-- Nyxoshi V9: persistent report moderation, report moderators by user ID,
-- and audit fields for report decisions.

alter table reports add column if not exists status text not null default 'pending';
alter table reports add column if not exists target_type text;
alter table reports add column if not exists target_snapshot text;
alter table reports add column if not exists decision text;
alter table reports add column if not exists decision_reason text;
alter table reports add column if not exists resolved_by text;
alter table reports add column if not exists resolved_at timestamptz;

create index if not exists reports_status_idx on reports(status, created_at desc);
create index if not exists reports_resolved_by_idx on reports(resolved_by, resolved_at desc);

create table if not exists report_moderators (
  user_id text primary key,
  added_by text not null,
  created_at timestamptz not null default now()
);
create index if not exists report_moderators_added_by_idx on report_moderators(added_by, created_at desc);
