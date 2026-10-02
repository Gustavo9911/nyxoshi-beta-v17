import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql, type Sql } from "@/lib/db";
import { optionalAuthMiddleware } from "./optional-auth";
import type {
  CommentCard,
  FeedTab,
  NotificationCard,
  PostCard,
  Profile,
} from "./types";
import { slugifyUsername } from "./usernames";
import { getRole, requireFounder, requireAngelGirl, requireHardwareScientist, requireReportModerator, requireModerationAdmin, requireRole, syncRoleForUser, type NyxoshiRole } from "./roles";
import {
  createCommentSchema,
  createPostSchema,
  feedQuerySchema,
  reportSchema,
  searchQuerySchema,
  updateProfileSchema,
  sendMessageSchema,
  messageDecisionSchema,
  moderationSchema,
  roleSchema,
  reactionSchema,
  quotePostSchema,
  reportDecisionSchema,
  reportModeratorSchema,
} from "./validations";

type ProfileRow = {
  user_id: string;
  username: string;
  display_name: string;
  bio: string;
  image: string | null;
  banner_url: string | null;
  profile_gif_url: string | null;
  website_url: string | null;
  theme_id: string;
  background_id: string;
  background_url: string | null;
  profile_effect: string;
  profile_intro: string;
  profile_intro_enabled: boolean;
  accent_color: string;
  created_at: string;
  permanent_id?: string;
};

type PostRow = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  username: string;
  display_name: string;
  image: string | null;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  reaction_count: number;
  repost_count: number;
  quote_count: number;
  bookmarked_by_me: boolean;
  reposted_by_me: boolean;
  author_role?: string | null;
  author_founder_number?: number | null;
  quoted_post_id?: string | null;
  quoted_body?: string | null;
  quoted_created_at?: string | null;
  quoted_user_id?: string | null;
  quoted_username?: string | null;
  quoted_display_name?: string | null;
  quoted_image?: string | null;
  quoted_role?: string | null;
  quoted_founder_number?: number | null;
  media_url?: string | null;
  media_type?: "audio" | "video" | "image" | null;
  media_alt?: string | null;
  media_duration_ms?: number | null;
  media_thumbnail_url?: string | null;
};

function asIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  const text = String(value ?? "");
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString();
}

function profileMediaUrl(value: string | null | undefined, userId: string, kind: "image" | "banner" | "gif" | "background", inline = false): string | null {
  if (!value) return null;
  return !inline && value.startsWith("data:") ? `/api/profile-media/${encodeURIComponent(userId)}?kind=${kind}` : value;
}

function inferPostMediaType(value: string): "audio" | "video" | "image" {
  if (value.startsWith("data:audio/")) return "audio";
  if (value.startsWith("data:video/")) return "video";
  if (value.startsWith("data:image/")) return "image";
  try {
    const path = new URL(value).pathname.toLowerCase();
    if (/\.(mp3|wav|ogg|m4a|aac|flac|opus|webm)$/.test(path)) return "audio";
    if (/\.(mp4|webm|mov|m4v|ogv)$/.test(path)) return "video";
  } catch {
    // The validator already rejects non-http(s) and unknown direct-media URLs.
  }
  return "image";
}

function mapPost(row: PostRow): PostCard {
  return {
    id: row.id,
    body: row.body,
    createdAt: asIso(row.created_at),
    mediaUrl: row.media_url?.startsWith("data:") ? `/api/media/${row.id}` : (row.media_url ?? null),
    mediaType: row.media_type ?? null,
    mediaAlt: row.media_alt ?? null,
    mediaDurationMs: row.media_duration_ms ?? null,
    mediaThumbnailUrl: row.media_thumbnail_url?.startsWith("data:") ? `/api/media/${encodeURIComponent(row.id)}?part=thumbnail` : (row.media_thumbnail_url ?? null),
    author: {
      userId: row.user_id,
      username: row.username,
      displayName: row.display_name,
      image: profileMediaUrl(row.image, row.user_id, "image"),
      role: row.author_role,
      founderNumber: row.author_founder_number,
    },
    quotedPost: row.quoted_post_id && row.quoted_user_id ? {
      id: row.quoted_post_id, body: row.quoted_body ?? "", createdAt: asIso(row.quoted_created_at),
      author: { userId: row.quoted_user_id, username: row.quoted_username ?? "", displayName: row.quoted_display_name ?? "", image: profileMediaUrl(row.quoted_image, row.quoted_user_id, "image"), role: row.quoted_role ?? undefined, founderNumber: row.quoted_founder_number ?? null }
    } : null,
    likeCount: Number(row.like_count) || 0,
    commentCount: Number(row.comment_count) || 0,
    likedByMe: Boolean(row.liked_by_me),
    reactionCount: Number(row.reaction_count) || 0,
    repostCount: Number(row.repost_count) || 0,
    quoteCount: Number(row.quote_count) || 0,
    bookmarkedByMe: Boolean(row.bookmarked_by_me),
    repostedByMe: Boolean(row.reposted_by_me),
  };
}

async function assertCanAct(sql: Sql, userId: string, options: { messaging?: boolean } = {}) {
  const role = await syncRoleForUser(sql, userId);
  if (role.permanent_ban) throw new Error("Sua conta está banida permanentemente.");
  if (role.banned_until && new Date(role.banned_until).getTime() > Date.now()) throw new Error("Sua conta está suspensa.");
  if (options.messaging && role.muted_until && new Date(role.muted_until).getTime() > Date.now()) throw new Error("Sua conta está silenciada.");
  return role;
}

async function assertPostInteractable(sql: Sql, viewerId: string, postId: string): Promise<{ user_id: string }> {
  const rows = await sql<{ user_id: string }>`
    select user_id from posts where id=${postId} and deleted_at is null limit 1
  `;
  const post = rows[0];
  if (!post) throw new Error("Publicação não encontrada.");
  const blocked = await sql`select 1 from blocks where (blocker_id=${viewerId} and blocked_id=${post.user_id}) or (blocker_id=${post.user_id} and blocked_id=${viewerId}) limit 1`;
  if (blocked.length) throw new Error("Esta publicação não está disponível para você.");
  const shadow = await sql`select 1 from user_roles where user_id=${post.user_id} and shadow_banned=true limit 1`;
  if (shadow.length && post.user_id !== viewerId) throw new Error("Esta publicação não está disponível.");
  return post;
}

async function uniqueUsername(sql: Sql, seed: string, exceptUserId?: string) {
  const base = slugifyUsername(seed);
  for (let i = 0; i < 30; i += 1) {
    const candidate =
      i === 0 ? base : `${base.slice(0, 16)}${i + 1}`.slice(0, 20);
    const taken = exceptUserId
      ? await sql`select 1 from profiles where username = ${candidate} and user_id <> ${exceptUserId} limit 1`
      : await sql`select 1 from profiles where username = ${candidate} limit 1`;
    if (taken.length === 0) return candidate;
  }
  return `${base.slice(0, 12)}${crypto.randomUUID().slice(0, 6)}`;
}

async function ensureProfileFor(sql: Sql, userId: string): Promise<ProfileRow> {
  const existing = await sql<ProfileRow>`
    select user_id, username, display_name, bio, image, banner_url, profile_gif_url, website_url,
      theme_id, background_id, background_url, profile_effect, profile_intro, profile_intro_enabled, accent_color,
      permanent_id, created_at::text as created_at
    from profiles
    where user_id = ${userId} and deleted_at is null
    limit 1
  `;
  if (existing[0]) { await syncRoleForUser(sql, userId); return existing[0]; }

  const authUser = await sql<{
    name: string;
    email: string;
    image: string | null;
  }>`
    select name, email, image from "user" where id = ${userId} limit 1
  `;
  const source = authUser[0];
  const displayName = source?.name?.trim() || source?.email?.split("@")[0] || "Nyx";
  const username = await uniqueUsername(
    sql,
    source?.name || source?.email?.split("@")[0] || "nyx",
  );

  const inserted = await sql<ProfileRow>`
    insert into profiles (user_id, username, display_name, bio, image, permanent_id)
    values (${userId}, ${username}, ${displayName}, '', ${source?.image ?? null}, ${"nyx_" + crypto.randomUUID().replaceAll("-", "")})
    on conflict (user_id) do update set
      updated_at = now(),
      image = coalesce(profiles.image, excluded.image)
    returning user_id, username, display_name, bio, image, banner_url, profile_gif_url, website_url,
      theme_id, background_id, background_url, profile_effect, profile_intro, profile_intro_enabled, accent_color,
      permanent_id, created_at::text as created_at
  `;
  if (!inserted[0]) throw new Error("Não foi possível criar o perfil.");
  await syncRoleForUser(sql, userId);
  return inserted[0];
}

const POST_SELECT = `
  p.id,
  p.body,
  p.created_at::text as created_at,
  p.media_url, p.media_type, p.media_alt, p.media_duration_ms, p.media_thumbnail_url,
  pr.user_id,
  pr.username,
  pr.display_name,
  pr.image,
  ur.role as author_role,
  ur.founder_number as author_founder_number,
  qp.id as quoted_post_id, qp.body as quoted_body, qp.created_at::text as quoted_created_at,
  qpr.user_id as quoted_user_id, qpr.username as quoted_username, qpr.display_name as quoted_display_name, qpr.image as quoted_image,
  qur.role as quoted_role, qur.founder_number as quoted_founder_number,
  (select count(*)::int from likes l where l.post_id = p.id) as like_count,
  (select count(*)::int from post_reactions r where r.post_id = p.id) as reaction_count,
  (select count(*)::int from comments c where c.post_id = p.id and c.deleted_at is null) as comment_count,
  (select count(*)::int from reposts rp where rp.post_id = p.id) as repost_count,
  (select count(*)::int from quotes q where q.post_id = p.id and q.deleted_at is null) as quote_count
`;

async function listPosts(
  sql: Sql,
  viewerId: string | null,
  opts: { tab: FeedTab; authorId?: string; limit?: number },
): Promise<PostCard[]> {
  const limit = opts.limit ?? 50;
  const params: unknown[] = [];
  const where: string[] = ["p.deleted_at is null", "pr.deleted_at is null"];

  if (viewerId) {
    params.push(viewerId);
    where.push(`not exists (
      select 1 from user_roles sr where sr.user_id = p.user_id and sr.shadow_banned = true and p.user_id <> $1
    )`);
    where.push(`not exists (
      select 1 from blocks b
      where (b.blocker_id = $1 and b.blocked_id = p.user_id)
         or (b.blocker_id = p.user_id and b.blocked_id = $1)
    )`);
  } else {
    where.push(`not exists (select 1 from user_roles sr where sr.user_id = p.user_id and sr.shadow_banned = true)`);
  }

  if (opts.authorId) {
    params.push(opts.authorId);
    where.push(`p.user_id = $${params.length}`);
  }

  if (opts.tab === "following") {
    if (!viewerId) return [];
    where.push(`exists (
      select 1 from follows f
      where f.follower_id = $1 and f.following_id = p.user_id
    )`);
  }

  if (opts.tab === "videos") {
    where.push(`p.media_type = 'video'`);
  }

  const viewerParam = viewerId ? "$1" : "null";
  const likedSql = viewerId
    ? `exists(select 1 from likes l where l.post_id = p.id and l.user_id = ${viewerParam})`
    : "false";
  const bookmarkedSql = viewerId ? `exists(select 1 from bookmarks b where b.post_id=p.id and b.user_id=${viewerParam})` : "false";
  const repostedSql = viewerId ? `exists(select 1 from reposts rp where rp.post_id=p.id and rp.user_id=${viewerParam})` : "false";

  params.push(limit);
  const limitPlaceholder = `$${params.length}`;

  const text = `
    select ${POST_SELECT},
      ${likedSql} as liked_by_me,
      ${bookmarkedSql} as bookmarked_by_me,
      ${repostedSql} as reposted_by_me
    from posts p
    join profiles pr on pr.user_id = p.user_id
    left join user_roles ur on ur.user_id=p.user_id
    left join posts qp on qp.id=p.quoted_post_id and qp.deleted_at is null
    left join profiles qpr on qpr.user_id=qp.user_id
    left join user_roles qur on qur.user_id=qp.user_id
    where ${where.join(" and ")}
      and (${viewerId ? "$1" : "null"} is null or not exists(select 1 from user_mutes um where um.muter_id=${viewerParam} and um.muted_id=p.user_id))
    order by p.created_at desc
    limit ${limitPlaceholder}
  `;

  const rows = await sql.query<PostRow>(text, params);
  return rows.map(mapPost);
}

