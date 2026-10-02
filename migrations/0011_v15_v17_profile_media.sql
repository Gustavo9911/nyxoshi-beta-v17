-- Nyxoshi V15–V17: profile personalization + post audio/video media.

alter table profiles add column if not exists theme_id text not null default 'nyxoshi';
alter table profiles add column if not exists background_id text not null default 'stars';
alter table profiles add column if not exists background_url text;
alter table profiles add column if not exists profile_effect text not null default 'glow';
alter table profiles add column if not exists profile_intro text not null default 'moonrise';
alter table profiles add column if not exists profile_intro_enabled boolean not null default true;
alter table profiles add column if not exists accent_color text not null default '#c084fc';

create index if not exists profiles_theme_idx on profiles(theme_id, background_id);

alter table posts add column if not exists media_url text;
alter table posts add column if not exists media_type text;
alter table posts add column if not exists media_alt text;
alter table posts add column if not exists media_duration_ms integer;
alter table posts add column if not exists media_thumbnail_url text;

alter table posts drop constraint if exists posts_media_type_check;
alter table posts add constraint posts_media_type_check
  check (media_type is null or media_type in ('audio','video','image'));

create index if not exists posts_media_type_idx on posts(media_type, created_at desc);
