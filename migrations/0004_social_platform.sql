-- Nyxoshi social platform layer: reactions, replies, reposts, quotes, bookmarks,
-- mentions, hashtags, mutes/restrictions and message reactions.

alter table comments add column if not exists parent_id text;
create index if not exists comments_parent_idx on comments(parent_id, created_at asc);

create table if not exists comment_reactions (
  user_id text not null,
  comment_id text not null,
  reaction text not null default 'like',
  created_at timestamptz not null default now(),
  primary key (user_id, comment_id, reaction)
);
create index if not exists comment_reactions_comment_idx on comment_reactions(comment_id, created_at desc);

create table if not exists post_reactions (
  user_id text not null,
  post_id text not null,
  reaction text not null default 'like',
  created_at timestamptz not null default now(),
  primary key (user_id, post_id, reaction)
);
create index if not exists post_reactions_post_idx on post_reactions(post_id, created_at desc);

create table if not exists reposts (
  user_id text not null,
  post_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index if not exists reposts_post_idx on reposts(post_id, created_at desc);
create index if not exists reposts_user_idx on reposts(user_id, created_at desc);

create table if not exists quotes (
  id text primary key,
  user_id text not null,
  post_id text not null,
  body text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists quotes_post_idx on quotes(post_id, created_at desc);
create index if not exists quotes_user_idx on quotes(user_id, created_at desc);

create table if not exists bookmarks (
  user_id text not null,
  post_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index if not exists bookmarks_user_idx on bookmarks(user_id, created_at desc);

create table if not exists mentions (
  id text primary key,
  post_id text,
  comment_id text,
  mentioned_user_id text not null,
  actor_id text not null,
  created_at timestamptz not null default now(),
  check ((post_id is not null) <> (comment_id is not null))
);
create index if not exists mentions_user_idx on mentions(mentioned_user_id, created_at desc);

create table if not exists hashtags (
  id text primary key,
  tag text not null unique,
  created_at timestamptz not null default now()
);
create table if not exists post_hashtags (
  post_id text not null,
  hashtag_id text not null,
  primary key (post_id, hashtag_id)
);
create index if not exists post_hashtags_tag_idx on post_hashtags(hashtag_id, post_id);

create table if not exists user_mutes (
  muter_id text not null,
  muted_id text not null,
  created_at timestamptz not null default now(),
  primary key (muter_id, muted_id)
);
create table if not exists user_restrictions (
  restrictor_id text not null,
  restricted_id text not null,
  created_at timestamptz not null default now(),
  primary key (restrictor_id, restricted_id)
);

alter table notification_preferences add column if not exists reposts boolean not null default true;
alter table notification_preferences add column if not exists mentions boolean not null default true;
alter table notification_preferences add column if not exists quotes boolean not null default true;
alter table notification_preferences add column if not exists reactions boolean not null default true;

alter table notifications add column if not exists comment_id text;
alter table notifications add column if not exists metadata text;

create table if not exists message_reactions (
  user_id text not null,
  message_id text not null,
  reaction text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, message_id, reaction)
);
create index if not exists message_reactions_message_idx on message_reactions(message_id, created_at desc);

create index if not exists posts_body_search_idx on posts using gin (to_tsvector('simple', body));
create index if not exists profiles_username_lower_idx on profiles (lower(username));
create index if not exists comments_body_search_idx on comments using gin (to_tsvector('simple', body));
create index if not exists notifications_unread_idx on notifications(user_id, read_at, created_at desc);

alter table posts add column if not exists quoted_post_id text;
create index if not exists posts_quoted_post_idx on posts(quoted_post_id);