async function registerMentions(sql: Sql, body: string, actorId: string, target: { postId?: string; commentId?: string }) {
  const usernames = [...body.matchAll(/@([a-z0-9_]{3,20})/gi)].map((m) => m[1].toLowerCase());
  const unique = [...new Set(usernames)];
  for (const username of unique) {
    const rows = await sql<{user_id:string}>`select user_id from profiles where lower(username)=${username} and deleted_at is null limit 1`;
    const user = rows[0];
    if (!user || user.user_id === actorId) continue;
    const [privacy] = await sql<{mention_policy:string}>`select mention_policy from privacy_preferences where user_id=${user.user_id} limit 1`;
    const policy = privacy?.mention_policy ?? "everyone";
    if (policy === "nobody") continue;
    if (policy === "followers") {
      const follows = await sql`select 1 from follows where follower_id=${user.user_id} and following_id=${actorId} limit 1`;
      if (!follows.length) continue;
    }
    await sql`insert into mentions (id,post_id,comment_id,mentioned_user_id,actor_id) values (${crypto.randomUUID()},${target.postId ?? null},${target.commentId ?? null},${user.user_id},${actorId})`;
    await notify(sql, user.user_id, actorId, "mention", target.postId ?? null, target.commentId ?? null, JSON.stringify({username}));
  }
}

async function notify(
  sql: Sql,
  userId: string,
  actorId: string,
  type: "like" | "comment" | "follow" | "repost" | "quote" | "mention" | "reaction" | "message_request" | "message_accepted",
  postId: string | null,
  commentId: string | null = null,
  metadata: string | null = null,
) {
  if (userId === actorId) return;
  const [prefs] = await sql<{likes:boolean;comments:boolean;follows:boolean;messages:boolean;reposts:boolean;mentions:boolean;quotes:boolean;reactions:boolean}>`select likes,comments,follows,messages,reposts,mentions,quotes,reactions from notification_preferences where user_id=${userId} limit 1`;
  const allowed = type === "message_request" || type === "message_accepted" ? prefs?.messages !== false : type === "like" ? prefs?.likes !== false : type === "comment" ? prefs?.comments !== false : type === "follow" ? prefs?.follows !== false : type === "repost" ? prefs?.reposts !== false : type === "quote" ? prefs?.quotes !== false : type === "mention" ? prefs?.mentions !== false : prefs?.reactions !== false;
  if (!allowed) return;
  await sql`
    insert into notifications (id, user_id, actor_id, type, post_id, comment_id, metadata)
    values (${crypto.randomUUID()}, ${userId}, ${actorId}, ${type}, ${postId}, ${commentId}, ${metadata})
  `;
}

async function hydrateProfile(
  sql: Sql,
  row: ProfileRow,
  viewerId: string | null,
  options: { inlineMedia?: boolean } = {},
): Promise<Profile> {
  // Do not synchronize role assignments while merely rendering another user's
  // profile. Role synchronization is reserved for authenticated actor flows.
  const role = await getRole(sql, row.user_id);

  // Keep this path compatible with both Neon and the PGlite fallback: PGlite is
  // single-connection, so avoid issuing concurrent queries against it.
  const [followers] = await sql<{ n: number }>`
    select count(*)::int as n from follows where following_id = ${row.user_id}
  `;
  const [following] = await sql<{ n: number }>`
    select count(*)::int as n from follows where follower_id = ${row.user_id}
  `;
  const [posts] = await sql<{ n: number }>`
    select count(*)::int as n from posts where user_id = ${row.user_id} and deleted_at is null
  `;

  const isSelf = viewerId === row.user_id;
  let isFollowing = false;
  let isBlocked = false;
  if (viewerId && !isSelf) {
    const follow = await sql`
      select 1 from follows
      where follower_id = ${viewerId} and following_id = ${row.user_id}
      limit 1
    `;
    isFollowing = follow.length > 0;
    const block = await sql`
      select 1 from blocks
      where (blocker_id = ${viewerId} and blocked_id = ${row.user_id})
         or (blocker_id = ${row.user_id} and blocked_id = ${viewerId})
      limit 1
    `;
    isBlocked = block.length > 0;
  }

  // permanent_id is part of the row in V10+, so never issue a second lookup.
  const permanentId = row.permanent_id ?? row.user_id;
  const inlineMedia = options.inlineMedia === true;
  return {
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name,
    bio: row.bio ?? "",
    image: profileMediaUrl(row.image, row.user_id, "image", inlineMedia),
    bannerUrl: profileMediaUrl(row.banner_url, row.user_id, "banner", inlineMedia),
    profileGifUrl: profileMediaUrl(row.profile_gif_url, row.user_id, "gif", inlineMedia),
    websiteUrl: row.website_url,
    themeId: row.theme_id ?? "nyxoshi",
    backgroundId: row.background_id ?? "stars",
    profileEffect: row.profile_effect ?? "glow",
    profileIntro: row.profile_intro ?? "moonrise",
    profileIntroEnabled: Boolean(row.profile_intro_enabled ?? true),
    accentColor: row.accent_color ?? "#c084fc",
    permanentId,
    role: role.role,
    founderNumber: role.founder_number,
    createdAt: asIso(row.created_at),
    followers: Number(followers?.n) || 0,
    following: Number(following?.n) || 0,
    posts: Number(posts?.n) || 0,
    isFollowing,
    isBlocked,
    isSelf,
  };
}

export const ensureMyProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const row = await ensureProfileFor(sql, context.userId);
    return hydrateProfile(sql, row, context.userId, { inlineMedia: false });
  });

export const getFeed = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .validator((data: unknown) => feedQuerySchema.parse(data ?? { tab: "forYou" }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    if (context.userId) await ensureProfileFor(sql, context.userId);
    return listPosts(sql, context.userId, { tab: data.tab });
  });

export const createPost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => createPostSchema.parse(data))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfileFor(sql, context.userId);
    await assertCanAct(sql, context.userId);
    const id = crypto.randomUUID();
    const mediaUrl = data.mediaUrl || null;
    const mediaType = mediaUrl ? (data.mediaType ?? inferPostMediaType(mediaUrl)) : null;
    if (mediaUrl && !mediaType) throw new Error("Tipo de mídia inválido.");
    await sql`
      insert into posts (id, user_id, body, media_url, media_type, media_alt, media_duration_ms, media_thumbnail_url)
      values (${id}, ${context.userId}, ${data.body}, ${mediaUrl}, ${mediaType}, ${data.mediaAlt || null}, ${data.mediaDurationMs ?? null}, ${data.mediaThumbnailUrl || null})
    `;
    await registerMentions(sql, data.body, context.userId, { postId: id });
    const tags = [...data.body.matchAll(/#([a-z0-9_]{2,40})/gi)].map((m)=>m[1].toLowerCase());
    for (const tag of [...new Set(tags)]) {
      const h = await sql<{id:string}>`insert into hashtags(id,tag) values(${crypto.randomUUID()},${tag}) on conflict(tag) do update set tag=excluded.tag returning id`;
      if (h[0]) await sql`insert into post_hashtags(post_id,hashtag_id) values(${id},${h[0].id}) on conflict do nothing`;
    }
    const rows = await listPosts(sql, context.userId, {
      tab: "forYou",
      authorId: context.userId,
      limit: 1,
    });
    const created = rows.find((p) => p.id === id);
    if (created) return created;
    return {
      id,
      body: data.body,
      createdAt: new Date().toISOString(),
      mediaUrl: mediaUrl?.startsWith("data:") ? `/api/media/${id}` : mediaUrl,
      mediaType,
      mediaAlt: data.mediaAlt || null,
      mediaDurationMs: data.mediaDurationMs ?? null,
      mediaThumbnailUrl: data.mediaThumbnailUrl?.startsWith("data:") ? `/api/media/${id}?part=thumbnail` : (data.mediaThumbnailUrl || null),
      author: {
        userId: context.userId,
        username: "me",
        displayName: "Você",
        image: null,
      },
      likeCount: 0,
      commentCount: 0,
      likedByMe: false,
      reactionCount: 0,
      repostCount: 0,
      quoteCount: 0,
      bookmarkedByMe: false,
      repostedByMe: false,
    } satisfies PostCard;
  });

export const deletePost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    await sql`
      update posts
      set deleted_at = now(), updated_at = now()
      where id = ${id} and user_id = ${context.userId} and deleted_at is null
    `;
    return { ok: true };
  });

export const toggleLike = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((postId: string) => postId)
  .handler(async ({ context, data: postId }) => {
    const sql = await getSql();
    await ensureProfileFor(sql, context.userId);
    await assertCanAct(sql, context.userId);
    const existing = await sql`
      select 1 from likes where user_id = ${context.userId} and post_id = ${postId} limit 1
    `;
    if (existing.length > 0) {
      await sql`delete from likes where user_id = ${context.userId} and post_id = ${postId}`;
      return { liked: false };
    }
    const post = await assertPostInteractable(sql, context.userId, postId);
    await sql`insert into likes (user_id, post_id) values (${context.userId}, ${postId})`;
    await notify(sql, post.user_id, context.userId, "like", postId);
    return { liked: true };
  });

export const getPost = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .validator((postId: string) => postId)
  .handler(async ({ context, data: postId }) => {
    const sql = await getSql();
    const posts = await sql.query<PostRow>(
      `
      select ${POST_SELECT},
        ${
          context.userId
            ? "exists(select 1 from likes l where l.post_id = p.id and l.user_id = $2)"
            : "false"
        } as liked_by_me,
        ${context.userId ? "exists(select 1 from bookmarks b where b.post_id=p.id and b.user_id=$2)" : "false"} as bookmarked_by_me,
        ${context.userId ? "exists(select 1 from reposts rp where rp.post_id=p.id and rp.user_id=$2)" : "false"} as reposted_by_me
      from posts p
      join profiles pr on pr.user_id = p.user_id
      left join user_roles ur on ur.user_id=p.user_id
      left join posts qp on qp.id=p.quoted_post_id and qp.deleted_at is null
      left join profiles qpr on qpr.user_id=qp.user_id
      left join user_roles qur on qur.user_id=qp.user_id
      where p.id = $1 and p.deleted_at is null and pr.deleted_at is null
        ${context.userId ? `and not exists (select 1 from blocks b where (b.blocker_id = $2 and b.blocked_id = p.user_id) or (b.blocker_id = p.user_id and b.blocked_id = $2)) and not exists (select 1 from user_roles sr where sr.user_id = p.user_id and sr.shadow_banned = true and p.user_id <> $2)` : `and not exists (select 1 from user_roles sr where sr.user_id = p.user_id and sr.shadow_banned = true)`}
      limit 1
    `,
      context.userId ? [postId, context.userId] : [postId],
    );
    if (!posts[0]) return null;
    return mapPost(posts[0]);
  });

