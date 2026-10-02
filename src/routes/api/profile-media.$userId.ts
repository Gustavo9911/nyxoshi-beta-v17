import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/verify.server";

const PROFILE_MEDIA_TYPES: Record<string, string> = {
  "image/png": "image/png",
  "image/jpeg": "image/jpeg",
  "image/webp": "image/webp",
  "image/gif": "image/gif",
};
const MAX_PROFILE_MEDIA_BYTES = 4 * 1024 * 1024;
const MEDIA_KINDS = ["image", "banner", "gif", "background"] as const;
type MediaKind = (typeof MEDIA_KINDS)[number];

function decodeImageDataUrl(value: string): { mime: string; bytes: Buffer } | null {
  const match = value.match(/^data:([^;,]+);base64,([A-Za-z0-9+/]*={0,2})$/i);
  if (!match) return null;
  const mime = PROFILE_MEDIA_TYPES[match[1].toLowerCase()];
  if (!mime) return null;
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length === 0 || bytes.length > MAX_PROFILE_MEDIA_BYTES) return null;
  return { mime, bytes };
}

function parseKind(value: string | null): MediaKind | null {
  return MEDIA_KINDS.includes(value as MediaKind) ? (value as MediaKind) : null;
}

export const Route = createFileRoute("/api/profile-media/$userId")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const kind = parseKind(new URL(request.url).searchParams.get("kind"));
        if (!kind || !params.userId) return new Response("Not found", { status: 404 });

        const sql = await getSql();
        const viewer = await getSessionUser();
        const rows = await sql<{
          user_id: string;
          image: string | null;
          banner_url: string | null;
          profile_gif_url: string | null;
          background_url: string | null;
        }>`
          select user_id, image, banner_url, profile_gif_url, background_url
          from profiles
          where user_id=${params.userId} and deleted_at is null
          limit 1
        `;
        const profile = rows[0];
        if (!profile) return new Response("Not found", { status: 404 });

        const shadow = await sql`
          select 1 from user_roles
          where user_id=${profile.user_id} and shadow_banned=true
          limit 1
        `;
        if (shadow.length && profile.user_id !== viewer?.id) return new Response("Not found", { status: 404 });

        if (viewer?.id && viewer.id !== profile.user_id) {
          const blocked = await sql`
            select 1 from blocks
            where (blocker_id=${viewer.id} and blocked_id=${profile.user_id})
               or (blocker_id=${profile.user_id} and blocked_id=${viewer.id})
            limit 1
          `;
          if (blocked.length) return new Response("Not found", { status: 404 });
        }

        const source = kind === "image" ? profile.image
          : kind === "banner" ? profile.banner_url
          : kind === "gif" ? profile.profile_gif_url
          : profile.background_url;
        if (!source?.startsWith("data:")) return new Response("Not found", { status: 404 });

        const media = decodeImageDataUrl(source);
        if (!media) return new Response("Unsupported media", { status: 415 });

        return new Response(media.bytes as unknown as BodyInit, {
          status: 200,
          headers: {
            "Content-Type": media.mime,
            "Content-Length": String(media.bytes.length),
            "Cache-Control": "private, max-age=300, must-revalidate",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
