-- Nyxoshi V17: indexes for profile/follow and relationship lookups.

create index if not exists follows_follower_id_idx
  on follows(follower_id, created_at desc);

create index if not exists blocks_blocker_id_idx
  on blocks(blocker_id, blocked_id);

create index if not exists blocks_blocked_id_idx
  on blocks(blocked_id, blocker_id);

create index if not exists user_mutes_muter_id_idx
  on user_mutes(muter_id, muted_id);

create index if not exists user_restrictions_restrictor_id_idx
  on user_restrictions(restrictor_id, restricted_id);