export const listComments = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .validator((postId: string) => postId)
  .handler(async ({ context, data: postId }) => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      body: string;
      created_at: string;
      user_id: string;
      username: string;
      display_name: string;
      image: string | null;
      parent_id: string | null;
      reaction_count: number;
      reacted_by_me: boolean;
      reply_count: number;
    }>`
      select
        c.id, c.body, c.parent_id, c.created_at::text as created_at,
        pr.user_id, pr.username, pr.display_name, pr.image,
        (select count(*)::int from comment_reactions cr where cr.comment_id=c.id) as reaction_count,
        exists(select 1 from comment_reactions cr where cr.comment_id=c.id and cr.user_id=${context.userId ?? ""} and cr.reaction='like') as reacted_by_me,
        (select count(*)::int from comments rc where rc.parent_id=c.id and rc.deleted_at is null) as reply_count
      from comments c
      join profiles pr on pr.user_id = c.user_id
      join posts pp on pp.id=c.post_id and pp.deleted_at is null
      where c.post_id = ${postId} and c.deleted_at is null and pr.deleted_at is null
        and not exists (select 1 from user_roles sr where sr.user_id=c.user_id and sr.shadow_banned=true)
        and (${context.userId ?? null} is null or not exists (select 1 from blocks b where (b.blocker_id = ${context.userId} and b.blocked_id = c.user_id) or (b.blocker_id = c.user_id and b.blocked_id = ${context.userId})))
        and (${context.userId ?? null} is null or not exists (select 1 from blocks b where (b.blocker_id = ${context.userId} and b.blocked_id = pp.user_id) or (b.blocker_id = pp.user_id and b.blocked_id = ${context.userId})))
      order by c.created_at asc
    `;
    return rows.map(
      (row): CommentCard => ({
        id: row.id,
        body: row.body,
        parentId: row.parent_id,
        createdAt: asIso(row.created_at),
        author: {
          userId: row.user_id,
          username: row.username,
          displayName: row.display_name,
          image: profileMediaUrl(row.image, row.user_id, "image"),
        },
        reactionCount: Number(row.reaction_count) || 0,
        reactedByMe: Boolean(row.reacted_by_me),
        replyCount: Number(row.reply_count) || 0,
      }),
    );
  });

export const createComment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => createCommentSchema.parse(data))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfileFor(sql, context.userId);
    await assertCanAct(sql, context.userId);
    const post = await assertPostInteractable(sql, context.userId, data.postId);
    if (data.parentId) {
      const parent = await sql`select 1 from comments where id=${data.parentId} and post_id=${data.postId} and deleted_at is null limit 1`;
      if (!parent.length) throw new Error("Comentário pai não encontrado.");
    }
    const id = crypto.randomUUID();
    await sql`
      insert into comments (id, post_id, user_id, body, parent_id)
      values (${id}, ${data.postId}, ${context.userId}, ${data.body}, ${data.parentId ?? null})
    `;
    await notify(sql, post[0].user_id, context.userId, "comment", data.postId, id);
    await registerMentions(sql, data.body, context.userId, { commentId: id });
    return { id };
  });

type PublicProfileRow = ProfileRow & {
  role: NyxoshiRole;
  founder_number: number | null;
  followers_count: number;
  following_count: number;
  posts_count: number;
  is_following: boolean;
  is_blocked: boolean;
};

function mapPublicProfile(row: PublicProfileRow, viewerId: string | null): Profile {
  const isSelf = viewerId === row.user_id;
  return {
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name,
    bio: row.bio ?? "",
    image: profileMediaUrl(row.image, row.user_id, "image"),
    bannerUrl: profileMediaUrl(row.banner_url, row.user_id, "banner"),
    profileGifUrl: profileMediaUrl(row.profile_gif_url, row.user_id, "gif"),
    websiteUrl: row.website_url,
    themeId: row.theme_id ?? "nyxoshi",
    backgroundId: row.background_id ?? "stars",
    profileEffect: row.profile_effect ?? "glow",
    profileIntro: row.profile_intro ?? "moonrise",
    profileIntroEnabled: Boolean(row.profile_intro_enabled ?? true),
    accentColor: row.accent_color ?? "#c084fc",
    permanentId: row.permanent_id ?? row.user_id,
    role: row.role || "user",
    founderNumber: row.founder_number ?? null,
    createdAt: asIso(row.created_at),
    followers: Number(row.followers_count) || 0,
    following: Number(row.following_count) || 0,
    posts: Number(row.posts_count) || 0,
    isFollowing: Boolean(row.is_following),
    isBlocked: isSelf ? false : Boolean(row.is_blocked),
    isSelf,
  };
}

export const getProfileByUsername = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .validator((username: string) => username.trim().toLowerCase())
  .handler(async ({ context, data: username }) => {
    const sql = await getSql();
    const viewerId = context.userId ?? null;

    // Keep parameter order explicit: $1 is always the viewer ID and $2 is
    // always the username. This prevents authenticated profile requests from
    // accidentally comparing a username against the user_id column.
    const rows = await sql.query<PublicProfileRow>(
      `
      select
        p.user_id,
        p.username,
        p.display_name,
        p.bio,
        p.image,
        p.banner_url,
        p.profile_gif_url,
        p.website_url,
        p.theme_id,
        p.background_id,
        p.background_url,
        p.profile_effect,
        p.profile_intro,
        p.profile_intro_enabled,
        p.accent_color,
        p.permanent_id,
        p.created_at::text as created_at,
        coalesce(ur.role, 'user') as role,
        ur.founder_number,
        (select count(*)::int from follows f where f.following_id = p.user_id) as followers_count,
        (select count(*)::int from follows f where f.follower_id = p.user_id) as following_count,
        (select count(*)::int from posts po where po.user_id = p.user_id and po.deleted_at is null) as posts_count,
        exists(
          select 1 from follows f
          where f.follower_id = $1 and f.following_id = p.user_id
        ) as is_following,
        exists(
          select 1 from blocks b
          where (b.blocker_id = $1 and b.blocked_id = p.user_id)
             or (b.blocker_id = p.user_id and b.blocked_id = $1)
        ) as is_blocked
      from profiles p
      left join user_roles ur on ur.user_id = p.user_id
      where p.username = $2
        and p.deleted_at is null
        and (
          coalesce(ur.shadow_banned, false) = false
          or p.user_id = $1
        )
      limit 1
      `,
      [viewerId, username],
    );

    if (!rows[0]) return null;
    return mapPublicProfile(rows[0], viewerId);
  });

export const getProfilePosts = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .validator((username: string) => username.trim().toLowerCase())
  .handler(async ({ context, data: username }) => {
    const sql = await getSql();
    const profile = await sql<{ user_id: string }>`
      select user_id from profiles
      where username = ${username} and deleted_at is null
        and (${context.userId ?? null} is not null or not exists (select 1 from user_roles sr where sr.user_id=profiles.user_id and sr.shadow_banned=true))
        and (${context.userId ?? null} is null or not exists (select 1 from user_roles sr where sr.user_id=profiles.user_id and sr.shadow_banned=true and profiles.user_id <> ${context.userId}))
      limit 1
    `;
    if (!profile[0]) return [];
    return listPosts(sql, context.userId, {
      tab: "forYou",
      authorId: profile[0].user_id,
    });
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => updateProfileSchema.parse(data))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const current = await ensureProfileFor(sql, context.userId);
    const taken = await sql`
      select 1 from profiles
      where username = ${data.username} and user_id <> ${context.userId}
      limit 1
    `;
    if (taken.length > 0) throw new Error("Esse @ já está em uso.");
    const rows = await sql<ProfileRow>`
      update profiles
      set
        username = ${data.username},
        display_name = ${data.displayName},
        bio = ${data.bio},
        image = ${data.image === undefined ? current.image : data.image || null},
        banner_url = ${data.bannerUrl === undefined ? current.banner_url : data.bannerUrl || null},
        profile_gif_url = ${data.profileGifUrl === undefined ? current.profile_gif_url : data.profileGifUrl || null},
        website_url = ${data.websiteUrl ?? null},
        theme_id = ${data.themeId},
        background_id = ${data.backgroundId},
        background_url = ${data.backgroundUrl === undefined ? current.background_url : data.backgroundUrl || null},
        profile_effect = ${data.profileEffect},
        profile_intro = ${data.profileIntro},
        profile_intro_enabled = ${data.profileIntroEnabled},
        accent_color = ${data.accentColor},
        updated_at = now()
      where user_id = ${context.userId}
      returning user_id, username, display_name, bio, image, banner_url, profile_gif_url, website_url,
        theme_id, background_id, background_url, profile_effect, profile_intro, profile_intro_enabled, accent_color,
        permanent_id, created_at::text as created_at
    `;
    if (!rows[0]) throw new Error("Não foi possível atualizar o perfil.");
    return hydrateProfile(sql, rows[0], context.userId);
  });

export const toggleFollow = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((userId: string) => userId)
  .handler(async ({ context, data: userId }) => {
    if (userId === context.userId) throw new Error("Você não pode seguir a si.");
    const sql = await getSql();
    await ensureProfileFor(sql, context.userId);
    await assertCanAct(sql, context.userId);
    const target = await sql`select 1 from profiles where user_id = ${userId} and deleted_at is null limit 1`;
    if (target.length === 0) throw new Error("Perfil não encontrado.");
    const blocked = await sql`
      select 1 from blocks
      where (blocker_id = ${context.userId} and blocked_id = ${userId})
         or (blocker_id = ${userId} and blocked_id = ${context.userId})
      limit 1
    `;
    if (blocked.length > 0) throw new Error("Não é possível seguir esta conta.");
    const existing = await sql`
      select 1 from follows where follower_id = ${context.userId} and following_id = ${userId} limit 1
    `;
    if (existing.length > 0) {
      await sql`delete from follows where follower_id = ${context.userId} and following_id = ${userId}`;
      return { following: false };
    }
    await sql`insert into follows (follower_id, following_id) values (${context.userId}, ${userId})`;
    await notify(sql, userId, context.userId, "follow", null);
    return { following: true };
  });

export const toggleBlock = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((userId: string) => userId)
  .handler(async ({ context, data: userId }) => {
    if (userId === context.userId) throw new Error("Ação inválida.");
    const sql = await getSql();
    await assertCanAct(sql, context.userId);
    const existing = await sql`
      select 1 from blocks where blocker_id = ${context.userId} and blocked_id = ${userId} limit 1
    `;
    if (existing.length > 0) {
      await sql`delete from blocks where blocker_id = ${context.userId} and blocked_id = ${userId}`;
      return { blocked: false };
    }
    await sql`insert into blocks (blocker_id, blocked_id) values (${context.userId}, ${userId})`;
    await sql`delete from follows where (follower_id = ${context.userId} and following_id = ${userId})
      or (follower_id = ${userId} and following_id = ${context.userId})`;
    return { blocked: true };
  });

