-- Nyxoshi V11: exclusive hardware-scientist role and persistent private laboratory.

create table if not exists hardware_lab_entries (
  id text primary key,
  author_id text not null,
  category text not null,
  title text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hardware_lab_entries_author_idx on hardware_lab_entries(author_id, updated_at desc);
create index if not exists hardware_lab_entries_category_idx on hardware_lab_entries(category, updated_at desc);
