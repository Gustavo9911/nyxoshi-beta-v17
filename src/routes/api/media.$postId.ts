import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/verify.server";

const MEDIA_TYPES: Record<string, string> = {
  "image/png": "image/png",
  "image/jpeg": "image/jpeg",
  "image/webp": "image/webp",
  "image/gif": "image/gif",
  "image/avif": "image/avif",
  "audio/mpeg": "audio/mpeg",
  "audio/wav": "audio/wav",
  "audio/x-wav": "audio/wav",
  "audio/ogg": "audio/ogg",
  "audio/mp4": "audio/mp4",
  "audio/aac": "audio/aac",
  "audio/flac": "audio/flac",
  "audio/opus": "audio/opus",
  "audio/webm": "audio/webm",
  "video/mp4": "video/mp4",
  "video/webm": "video/webm",
  "video/quicktime": "video/quicktime",
  "video/ogg": "video/ogg",
};
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"]);
const MAX_MEDIA_BYTES = 3 * 1024 * 1024;
const MAX_THUMBNAIL_BYTES = 1 * 1024 * 1024;

type MediaPart = "media" | "thumbnail";

function parsePart(value: string | null): MediaPart {
  return value === "thumbnail" ? "thumbnail" : "media";
}

function decodeDataUrl(value: string, maxBytes: number, imageOnly = false): { mime: string; bytes: Buffer } | null {
  const match = value.match(/^data:([^;,]+);base64,([A-Za-z0-9+/]*={0,2})$/i);
  if (!match) return null;
  const rawMime = match[1].toLowerCase();
  const mime = MEDIA_TYPES[rawMime];
  if (!mime || (imageOnly && !IMAGE_TYPES.has(rawMime))) return null;
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length === 0 || bytes.length > maxBytes) return null;
  return { mime, bytes };
}

function contentRange(range: string | null, size: number): { start: number; end: number } | null | false {
  if (!range) return null;
  const match = range.match(/^bytes=(\d*)-(\d*)$/i);
  if (!match || (!match[1] && !match[2])) return false;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isFinite(suffix) || suffix <= 0) return false;
    return { start: Math.max(0, size - suffix), end: size - 1 };
  }
  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : size - 1;
  if (!Number.isInteger(start) || !Number.isInteger(requestedEnd) || start < 0 || start >= size || requestedEnd < start) return false;
  return { start, end: Math.min(requestedEnd, size - 1) };
}

export const Route = createFileRoute("/api/media/$postId")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const url = new URL(request.url);
        const part = parsePart(url.searchParams.get("part"));
        const sql = await getSql();
        const user = await getSessionUser();
        const rows = await sql<{
          id: string;
          media_url: string | null;
          media_thumbnail_url: string | null;
          user_id: string;
        }>`
          select p.id, p.media_url, p.media_thumbnail_url, p.user_id
          from posts p
          join profiles pr on pr.user_id=p.user_id and pr.deleted_at is null
          where p.id=${params.postId} and p.deleted_at is null
          limit 1
        `;
        const post = rows[0];
        if (!post) return new Response("Not found", { status: 404 });

        const shadow = await sql`select 1 from user_roles where user_id=${post.user_id} and shadow_banned=true limit 1`;
        if (shadow.length && post.user_id !== user?.id) return new Response("Not found", { status: 404 });
        if (user?.id && user.id !== post.user_id) {
          const blocked = await sql`select 1 from blocks where (blocker_id=${user.id} and blocked_id=${post.user_id}) or (blocker_id=${post.user_id} and blocked_id=${user.id}) limit 1`;
          if (blocked.length) return new Response("Not found", { status: 404 });
        }

        const source = part === "thumbnail" ? post.media_thumbnail_url : post.media_url;
        if (!source?.startsWith("data:")) return new Response("Not found", { status: 404 });
        const media = part === "thumbnail"
          ? decodeDataUrl(source, MAX_THUMBNAIL_BYTES, true)
          : decodeDataUrl(source, MAX_MEDIA_BYTES);
        if (!media) return new Response("Unsupported media", { status: 415 });

        const requestedRange = request.headers.get("range");
        const range = part === "media" ? contentRange(requestedRange, media.bytes.length) : null;
        if (range === false) {
          return new Response(null, {
            status: 416,
            headers: {
              "Content-Range": `bytes */${media.bytes.length}`,
              "Accept-Ranges": "bytes",
              "Cache-Control": "private, max-age=300, must-revalidate",
            },
          });
        }
        const headers = new Headers({
          "Content-Type": media.mime,
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "private, max-age=300, must-revalidate",
          "Accept-Ranges": part === "media" ? "bytes" : "none",
        });
        if (!range) {
          headers.set("Content-Length", String(media.bytes.length));
          return new Response(media.bytes as unknown as BodyInit, { status: 200, headers });
        }
        const chunk = media.bytes.subarray(range.start, range.end + 1);
        headers.set("Content-Length", String(chunk.length));
        headers.set("Content-Range", `bytes ${range.start}-${range.end}/${media.bytes.length}`);
        return new Response(chunk as unknown as BodyInit, { status: 206, headers });
      },
    },
  },
});