export const createReport = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => reportSchema.parse(data))
  .handler(async ({ context, data }) => {
    if (!data.targetUserId && !data.targetPostId && !data.targetMessageId) {
      throw new Error("Informe o alvo da denúncia.");
    }
    const sql = await getSql();
    let targetType = "user";
    let snapshot: Record<string, unknown> | null = null;

    if (data.targetPostId) {
      targetType = "post";
      const rows = await sql<{id:string;body:string;created_at:string;user_id:string;username:string;display_name:string}>`
        select p.id,p.body,p.created_at::text as created_at,p.user_id,pr.username,pr.display_name
        from posts p join profiles pr on pr.user_id=p.user_id
        where p.id=${data.targetPostId} limit 1
      `;
      const row = rows[0];
      if (!row) throw new Error("Publicação não encontrada.");
      const blocked = await sql`select 1 from blocks where (blocker_id=${context.userId} and blocked_id=${row.user_id}) or (blocker_id=${row.user_id} and blocked_id=${context.userId}) limit 1`;
      if (blocked.length) throw new Error("Esta publicação não está disponível para denúncia.");
      snapshot = { id:row.id, body:row.body, createdAt:row.created_at, userId:row.user_id, username:row.username, displayName:row.display_name };
    } else if (data.targetMessageId) {
      targetType = "message";
      const rows = await sql<{id:string;body:string;created_at:string;sender_id:string;sender_username:string;sender_name:string;recipient_id:string;recipient_username:string;recipient_name:string}>`
        select m.id,m.body,m.created_at::text as created_at,m.sender_id,
          sp.username as sender_username,sp.display_name as sender_name,
          case when t.user_a=m.sender_id then t.user_b else t.user_a end as recipient_id,
          rp.username as recipient_username,rp.display_name as recipient_name
        from messages m
        join message_threads t on t.id=m.thread_id
        join profiles sp on sp.user_id=m.sender_id
        join profiles rp on rp.user_id=case when t.user_a=m.sender_id then t.user_b else t.user_a end
        where m.id=${data.targetMessageId} limit 1
      `;
      const row = rows[0];
      if (!row) throw new Error("Mensagem não encontrada.");
      if (row.sender_id !== context.userId && row.recipient_id !== context.userId) throw new Error("Você não pode denunciar esta mensagem.");
      snapshot = { id:row.id, body:row.body, createdAt:row.created_at, senderId:row.sender_id, senderUsername:row.sender_username, senderName:row.sender_name, recipientId:row.recipient_id, recipientUsername:row.recipient_username, recipientName:row.recipient_name };
    } else if (data.targetUserId) {
      targetType = "user";
      const rows = await sql<{user_id:string;username:string;display_name:string;bio:string;image:string|null}>`
        select user_id,username,display_name,bio,image from profiles where user_id=${data.targetUserId} limit 1
      `;
      const row = rows[0];
      if (!row) throw new Error("Usuário não encontrado.");
      snapshot = row;
    }

    const id = crypto.randomUUID();
    await sql`
      insert into reports (id, reporter_id, target_user_id, target_post_id, target_message_id, reason, target_type, target_snapshot, status)
      values (${id},${context.userId},${data.targetUserId??null},${data.targetPostId??null},${data.targetMessageId??null},${data.reason},${targetType},${JSON.stringify(snapshot)},'pending')
    `;
    return { ok:true, reportId:id };
  });

export const reportMessage = createReport;

export const searchNyxoshi = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .validator((data: unknown) => searchQuerySchema.parse(data))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const like = `%${data.q.replace(/[%_]/g, "")}%`;
    const people = await sql<ProfileRow>`
      select user_id, username, display_name, bio, image, banner_url, profile_gif_url, website_url, theme_id, background_id, background_url, profile_effect, profile_intro, profile_intro_enabled, accent_color, permanent_id, created_at::text as created_at
      from profiles
      where deleted_at is null
        and not exists (select 1 from user_roles sr where sr.user_id=profiles.user_id and sr.shadow_banned=true)
        and (${context.userId ?? null} is not null and profiles.user_id=${context.userId} or not exists (select 1 from privacy_preferences pp where pp.user_id=profiles.user_id and pp.discoverable=false))
        and (username ilike ${like} or display_name ilike ${like})
      order by created_at desc
      limit 12
    `;
    const posts = await sql.query<PostRow>(
      `
      select ${POST_SELECT},
        ${
          context.userId
            ? "exists(select 1 from likes l where l.post_id = p.id and l.user_id = $2)"
            : "false"
        } as liked_by_me,
        ${context.userId ? "exists(select 1 from bookmarks b where b.post_id=p.id and b.user_id=$2)" : "false"} as bookmarked_by_me,
        ${context.userId ? "exists(select 1 from reposts rp where rp.post_id=p.id and rp.user_id=$2)" : "false"} as reposted_by_me
      from posts p
      join profiles pr on pr.user_id = p.user_id
      where p.deleted_at is null and pr.deleted_at is null
        and not exists (select 1 from user_roles sr where sr.user_id=p.user_id and sr.shadow_banned=true and ($2 is null or p.user_id<>$2))
        and p.body ilike $1
      order by p.created_at desc
      limit 20
    `,
      [like, context.userId ?? null],
    );
    const hydrated = await Promise.all(
      people.map((row) => hydrateProfile(sql, row, context.userId, { inlineMedia: false })),
    );
    return {
      people: hydrated.filter((p) => !p.isBlocked),
      posts: posts.map(mapPost),
    };
  });

export const suggestedPeople = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureProfileFor(sql, context.userId);
    const rows = await sql<ProfileRow>`
      select user_id, username, display_name, bio, image, banner_url, profile_gif_url, website_url, theme_id, background_id, background_url, profile_effect, profile_intro, profile_intro_enabled, accent_color, permanent_id, created_at::text as created_at
      from profiles
      where deleted_at is null
        and user_id <> ${context.userId}
        and not exists (select 1 from user_roles sr where sr.user_id=profiles.user_id and sr.shadow_banned=true)
        and not exists (select 1 from privacy_preferences pp where pp.user_id=profiles.user_id and pp.discoverable=false)
        and not exists (
          select 1 from follows f
          where f.follower_id = ${context.userId} and f.following_id = profiles.user_id
        )
        and not exists (
          select 1 from blocks b
          where (b.blocker_id = ${context.userId} and b.blocked_id = profiles.user_id)
             or (b.blocker_id = profiles.user_id and b.blocked_id = ${context.userId})
        )
      order by created_at desc
      limit 6
    `;
    return Promise.all(rows.map((row) => hydrateProfile(sql, row, context.userId, { inlineMedia: false })));
  });

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      type: string;
      created_at: string;
      read_at: string | null;
      post_id: string | null;
      user_id: string;
      username: string;
      display_name: string;
      image: string | null;
    }>`
      select
        n.id,
        n.type,
        n.created_at::text as created_at,
        n.read_at::text as read_at,
        n.post_id,
        pr.user_id,
        pr.username,
        pr.display_name,
        pr.image
      from notifications n
      join profiles pr on pr.user_id = n.actor_id
      where n.user_id = ${context.userId}
      order by n.created_at desc
      limit 50
    `;
    return rows.map(
      (row): NotificationCard => ({
        id: row.id,
        type: row.type as NotificationCard["type"],
        createdAt: asIso(row.created_at),
        read: Boolean(row.read_at),
        postId: row.post_id,
        actor: {
          userId: row.user_id,
          username: row.username,
          displayName: row.display_name,
          image: profileMediaUrl(row.image, row.user_id, "image"),
        },
      }),
    );
  });

export const unreadNotificationCount = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const [row] = await sql<{ n: number }>`
      select count(*)::int as n from notifications
      where user_id = ${context.userId} and read_at is null
    `;
    return Number(row?.n) || 0;
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await sql`
      update notifications set read_at = now()
      where user_id = ${context.userId} and read_at is null
    `;
    return { ok: true };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: string) => data)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`update notifications set read_at=now() where id=${data} and user_id=${context.userId}`;
    return { ok: true };
  });

export const getNotificationPermissionHint = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => ({ supported: true }));

export const listMessageRequests = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await assertCanAct(sql, context.userId, { messaging: true });
    const rows = await sql<{
      id: string;
      sender_id: string;
      recipient_id: string;
      body: string;
      status: "pending" | "accepted" | "declined" | "spam";
      created_at: string;
      username: string | null;
      display_name: string | null;
      image: string | null;
    }>`
      select mr.id,mr.sender_id,mr.recipient_id,mr.body,mr.status,mr.created_at::text as created_at,
        p.username,coalesce(p.display_name,u.name) as display_name,coalesce(p.image,u.image) as image
      from message_requests mr
      left join profiles p on p.user_id=mr.sender_id and p.deleted_at is null
      left join "user" u on u.id=mr.sender_id
      where mr.recipient_id=${context.userId}
        and mr.status in ('pending','spam')
      order by mr.created_at desc
      limit 200
    `;
    return rows.map((r) => ({
      id:r.id,
      senderId:r.sender_id,
      recipientId:r.recipient_id,
      body:r.body,
      status:r.status,
      createdAt:asIso(r.created_at),
      sender:{
        userId:r.sender_id,
        username:r.username ?? `user-${r.sender_id.slice(0,6)}`,
        displayName:r.display_name ?? "Usuário",
        image:r.image,
      },
    }));
  });

export const listConversations = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await assertCanAct(sql, context.userId, { messaging: true });
    const rows = await sql<{
      thread_id: string; other_id: string; username: string; display_name: string; image: string | null;
      body: string | null; message_created_at: string | null; sender_id: string | null; unread: number; muted: boolean;
    }>`
      select t.id as thread_id, p.user_id as other_id, p.username, p.display_name, p.image,
        lm.body, lm.created_at::text as message_created_at, lm.sender_id,
        (select count(*)::int from messages um where um.thread_id=t.id and um.sender_id<>${context.userId} and um.read_at is null and um.deleted_at is null) as unread,
        coalesce((select mtp.muted from message_thread_preferences mtp where mtp.user_id=${context.userId} and mtp.thread_id=t.id limit 1),false) as muted
      from message_threads t
      join profiles p on p.user_id = case when t.user_a=${context.userId} then t.user_b else t.user_a end
      left join lateral (select m.body, m.created_at, m.sender_id from messages m where m.thread_id=t.id and m.deleted_at is null order by m.created_at desc limit 1) lm on true
      where (t.user_a=${context.userId} or t.user_b=${context.userId}) and p.deleted_at is null
      order by coalesce(lm.created_at, t.updated_at) desc
    `;
    return rows.map((r) => ({
      threadId: r.thread_id,
      other: { userId: r.other_id, username: r.username, displayName: r.display_name, image: profileMediaUrl(r.image, r.other_id, "image") },
      lastMessage: r.body ? { body: r.body, createdAt: asIso(r.message_created_at), senderId: r.sender_id! } : null,
      unread: Number(r.unread) || 0,
      muted: Boolean(r.muted),
    }));
  });

