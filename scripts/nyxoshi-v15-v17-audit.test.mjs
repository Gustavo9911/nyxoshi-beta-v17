import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const server = read("src/lib/nyxoshi/server.ts");
const validation = read("src/lib/nyxoshi/validations.ts");
const compose = read("src/components/compose.tsx");
const settings = read("src/routes/settings.tsx");
const mediaRoute = read("src/routes/api/media.$postId.ts");
const profileMediaRoute = read("src/routes/api/profile-media.$userId.ts");
const migration = read("migrations/0011_v15_v17_profile_media.sql");


test("V15 migration contains every persisted personalization field", () => {
  for (const field of [
    "theme_id", "background_id", "background_url", "profile_effect",
    "profile_intro", "profile_intro_enabled", "accent_color",
  ]) assert.match(migration, new RegExp(`add column if not exists ${field}`));
});

test("V15 public profile hydration exposes the persisted personalization", () => {
  for (const field of [
    "theme_id", "background_id", "background_url", "profile_effect",
    "profile_intro", "profile_intro_enabled", "accent_color",
  ]) assert.ok(server.includes(field), `missing ${field}`);
  assert.match(server, /return hydrateProfile\(sql, rows\[0\], context\.userId\);/);
});

test("V15 profile media is size-limited and aggregate-safe", () => {
  assert.match(validation, /MAX_PROFILE_MEDIA_BYTES = 1 \* 1024 \* 1024/);
  assert.match(validation, /MAX_PROFILE_MEDIA_TOTAL_BYTES = 3 \* 1024 \* 1024/);
  assert.match(validation, /total <= MAX_PROFILE_MEDIA_TOTAL_BYTES/);
});

test("V16/V17 local post media stays below the serverless payload ceiling", () => {
  assert.match(compose, /MAX_AUDIO = 3 \* 1024 \* 1024/);
  assert.match(compose, /MAX_VIDEO = 3 \* 1024 \* 1024/);
  assert.match(compose, /MAX_IMAGE = 3 \* 1024 \* 1024/);
  assert.match(validation, /MAX_POST_MEDIA_BYTES = 3 \* 1024 \* 1024/);
});

test("V16/V17 media validation rejects unsupported MIME and unknown direct URL extensions", () => {
  assert.match(validation, /directUrlMediaTypes\(value\)/);
  assert.match(validation, /mimes\.includes\(info\.mime\)/);
  assert.match(validation, /Use uma URL direta de mídia válida/);
});

test("post media and thumbnails are served outside feed payloads", () => {
  assert.match(server, /\/api\/media\/\$\{row\.id\}/);
  assert.match(server, /\?part=thumbnail/);
  assert.match(mediaRoute, /media_thumbnail_url/);
  assert.match(mediaRoute, /MAX_THUMBNAIL_BYTES = 1 \* 1024 \* 1024/);
  assert.match(mediaRoute, /Accept-Ranges/);
  assert.match(server, /mediaThumbnailUrl: data\.mediaThumbnailUrl\?\.startsWith\("data:"\)/);
});

test("profile images are served through the dedicated media endpoint in repeated cards", () => {
  assert.match(server, /\/api\/profile-media\/\$\{encodeURIComponent\(userId\)\}\?kind=\$\{kind\}/);
  assert.match(profileMediaRoute, /createFileRoute\("\/api\/profile-media\/\$userId"\)/);
  assert.match(server, /image: profileMediaUrl\(row\.image, row\.user_id, "image"\)/);
});

test("comment mentions use exactly one target column", () => {
  const match = server.match(/await registerMentions\(sql, data\.body, context\.userId, \{([^}]*)\}\);/g) ?? [];
  assert.ok(match.some((line) => line.includes("{ commentId: id }")));
  assert.ok(!match.some((line) => line.includes("commentId: id, postId:")));
});

test("unchanged profile media is not resent during settings save", () => {
  assert.match(settings, /image === original\.image \? undefined : image/);
  assert.match(settings, /backgroundUrl === original\.backgroundUrl \? undefined : backgroundUrl/);
  assert.match(server, /data\.image === undefined \? current\.image/);
  assert.match(server, /data\.backgroundUrl === undefined \? current\.background_url/);
});

test("media endpoints fail closed for deleted, shadow-banned, or blocked content", () => {
  assert.match(mediaRoute, /p\.deleted_at is null/);
  assert.match(mediaRoute, /shadow_banned=true/);
  assert.match(mediaRoute, /from blocks/);
  assert.match(profileMediaRoute, /deleted_at is null/);
  assert.match(profileMediaRoute, /shadow_banned=true/);
  assert.match(profileMediaRoute, /from blocks/);
});