export const toggleMessageThreadMute = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: string) => data)
  .handler(async ({ context, data: threadId }) => {
    const sql = await getSql();
    await assertCanAct(sql, context.userId, { messaging: true });
    const access = await sql`select 1 from message_threads where id=${threadId} and (${context.userId}=user_a or ${context.userId}=user_b) limit 1`;
    if (!access.length) throw new Error("Conversa não encontrada.");
    const [current] = await sql<{muted:boolean}>`select muted from message_thread_preferences where user_id=${context.userId} and thread_id=${threadId} limit 1`;
    const muted = !(current?.muted ?? false);
    await sql`insert into message_thread_preferences(user_id,thread_id,muted) values(${context.userId},${threadId},${muted}) on conflict(user_id,thread_id) do update set muted=excluded.muted,updated_at=now()`;
    return { muted };
  });

export const listMessages = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((threadId: string) => threadId)
  .handler(async ({ context, data: threadId }) => {
    const sql = await getSql();
    await assertCanAct(sql, context.userId, { messaging: true });
    const access = await sql`select 1 from message_threads where id=${threadId} and (${context.userId}=user_a or ${context.userId}=user_b) limit 1`;
    if (!access.length) throw new Error("Conversa não encontrada.");
    const rows = await sql<{id:string;body:string;created_at:string;sender_id:string;read_at:string|null;reply_to_id:string|null;reactions:any}>`
      select m.id,m.body,m.created_at::text as created_at,m.sender_id,m.read_at::text as read_at,m.reply_to_id,
        coalesce((select json_agg(json_build_object('reaction',x.reaction,'count',x.count,'reactedByMe',x.reacted)) from (select reaction,count(*)::int count,bool_or(user_id=${context.userId}) reacted from message_reactions where message_id=m.id group by reaction)x),'[]') as reactions
      from messages m where m.thread_id=${threadId} and m.deleted_at is null order by m.created_at asc limit 200
    `;
    await sql`update messages set read_at=now() where thread_id=${threadId} and sender_id<>${context.userId} and read_at is null`;
    return rows.map((r) => ({ id:r.id, body:r.body, createdAt:asIso(r.created_at), senderId:r.sender_id, readAt:r.read_at ? asIso(r.read_at) : null, replyToId:r.reply_to_id, reactions:Array.isArray(r.reactions)?r.reactions:[] }));
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => sendMessageSchema.parse(data))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfileFor(sql, context.userId);
    const target = await sql<{user_id:string}>`select user_id from profiles where user_id=${data.recipientId} and deleted_at is null limit 1`;
    if (!target.length || data.recipientId === context.userId) throw new Error("Usuário não encontrado.");
    const blocked = await sql`select 1 from blocks where (blocker_id=${context.userId} and blocked_id=${data.recipientId}) or (blocker_id=${data.recipientId} and blocked_id=${context.userId}) limit 1`;
    if (blocked.length) throw new Error("Não é possível enviar mensagem para esta conta.");
    await assertCanAct(sql, context.userId, { messaging: true });

    if (data.recipientId === context.userId) throw new Error("Você não pode enviar uma mensagem para si mesmo.");
    const recipient = await sql<{id:string}>`select id from "user" where id=${data.recipientId} limit 1`;
    if (!recipient[0]) throw new Error("Usuário não encontrado.");
    const recipientRole = await syncRoleForUser(sql, data.recipientId);
    if (recipientRole.permanent_ban) throw new Error("Esse usuário não pode receber mensagens.");
    const existing = await sql<{id:string}>`select id from message_threads where (user_a=${context.userId} and user_b=${data.recipientId}) or (user_a=${data.recipientId} and user_b=${context.userId}) limit 1`;
    if (existing[0]) {
      if (data.replyToId) {
        const reply = await sql`select 1 from messages where id=${data.replyToId} and thread_id=${existing[0].id} and deleted_at is null limit 1`;
        if (!reply.length) throw new Error("Mensagem de resposta não encontrada nesta conversa.");
      }
      const id = crypto.randomUUID();
      await sql`insert into messages (id,thread_id,sender_id,body,reply_to_id) values (${id},${existing[0].id},${context.userId},${data.body},${data.replyToId ?? null})`;
      await sql`update message_threads set updated_at=now() where id=${existing[0].id}`;
      return { kind:"message" as const, threadId: existing[0].id, id };
    }

    const [privacy] = await sql<{message_policy:string}>`select message_policy from privacy_preferences where user_id=${data.recipientId} limit 1`;
    const messagePolicy = privacy?.message_policy ?? "requests";
    if (messagePolicy === "nobody") throw new Error("Esta pessoa não está aceitando novas mensagens.");

    const pending = await sql<{id:string}>`select id from message_requests where sender_id=${context.userId} and recipient_id=${data.recipientId} and status='pending' limit 1`;
    if (pending[0]) throw new Error("Você já enviou uma solicitação para esta pessoa.");

    if (messagePolicy === "everyone") {
      const [a,b] = context.userId < data.recipientId ? [context.userId,data.recipientId] : [data.recipientId,context.userId];
      const threadId = crypto.randomUUID();
      await sql`insert into message_threads (id,user_a,user_b) values (${threadId},${a},${b}) on conflict (user_a,user_b) do update set updated_at=now()`;
      const thread = await sql<{id:string}>`select id from message_threads where user_a=${a} and user_b=${b} limit 1`;
      if (!thread[0]) throw new Error("Não foi possível abrir a conversa.");
      const id = crypto.randomUUID();
      await sql`insert into messages (id,thread_id,sender_id,body) values (${id},${thread[0].id},${context.userId},${data.body})`;
      await sql`update message_threads set updated_at=now() where id=${thread[0].id}`;
      return { kind:"message" as const, threadId: thread[0].id, id };
    }

    const id = crypto.randomUUID();
    await sql`insert into message_requests (id,sender_id,recipient_id,body,status) values (${id},${context.userId},${data.recipientId},${data.body},'pending')`;
    await notify(sql, data.recipientId, context.userId, "message_request", null, null, JSON.stringify({requestId:id}));
    return { kind:"request" as const, requestId:id };
  });

export const decideMessageRequest = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => messageDecisionSchema.parse(data))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{id:string;sender_id:string;recipient_id:string;body:string}>`select id,sender_id,recipient_id,body from message_requests where id=${data.requestId} and recipient_id=${context.userId} and status in ('pending','spam') limit 1`;
    const request = rows[0];
    if (!request) throw new Error("Solicitação não encontrada.");
    await assertCanAct(sql, context.userId, { messaging: true });
    await assertCanAct(sql, request.sender_id, { messaging: true });
    if (data.action === "spam") {
      await sql`update message_requests set status='spam',updated_at=now() where id=${request.id}`;
      return { ok:true };
    }
    if (data.action === "decline") {
      await sql`update message_requests set status='declined',updated_at=now() where id=${request.id}`;
      return { ok:true };
    }
    const [a,b] = request.sender_id < request.recipient_id ? [request.sender_id,request.recipient_id] : [request.recipient_id,request.sender_id];
    const threadId = crypto.randomUUID();
    await sql`insert into message_threads (id,user_a,user_b) values (${threadId},${a},${b}) on conflict (user_a,user_b) do update set updated_at=now()`;
    const thread = await sql<{id:string}>`select id from message_threads where user_a=${a} and user_b=${b} limit 1`;
    await sql`insert into messages (id,thread_id,sender_id,body) values (${crypto.randomUUID()},${thread![0].id},${request.sender_id},${request.body})`;
    await sql`update message_requests set status='accepted',updated_at=now() where id=${request.id}`;
    await notify(sql, request.sender_id, context.userId, "message_accepted", null, null, JSON.stringify({threadId:thread![0].id}));
    return { ok:true, threadId:thread![0].id };
  });

export const getMessageThreadForUser = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((userId: string) => userId)
  .handler(async ({ context, data: otherId }) => {
    const sql = await getSql();
    await assertCanAct(sql, context.userId, { messaging: true });
    if (otherId === context.userId) throw new Error("Usuário inválido.");
    const rows = await sql<{id:string}>`select id from message_threads where (user_a=${context.userId} and user_b=${otherId}) or (user_a=${otherId} and user_b=${context.userId}) limit 1`;
    return rows[0]?.id ?? null;
  });

export const getModerationOverview = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { sql } = await requireModerationAdmin(context.userId);
    const [users] = await sql<{n:number}>`select count(*)::int as n from profiles where deleted_at is null`;
    const [posts] = await sql<{n:number}>`select count(*)::int as n from posts where deleted_at is null`;
    const [reports] = await sql<{n:number}>`select count(*)::int as n from reports`;
    return { counts:{users:Number(users?.n)||0,posts:Number(posts?.n)||0,reports:Number(reports?.n)||0} };
  });

export const moderateUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => moderationSchema.parse(data))
  .handler(async ({ context, data }) => {
    const { sql } = await requireModerationAdmin(context.userId);
    if (data.targetUserId === context.userId) throw new Error("Você não pode moderar a própria conta.");
    const target = await syncRoleForUser(sql, data.targetUserId);
    const actor = await syncRoleForUser(sql, context.userId);
    if (target.role === "angel_girl" && actor.role !== "angel_girl") throw new Error("Apenas a Angel Girl pode aplicar punições à conta Angel Girl.");
    const expires = data.durationHours ? new Date(Date.now()+data.durationHours*3600000).toISOString() : null;
    const action=data.action;
    if (["ban","shadow_ban","expel"].includes(action)) {
      const revoke=["founder","angel_girl","supreme_archmage","sub_founder","admin","moderator"].includes(target.role);
      const isPermanent = action === "expel";
      const banUntil = action === "ban" ? (expires ?? new Date(Date.now()+86400000).toISOString()) : null;
      await sql`update user_roles set permanent_ban=${isPermanent}, banned_until=${banUntil}, shadow_banned=${action==="shadow_ban"}, ban_reason=${data.reason??null}, punishment_reason=${data.reason??null}, punished_at=now(), punished_by=${context.userId}, revoked_role=${revoke?target.role:null}, revoked_founder_number=${revoke?target.founder_number:null}, role=${revoke?"user":target.role}, founder_number=${revoke?null:target.founder_number}, assignment_source=${revoke?"manual":target.assignment_source}, assignment_key=${revoke?null:target.assignment_key}, updated_at=now() where user_id=${data.targetUserId}`;
    } else if(action==="unban") {
      await sql`update user_roles set permanent_ban=false,banned_until=null,ban_reason=null,punishment_reason=null,punished_at=null,punished_by=null,updated_at=now() where user_id=${data.targetUserId}`;
    } else if(action==="mute") {
      await sql`update user_roles set muted_until=${expires ?? new Date(Date.now()+86400000).toISOString()},punishment_reason=${data.reason??null},punished_at=now(),punished_by=${context.userId},updated_at=now() where user_id=${data.targetUserId}`;
    } else if(action==="unmute") {
      await sql`update user_roles set muted_until=null,updated_at=now() where user_id=${data.targetUserId}`;
    } else if(action==="shadow_unban") {
      await sql`update user_roles set shadow_banned=false,punishment_reason=null,punished_at=null,punished_by=null,updated_at=now() where user_id=${data.targetUserId}`;
    }
    await sql`insert into moderation_actions(id,actor_id,target_user_id,action,reason,expires_at) values(${crypto.randomUUID()},${context.userId},${data.targetUserId},${action},${data.reason??null},${expires})`;
    await sql`insert into audit_log(id,actor_id,action,target_user_id,metadata) values(${crypto.randomUUID()},${context.userId},${`moderation_${action}`},${data.targetUserId},${JSON.stringify({reason:data.reason??null,durationHours:data.durationHours??null})})`;
    return {ok:true};
  });

export const listModerationUsers = createServerFn({method:"GET"})
  .middleware([authMiddleware])
  .handler(async({context})=>{
    const {sql}=await requireModerationAdmin(context.userId);
    return sql`select p.user_id,p.permanent_id,p.username,p.display_name,p.image,coalesce(r.role,'user') as role,r.founder_number,r.permanent_ban,r.banned_until::text as banned_until,r.muted_until::text as muted_until,r.shadow_banned,r.ban_reason,r.punishment_reason,r.punished_at::text as punished_at,r.punished_by,r.revoked_role,r.revoked_founder_number from profiles p left join user_roles r on r.user_id=p.user_id where p.deleted_at is null order by case when r.permanent_ban then 0 when r.shadow_banned then 1 when r.muted_until>now() then 2 else 3 end,p.created_at desc limit 1000`;
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => roleSchema.parse(data))
  .handler(async ({ context, data }) => {
    const {sql} = await requireAngelGirl(context.userId);
    if (["founder", "angel_girl", "supreme_archmage", "hardware_scientist"].includes(data.role)) {
      throw new Error("Fundadores e cargos especiais são definidos automaticamente por e-mail.");
    }
    let targetUserId = data.targetUserId;
    let assignmentKey: string | null = null;
    if (data.role === "sub_founder") {
      const target = await sql<{user_id:string;permanent_id:string}>`select user_id,permanent_id from profiles where permanent_id=${data.targetUserId} and deleted_at is null limit 1`;
      if (!target[0]) throw new Error("ID permanente não encontrado.");
      targetUserId = target[0].user_id;
      assignmentKey = target[0].permanent_id;
    }
    if (targetUserId === context.userId) throw new Error("Sua própria conta não pode perder o cargo por este painel.");
    const currentTargetRole = await getRole(sql, targetUserId);
    if (["founder", "angel_girl", "supreme_archmage", "hardware_scientist"].includes(currentTargetRole.role)) {
      throw new Error("Cargos protegidos não podem ser alterados por este painel.");
    }
    if (currentTargetRole.permanent_ban) throw new Error("A conta alvo está banida permanentemente.");
    const assignmentSource = data.role === "sub_founder" ? "id" : "manual";
    await sql`update user_roles set role=${data.role}, founder_number=null, assignment_source=${assignmentSource}, assignment_key=${assignmentSource === "id" ? assignmentKey : null}, updated_at=now() where user_id=${targetUserId}`;
    await sql`insert into audit_log (id,actor_id,action,target_user_id,metadata) values (${crypto.randomUUID()},${context.userId},'set_role',${targetUserId},${JSON.stringify({role:data.role,assignmentSource,permanentId:assignmentKey})})`;
    return { ok:true };
  });

export const listUsersForRoleManagement = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { sql } = await requireAngelGirl(context.userId);
    const rows = await sql<{user_id:string;permanent_id:string;username:string;display_name:string;image:string|null;role:string;founder_number:number|null;assignment_source:string}>`
      select p.user_id,p.permanent_id,p.username,p.display_name,p.image,coalesce(r.role,'user') as role,r.founder_number,coalesce(r.assignment_source,'manual') as assignment_source
      from profiles p left join user_roles r on r.user_id=p.user_id
      where p.deleted_at is null order by p.created_at desc limit 500
    `;
    return rows;
  });

export const listReportModerators = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { sql } = await requireAngelGirl(context.userId);
    return sql<{user_id:string;permanent_id:string;username:string;display_name:string;image:string|null}>`
      select rm.user_id,p.permanent_id,p.username,p.display_name,p.image
      from report_moderators rm join profiles p on p.user_id=rm.user_id
      where p.deleted_at is null order by rm.created_at desc
    `;
  });

export const setReportModerator = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => reportModeratorSchema.parse(data))
  .handler(async ({ context, data }) => {
    const { sql } = await requireAngelGirl(context.userId);
    const targetRows = await sql<{user_id:string;permanent_id:string}>`select user_id,permanent_id from profiles where permanent_id=${data.userId} and deleted_at is null limit 1`;
    const target = targetRows[0];
    if (!target) throw new Error("ID permanente não encontrado.");
    if (target.user_id === context.userId) throw new Error("A Angel Girl já possui acesso às denúncias.");
    if (data.enabled) {
      await sql`insert into report_moderators(user_id,added_by) values(${target.user_id},${context.userId}) on conflict(user_id) do nothing`;
    } else {
      await sql`delete from report_moderators where user_id=${target.user_id}`;
    }
    await sql`insert into audit_log(id,actor_id,action,target_user_id,metadata) values(${crypto.randomUUID()},${context.userId},${data.enabled?'grant_report_access':'revoke_report_access'},${target.user_id},${JSON.stringify({permanentId:target.permanent_id})})`;
    return { ok:true };
  });

export const listReports = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { sql } = await requireReportModerator(context.userId);
    const rows = await sql<{
      id:string; reporter_id:string; reporter_username:string|null; reporter_name:string|null;
      target_user_id:string|null; target_post_id:string|null; target_message_id:string|null;
      reason:string; created_at:string; status:string; target_type:string|null; target_snapshot:string|null;
      decision:string|null; decision_reason:string|null; resolved_by:string|null; resolved_at:string|null;
    }>`
      select r.id,r.reporter_id,r.target_user_id,r.target_post_id,r.target_message_id,r.reason,r.created_at::text as created_at,
        r.status,r.target_type,r.target_snapshot,r.decision,r.decision_reason,r.resolved_by,r.resolved_at,
        rp.username as reporter_username,rp.display_name as reporter_name
      from reports r left join profiles rp on rp.user_id=r.reporter_id
      order by case when r.status='pending' then 0 else 1 end,r.created_at desc limit 300
    `;
    return rows.map(r=>({
      ...r,
      createdAt:asIso(r.created_at),
      resolvedAt:r.resolved_at?asIso(r.resolved_at):null,
      snapshot:r.target_snapshot ? (()=>{try{return JSON.parse(r.target_snapshot!)}catch{return null}})() : null,
      reporter:{userId:r.reporter_id,username:r.reporter_username ?? 'desconhecido',displayName:r.reporter_name ?? 'Usuário'},
    }));
  });

export const resolveReport = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => reportDecisionSchema.parse(data))
  .handler(async ({ context, data }) => {
    const { sql } = await requireReportModerator(context.userId);
    const rows = await sql<{id:string;target_user_id:string|null;target_post_id:string|null;target_message_id:string|null;status:string}>`select id,target_user_id,target_post_id,target_message_id,status from reports where id=${data.reportId} limit 1`;
    const report=rows[0];
    if(!report) throw new Error("Denúncia não encontrada.");
    if(report.status==='resolved' || report.status==='dismissed') throw new Error("Esta denúncia já foi encerrada.");
    const decision=data.decision;
    const targetUserId=report.target_user_id ?? null;
    let punishmentTarget=targetUserId;
    if(!punishmentTarget && report.target_post_id){ const r=await sql<{user_id:string}>`select user_id from posts where id=${report.target_post_id} limit 1`; punishmentTarget=r[0]?.user_id ?? null; }
    if(!punishmentTarget && report.target_message_id){ const r=await sql<{sender_id:string}>`select sender_id from messages where id=${report.target_message_id} limit 1`; punishmentTarget=r[0]?.sender_id ?? null; }
    if(decision==='delete_content') {
      if(report.target_post_id) await sql`update posts set deleted_at=now() where id=${report.target_post_id}`;
      if(report.target_message_id) await sql`update messages set deleted_at=now() where id=${report.target_message_id}`;
    }
    if(decision==='mute' || decision==='ban' || decision==='shadow_ban') {
      if(!punishmentTarget) throw new Error("Não foi possível localizar o usuário alvo.");
      const targetRole=await syncRoleForUser(sql,punishmentTarget);
      const actorRole=await syncRoleForUser(sql,context.userId);
      const privilegedTarget = ['founder','angel_girl','supreme_archmage','sub_founder','admin','moderator'].includes(targetRole.role);
      if(privilegedTarget && !['founder','angel_girl'].includes(actorRole.role)) throw new Error("Somente Fundadores ou a Angel Girl podem aplicar punições a cargos privilegiados.");
      const revoke = privilegedTarget && ['ban','shadow_ban'].includes(decision);
      if(decision==='mute') await sql`update user_roles set muted_until=${new Date(Date.now()+(data.durationHours??24)*3600000).toISOString()},updated_at=now() where user_id=${punishmentTarget}`;
      if(decision==='ban') await sql`update user_roles set permanent_ban=false,banned_until=${new Date(Date.now()+(data.durationHours??24)*3600000).toISOString()},ban_reason=${data.reason??null},revoked_role=${revoke?targetRole.role:null},revoked_founder_number=${revoke?targetRole.founder_number:null},role=${revoke?'user':targetRole.role},founder_number=${revoke?null:targetRole.founder_number},assignment_source=${revoke?'manual':targetRole.assignment_source},assignment_key=${revoke?null:targetRole.assignment_key},updated_at=now() where user_id=${punishmentTarget}`;
      if(decision==='shadow_ban') await sql`update user_roles set permanent_ban=false,shadow_banned=true,revoked_role=${revoke?targetRole.role:null},revoked_founder_number=${revoke?targetRole.founder_number:null},role=${revoke?'user':targetRole.role},founder_number=${revoke?null:targetRole.founder_number},assignment_source=${revoke?'manual':targetRole.assignment_source},assignment_key=${revoke?null:targetRole.assignment_key},updated_at=now() where user_id=${punishmentTarget}`;
      await sql`insert into moderation_actions(id,actor_id,target_user_id,action,reason,expires_at) values(${crypto.randomUUID()},${context.userId},${punishmentTarget},${decision},${data.reason??null},${decision==='shadow_ban'?null:new Date(Date.now()+(data.durationHours??24)*3600000).toISOString()})`;
    }
    if(decision==='warning' && punishmentTarget) await sql`insert into moderation_actions(id,actor_id,target_user_id,action,reason) values(${crypto.randomUUID()},${context.userId},${punishmentTarget},'warning',${data.reason??null})`;
    const finalStatus=decision==='dismiss'?'dismissed':'resolved';
    await sql`update reports set status=${finalStatus},decision=${decision},decision_reason=${data.reason??null},resolved_by=${context.userId},resolved_at=now() where id=${report.id}`;
    return {ok:true};
  });

export const listHardwareLabEntries = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { sql } = await requireHardwareScientist(context.userId);
    return sql<{ id:string; category:string; title:string; content:string; created_at:string; updated_at:string }>`
      select id,category,title,content,created_at::text as created_at,updated_at::text as updated_at
      from hardware_lab_entries
      where author_id=${context.userId}
      order by updated_at desc
      limit 500
    `;
  });

export const createHardwareLabEntry = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: {category:string;title:string;content:string}) => {
    const category = data.category.trim();
    const title = data.title.trim();
    const content = data.content.trim();
    const allowed = ["idea","experiment","investigation","solution","discovery","record"];
    if (!allowed.includes(category)) throw new Error("Categoria inválida.");
    if (title.length < 2 || title.length > 160) throw new Error("O título deve ter entre 2 e 160 caracteres.");
    if (content.length < 1 || content.length > 10000) throw new Error("O registro deve ter entre 1 e 10.000 caracteres.");
    return {category,title,content};
  })
  .handler(async ({ context, data }) => {
    const { sql } = await requireHardwareScientist(context.userId);
    const id = crypto.randomUUID();
    await sql`insert into hardware_lab_entries(id,author_id,category,title,content) values(${id},${context.userId},${data.category},${data.title},${data.content})`;
    return {ok:true,id};
  });

export const deleteHardwareLabEntry = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => { if (!id?.trim()) throw new Error("Registro inválido."); return id; })
  .handler(async ({ context, data }) => {
    const { sql } = await requireHardwareScientist(context.userId);
    const result = await sql`delete from hardware_lab_entries where id=${data} and author_id=${context.userId} returning id`;
    if (!result.length) throw new Error("Registro não encontrado.");
    return {ok:true};
  });

export const listFounders = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireFounder(context.userId);
    const sql = await getSql();
    return sql<{user_id:string;role:string;founder_number:number|null;username:string;display_name:string;image:string|null}>`
      select r.user_id,r.role,r.founder_number,p.username,p.display_name,p.image from user_roles r join profiles p on p.user_id=r.user_id where r.role='founder' order by r.founder_number nulls last
    `;
  });


export const toggleReaction = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => reactionSchema.parse(data))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await assertCanAct(sql, context.userId);
    const existing = await sql`select 1 from post_reactions where user_id=${context.userId} and post_id=${data.id} and reaction=${data.reaction} limit 1`;
    if (existing.length) {
      await sql`delete from post_reactions where user_id=${context.userId} and post_id=${data.id} and reaction=${data.reaction}`;
      return { active: false };
    }
    const post = await assertPostInteractable(sql, context.userId, data.id);
    await sql`insert into post_reactions(user_id,post_id,reaction) values(${context.userId},${data.id},${data.reaction})`;
    await notify(sql, post.user_id, context.userId, "reaction", data.id);
    return { active: true };
  });

export const toggleCommentReaction = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => reactionSchema.parse(data))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await assertCanAct(sql, context.userId);
    const comment = await sql<{user_id:string;post_id:string}>`select user_id,post_id from comments where id=${data.id} and deleted_at is null limit 1`;
    if (!comment[0]) throw new Error("Comentário não encontrado.");
    await assertPostInteractable(sql, context.userId, comment[0].post_id);
    const existing = await sql`select 1 from comment_reactions where user_id=${context.userId} and comment_id=${data.id} and reaction=${data.reaction} limit 1`;
    if (existing.length) { await sql`delete from comment_reactions where user_id=${context.userId} and comment_id=${data.id} and reaction=${data.reaction}`; return {active:false}; }
    await sql`insert into comment_reactions(user_id,comment_id,reaction) values(${context.userId},${data.id},${data.reaction})`;
    await notify(sql, comment[0].user_id, context.userId, "reaction", comment[0].post_id, data.id);
    return {active:true};
  });

export const toggleRepost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: postId }) => {
    const sql = await getSql();
    await assertCanAct(sql, context.userId);
    const post = await assertPostInteractable(sql, context.userId, postId);
    const existing = await sql`select 1 from reposts where user_id=${context.userId} and post_id=${postId} limit 1`;
    if (existing.length) { await sql`delete from reposts where user_id=${context.userId} and post_id=${postId}`; return {reposted:false}; }
    await sql`insert into reposts(user_id,post_id) values(${context.userId},${postId})`;
    await notify(sql, post.user_id, context.userId, "repost", postId);
    return {reposted:true};
  });

export const toggleBookmark = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: postId }) => {
    const sql = await getSql();
    await assertCanAct(sql, context.userId);
    await assertPostInteractable(sql, context.userId, postId);
    const existing = await sql`select 1 from bookmarks where user_id=${context.userId} and post_id=${postId} limit 1`;
    if (existing.length) { await sql`delete from bookmarks where user_id=${context.userId} and post_id=${postId}`; return {bookmarked:false}; }
    await sql`insert into bookmarks(user_id,post_id) values(${context.userId},${postId})`;
    return {bookmarked:true};
  });

export const createQuote = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => quotePostSchema.parse(data))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await assertCanAct(sql, context.userId);
    const post = await assertPostInteractable(sql, context.userId, data.postId);
    const id = crypto.randomUUID();
    await sql`insert into posts(id,user_id,body,quoted_post_id) values(${id},${context.userId},${data.body},${data.postId})`;
    await sql`insert into quotes(id,user_id,post_id,body) values(${crypto.randomUUID()},${context.userId},${data.postId},${data.body})`;
    await registerMentions(sql, data.body, context.userId, { postId: data.postId });
    await notify(sql, post.user_id, context.userId, "quote", data.postId);
    return {id};
  });

export const listBookmarks = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql.query<PostRow>(`select ${POST_SELECT}, exists(select 1 from likes l where l.post_id=p.id and l.user_id=$1) as liked_by_me, true as bookmarked_by_me, exists(select 1 from reposts rp where rp.post_id=p.id and rp.user_id=$1) as reposted_by_me from bookmarks b join posts p on p.id=b.post_id join profiles pr on pr.user_id=p.user_id left join user_roles ur on ur.user_id=p.user_id left join posts qp on qp.id=p.quoted_post_id and qp.deleted_at is null left join profiles qpr on qpr.user_id=qp.user_id left join user_roles qur on qur.user_id=qp.user_id where b.user_id=$1 and p.deleted_at is null order by b.created_at desc limit 200`, [context.userId]);
    return rows.map(mapPost);
  });

export const getProfileReposts = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .validator((username:string)=>username.trim().toLowerCase())
  .handler(async ({context,data:username})=>{
    const sql=await getSql();
    const p=await sql<{user_id:string}>`select user_id from profiles where username=${username} and deleted_at is null and (${context.userId ?? null} is null or not exists (select 1 from user_roles sr where sr.user_id=profiles.user_id and sr.shadow_banned=true and profiles.user_id<>${context.userId})) and (${context.userId ?? null} is not null or not exists (select 1 from user_roles sr where sr.user_id=profiles.user_id and sr.shadow_banned=true)) limit 1`;
    if(!p[0]) return [];
    const viewer=context.userId ?? null;
    const rows=await sql.query<PostRow>(`select ${POST_SELECT}, ${viewer ? "exists(select 1 from likes l where l.post_id=p.id and l.user_id=$2)" : "false"} as liked_by_me, ${viewer ? "exists(select 1 from bookmarks b where b.post_id=p.id and b.user_id=$2)" : "false"} as bookmarked_by_me, ${viewer ? "exists(select 1 from reposts r2 where r2.post_id=p.id and r2.user_id=$2)" : "false"} as reposted_by_me from reposts rp join posts p on p.id=rp.post_id join profiles pr on pr.user_id=p.user_id left join user_roles ur on ur.user_id=p.user_id left join posts qp on qp.id=p.quoted_post_id and qp.deleted_at is null left join profiles qpr on qpr.user_id=qp.user_id left join user_roles qur on qur.user_id=qp.user_id where rp.user_id=$1 and p.deleted_at is null and pr.deleted_at is null order by rp.created_at desc limit 200`, viewer ? [p[0].user_id,viewer] : [p[0].user_id]);
    return rows.map(mapPost);
  });

export const getProfileLikes = createServerFn({ method: "GET" })
  .middleware([optionalAuthMiddleware])
  .validator((username:string)=>username.trim().toLowerCase())
  .handler(async ({context,data:username})=>{
    const sql=await getSql();
    const p=await sql<{user_id:string}>`select user_id from profiles where username=${username} and deleted_at is null and (${context.userId ?? null} is null or not exists (select 1 from user_roles sr where sr.user_id=profiles.user_id and sr.shadow_banned=true and profiles.user_id<>${context.userId})) and (${context.userId ?? null} is not null or not exists (select 1 from user_roles sr where sr.user_id=profiles.user_id and sr.shadow_banned=true)) limit 1`;
    if(!p[0]) return [];
    const viewer=context.userId ?? null;
    const rows=await sql.query<PostRow>(`select ${POST_SELECT}, ${viewer ? "exists(select 1 from likes lm where lm.post_id=p.id and lm.user_id=$2)" : "false"} as liked_by_me, ${viewer ? "exists(select 1 from bookmarks b where b.post_id=p.id and b.user_id=$2)" : "false"} as bookmarked_by_me, ${viewer ? "exists(select 1 from reposts r2 where r2.post_id=p.id and r2.user_id=$2)" : "false"} as reposted_by_me from likes lk join posts p on p.id=lk.post_id join profiles pr on pr.user_id=p.user_id left join user_roles ur on ur.user_id=p.user_id left join posts qp on qp.id=p.quoted_post_id and qp.deleted_at is null left join profiles qpr on qpr.user_id=qp.user_id left join user_roles qur on qur.user_id=qp.user_id where lk.user_id=$1 and p.deleted_at is null and pr.deleted_at is null order by lk.created_at desc limit 200`, viewer ? [p[0].user_id,viewer] : [p[0].user_id]);
    return rows.map(mapPost);
  });

export const toggleMute = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((userId: string) => userId)
  .handler(async ({ context, data }) => {
    if (data === context.userId) throw new Error("Você não pode silenciar a si.");
    const sql = await getSql();
    const existing = await sql`select 1 from user_mutes where muter_id=${context.userId} and muted_id=${data} limit 1`;
    if (existing.length) { await sql`delete from user_mutes where muter_id=${context.userId} and muted_id=${data}`; return {muted:false}; }
    await sql`insert into user_mutes(muter_id,muted_id) values(${context.userId},${data}) on conflict do nothing`;
    return {muted:true};
  });

export const toggleRestriction = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((userId: string) => userId)
  .handler(async ({ context, data }) => {
    if (data === context.userId) throw new Error("Você não pode restringir a si.");
    const sql = await getSql();
    const existing = await sql`select 1 from user_restrictions where restrictor_id=${context.userId} and restricted_id=${data} limit 1`;
    if (existing.length) { await sql`delete from user_restrictions where restrictor_id=${context.userId} and restricted_id=${data}`; return {restricted:false}; }
    await sql`insert into user_restrictions(restrictor_id,restricted_id) values(${context.userId},${data}) on conflict do nothing`;
    return {restricted:true};
  });

export const getUserSecurityInfo = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { sql } = await requireAngelGirl(context.userId);
    const rows = await sql<{user_id:string;username:string;display_name:string;email:string;role:string;founder_number:number|null;created_at:string}>`select p.user_id,p.username,p.display_name,u.email,r.role,r.founder_number,u."createdAt"::text as created_at from profiles p join "user" u on u.id=p.user_id left join user_roles r on r.user_id=p.user_id where p.deleted_at is null order by u."createdAt" desc limit 500`;
    return rows.map((r)=>({...r,emailMasked:r.email.replace(/^(.{2}).*(@.*)$/,"$1***$2")}));
  });

export const revealUserEmail = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: {targetUserId:string}) => { if(!data.targetUserId) throw new Error("Usuário não encontrado."); return data; })
  .handler(async ({ context, data }) => {
    const { sql } = await requireAngelGirl(context.userId);
    const rows = await sql<{email:string}>`select email from "user" where id=${data.targetUserId} limit 1`;
    if(!rows[0]) throw new Error("Usuário não encontrado.");
    await sql`insert into audit_log(id,actor_id,action,target_user_id,metadata) values(${crypto.randomUUID()},${context.userId},'reveal_email',${data.targetUserId},${JSON.stringify({})})`;
    return {email:rows[0].email};
  });

export const getMyPreferences = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const [n] = await sql<{likes:boolean;comments:boolean;follows:boolean;messages:boolean;reposts:boolean;mentions:boolean;quotes:boolean;reactions:boolean}>`select likes,comments,follows,messages,reposts,mentions,quotes,reactions from notification_preferences where user_id=${context.userId} limit 1`;
    const [p] = await sql<{message_policy:string;mention_policy:string;discoverable:boolean}>`select message_policy,mention_policy,discoverable from privacy_preferences where user_id=${context.userId} limit 1`;
    return { notifications: n ?? {likes:true,comments:true,follows:true,messages:true,reposts:true,mentions:true,quotes:true,reactions:true}, privacy: p ?? {message_policy:"requests",mention_policy:"everyone",discoverable:true} };
  });

export const updateMyPreferences = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: {notifications?: Record<string,boolean>; privacy?: {message_policy?:string;mention_policy?:string;discoverable?:boolean}}) => {
    if (data.privacy?.message_policy && !["everyone", "requests", "nobody"].includes(data.privacy.message_policy)) throw new Error("Política de mensagens inválida.");
    if (data.privacy?.mention_policy && !["everyone", "followers", "nobody"].includes(data.privacy.mention_policy)) throw new Error("Política de menções inválida.");
    return data;
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const n=data.notifications;
    if(n) await sql`insert into notification_preferences(user_id,likes,comments,follows,messages,reposts,mentions,quotes,reactions) values(${context.userId},${n.likes??true},${n.comments??true},${n.follows??true},${n.messages??true},${n.reposts??true},${n.mentions??true},${n.quotes??true},${n.reactions??true}) on conflict(user_id) do update set likes=excluded.likes,comments=excluded.comments,follows=excluded.follows,messages=excluded.messages,reposts=excluded.reposts,mentions=excluded.mentions,quotes=excluded.quotes,reactions=excluded.reactions,updated_at=now()`;
    const v=data.privacy;
    if(v) await sql`insert into privacy_preferences(user_id,message_policy,mention_policy,discoverable) values(${context.userId},${v.message_policy??"requests"},${v.mention_policy??"everyone"},${v.discoverable??true}) on conflict(user_id) do update set message_policy=excluded.message_policy,mention_policy=excluded.mention_policy,discoverable=excluded.discoverable,updated_at=now()`;
    return {ok:true};
  });

export const toggleMessageReaction = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: {messageId:string; reaction:string}) => {
    const reaction = data.reaction?.trim() ?? "";
    if(!data.messageId?.trim() || !reaction || reaction.length > 24) throw new Error("Reação inválida.");
    return { messageId: data.messageId.trim(), reaction };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await assertCanAct(sql, context.userId, { messaging: true });
    const access = await sql`select 1 from messages m join message_threads t on t.id=m.thread_id where m.id=${data.messageId} and (${context.userId}=t.user_a or ${context.userId}=t.user_b) limit 1`;
    if(!access.length) throw new Error("Mensagem não encontrada.");
    const existing = await sql`select 1 from message_reactions where user_id=${context.userId} and message_id=${data.messageId} and reaction=${data.reaction} limit 1`;
    if(existing.length){await sql`delete from message_reactions where user_id=${context.userId} and message_id=${data.messageId} and reaction=${data.reaction}`;return {active:false};}
    await sql`insert into message_reactions(user_id,message_id,reaction) values(${context.userId},${data.messageId},${data.reaction})`;
    return {active:true};
  });

export const deleteMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((messageId:string)=>messageId)
  .handler(async ({context,data})=>{const sql=await getSql(); await assertCanAct(sql, context.userId, { messaging: true }); await sql`update messages set deleted_at=now() where id=${data} and sender_id=${context.userId}`; return {ok:true};});


export const createGroup = createServerFn({method:"POST"}).middleware([authMiddleware]).validator((data:{name:string;memberIds:string[]})=>{const name=data.name.trim(); if(name.length<2||name.length>80) throw new Error("Nome do grupo inválido."); return {name,memberIds:[...new Set(data.memberIds)]};}).handler(async({context,data})=>{const sql=await getSql(); await assertCanAct(sql, context.userId, { messaging: true }); const id=crypto.randomUUID(); await sql`insert into message_groups(id,name,created_by) values(${id},${data.name},${context.userId})`; await sql`insert into message_group_members(group_id,user_id,role) values(${id},${context.userId},'owner') on conflict do nothing`; for(const memberId of data.memberIds){ if(memberId===context.userId) continue; const exists=await sql`select 1 from profiles where user_id=${memberId} and deleted_at is null limit 1`; if(exists.length) await sql`insert into message_group_members(group_id,user_id,role) values(${id},${memberId},'member') on conflict do nothing`; } return {groupId:id};});

export const listGroups = createServerFn({method:"GET"}).middleware([authMiddleware]).handler(async({context})=>{const sql=await getSql(); await assertCanAct(sql, context.userId, { messaging: true }); const role=await syncRoleForUser(sql,context.userId); if(["founder","angel_girl"].includes(role.role)){const founders=await sql<{user_id:string}>`select user_id from user_roles where role in ('founder','angel_girl') order by case when role='angel_girl' then 0 else 1 end, founder_number nulls last`; let g=await sql<{id:string}>`select g.id from message_groups g join user_roles ur on ur.user_id=g.created_by where g.name='Fundadores' and ur.role in ('founder','angel_girl') order by g.created_at asc limit 1`; if(!g[0]){const id=crypto.randomUUID();await sql`insert into message_groups(id,name,created_by) values(${id},'Fundadores',${context.userId})`;g=[{id}];} for(const f of founders) await sql`insert into message_group_members(group_id,user_id,role) values(${g[0].id},${f.user_id},case when ${f.user_id}=${context.userId} then 'owner' else 'member' end) on conflict do nothing`; } return sql<{id:string;name:string;created_by:string}>`select g.id,g.name,g.created_by from message_groups g join message_group_members gm on gm.group_id=g.id where gm.user_id=${context.userId} order by g.updated_at desc`;});

export const listGroupMessages = createServerFn({method:"GET"}).middleware([authMiddleware]).validator((id:string)=>id).handler(async({context,data:groupId})=>{const sql=await getSql(); await assertCanAct(sql, context.userId, { messaging: true }); const access=await sql`select 1 from message_group_members where group_id=${groupId} and user_id=${context.userId} limit 1`; if(!access.length) throw new Error("Grupo não encontrado."); return sql`select gm.id,gm.body,gm.created_at::text as created_at,gm.sender_id,gm.reply_to_id, coalesce((select json_agg(json_build_object('reaction',x.reaction,'count',x.count,'reactedByMe',x.reacted)) from (select reaction,count(*)::int count,bool_or(user_id=${context.userId}) reacted from group_message_reactions where message_id=gm.id group by reaction)x),'[]') reactions from group_messages gm where gm.group_id=${groupId} and gm.deleted_at is null order by gm.created_at asc limit 300`;});

export const sendGroupMessage = createServerFn({method:"POST"}).middleware([authMiddleware]).validator((data:{groupId:string;body:string;replyToId?:string|null})=>{if(!data.groupId.trim()||!data.body.trim()) throw new Error("Escreva uma mensagem."); return {...data,body:data.body.trim().slice(0,2000)};}).handler(async({context,data})=>{const sql=await getSql(); await assertCanAct(sql, context.userId, { messaging: true }); const access=await sql`select 1 from message_group_members where group_id=${data.groupId} and user_id=${context.userId} limit 1`; if(!access.length) throw new Error("Você não pertence a este grupo."); if(data.replyToId){const reply=await sql`select 1 from group_messages where id=${data.replyToId} and group_id=${data.groupId} and deleted_at is null limit 1`; if(!reply.length) throw new Error("Mensagem de resposta não encontrada neste grupo.");} const id=crypto.randomUUID(); await sql`insert into group_messages(id,group_id,sender_id,body,reply_to_id) values(${id},${data.groupId},${context.userId},${data.body},${data.replyToId??null})`; await sql`update message_groups set updated_at=now() where id=${data.groupId}`; return {id};});

export const toggleGroupMessageReaction = createServerFn({method:"POST"}).middleware([authMiddleware]).validator((data:{messageId:string;reaction:string})=>{const reaction=data.reaction.trim(); if(!data.messageId.trim()||!reaction||reaction.length>24) throw new Error("Reação inválida."); return {messageId:data.messageId, reaction};}).handler(async({context,data})=>{const sql=await getSql(); await assertCanAct(sql, context.userId, { messaging: true }); const access=await sql`select 1 from group_messages gm join message_group_members m on m.group_id=gm.group_id and m.user_id=${context.userId} where gm.id=${data.messageId} limit 1`; if(!access.length) throw new Error("Mensagem não encontrada."); const ex=await sql`select 1 from group_message_reactions where user_id=${context.userId} and message_id=${data.messageId} and reaction=${data.reaction} limit 1`; if(ex.length){await sql`delete from group_message_reactions where user_id=${context.userId} and message_id=${data.messageId} and reaction=${data.reaction}`;return {active:false};} await sql`insert into group_message_reactions(user_id,message_id,reaction) values(${context.userId},${data.messageId},${data.reaction})`; return {active:true};});

export const deleteGroupMessage = createServerFn({method:"POST"}).middleware([authMiddleware]).validator((id:string)=>id).handler(async({context,data})=>{const sql=await getSql(); await assertCanAct(sql, context.userId, { messaging: true }); await sql`update group_messages set deleted_at=now() where id=${data} and sender_id=${context.userId}`; return {ok:true};});

export const createGlobalAnnouncement = createServerFn({method:"POST"}).middleware([authMiddleware]).validator((data:{body:string;seconds?:number})=>{if(data.body.trim().length<1) throw new Error("Mensagem vazia."); return {body:data.body.trim().slice(0,500),seconds:Math.min(Math.max(data.seconds??10,3),60)};}).handler(async({context,data})=>{const {sql}=await requireFounder(context.userId); const id=crypto.randomUUID(); await sql`insert into global_announcements(id,body,created_by,expires_at) values(${id},${data.body},${context.userId},now()+(${data.seconds} * interval '1 second'))`; return {id};});

export const listActiveGlobalAnnouncements = createServerFn({method:"GET"}).middleware([optionalAuthMiddleware]).handler(async()=>{const sql=await getSql(); return sql<{id:string;body:string;created_at:string;expires_at:string}>`select id,body,created_at::text as created_at,expires_at::text as expires_at from global_announcements where expires_at>now() order by created_at desc limit 3`;});
