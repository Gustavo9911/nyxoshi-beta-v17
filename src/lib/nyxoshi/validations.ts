import { z } from "zod";

const MAX_PROFILE_MEDIA_BYTES = 1 * 1024 * 1024;
const MAX_PROFILE_MEDIA_DATA_URL_CHARS = 1_500_000;
const MAX_PROFILE_MEDIA_TOTAL_BYTES = 3 * 1024 * 1024;
const MAX_POST_MEDIA_BYTES = 3 * 1024 * 1024;
const MAX_POST_MEDIA_DATA_URL_CHARS = 4_250_000;

const IMAGE_MIMES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"] as const;
const PROFILE_IMAGE_MIMES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
const AUDIO_MIMES = [
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/mp4",
  "audio/aac",
  "audio/flac",
  "audio/opus",
  "audio/webm",
] as const;
const VIDEO_MIMES = ["video/mp4", "video/webm", "video/quicktime", "video/ogg"] as const;
const ALL_POST_MIMES = new Set<string>([...IMAGE_MIMES, ...AUDIO_MIMES, ...VIDEO_MIMES]);

const MEDIA_EXTENSIONS: Record<"audio" | "video" | "image", string[]> = {
  audio: ["mp3", "wav", "ogg", "m4a", "aac", "flac", "opus", "webm"],
  video: ["mp4", "webm", "mov", "m4v", "ogv"],
  image: ["png", "jpg", "jpeg", "gif", "webp", "avif"],
};

function dataUrlInfo(value: string): { mime: string; bytes: number } | null {
  const match = value.match(/^data:([^;,]+);base64,([A-Za-z0-9+/]*={0,2})$/i);
  if (!match) return null;
  const payload = match[2];
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  return { mime: match[1].toLowerCase(), bytes: Math.max(0, Math.floor((payload.length * 3) / 4) - padding) };
}

function directUrlMediaTypes(value: string): ("audio" | "video" | "image")[] {
  if (value.length > 4096) return [];
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return [];
    const extension = url.pathname.toLowerCase().split(".").pop() ?? "";
    return (Object.entries(MEDIA_EXTENSIONS) as ["audio" | "video" | "image", string[]][])
      .filter(([, extensions]) => extensions.includes(extension))
      .map(([type]) => type);
  } catch {
    return [];
  }
}

function directUrlMediaType(value: string): "audio" | "video" | "image" | null {
  const matches = directUrlMediaTypes(value);
  return matches.length === 1 ? matches[0] : null;
}

function isAllowedDataMedia(value: string, mimes: readonly string[], maxBytes: number): boolean {
  const info = dataUrlInfo(value);
  return Boolean(info && mimes.includes(info.mime) && info.bytes > 0 && info.bytes <= maxBytes);
}

function isAllowedDirectMedia(value: string, type?: "audio" | "video" | "image"): boolean {
  return type ? directUrlMediaTypes(value).includes(type) : directUrlMediaTypes(value).length > 0;
}

const profileMediaSource = z.string().trim().max(MAX_PROFILE_MEDIA_DATA_URL_CHARS).refine((value) => {
  if (!value) return true;
  if (value.startsWith("data:")) return isAllowedDataMedia(value, PROFILE_IMAGE_MIMES, MAX_PROFILE_MEDIA_BYTES);
  return isAllowedDirectMedia(value, "image");
}, "Use uma imagem PNG, JPEG, WebP ou GIF válida, por arquivo ou URL direta.");

const postMediaSource = z.string().trim().max(MAX_POST_MEDIA_DATA_URL_CHARS).refine((value) => {
  if (!value) return true;
  if (value.startsWith("data:")) {
    const info = dataUrlInfo(value);
    if (!info || info.bytes <= 0 || info.bytes > MAX_POST_MEDIA_BYTES) return false;
    return ALL_POST_MIMES.has(info.mime);
  }
  return directUrlMediaTypes(value).length > 0;
}, "Use uma URL direta de mídia válida ou um arquivo compatível.");

const profileFieldsWithMedia = ["image", "bannerUrl", "profileGifUrl", "backgroundUrl"] as const;

export const createPostSchema = z.object({
  body: z.string().trim().max(500, "Máximo de 500 caracteres.").default(""),
  mediaUrl: postMediaSource.optional().or(z.literal("")),
  mediaType: z.enum(["audio", "video", "image"]).optional().nullable(),
  mediaAlt: z.string().trim().max(160).optional().or(z.literal("")),
  mediaDurationMs: z.number().int().min(0).max(86_400_000).optional().nullable(),
  mediaThumbnailUrl: postMediaSource.optional().or(z.literal("")),
}).refine((value) => value.body.trim().length > 0 || Boolean(value.mediaUrl), "Escreva alguma coisa ou adicione uma mídia.")
  .refine((value) => {
    if (!value.mediaUrl) return true;
    if (value.mediaUrl.startsWith("data:")) {
      const info = dataUrlInfo(value.mediaUrl);
      if (!info) return false;
      if (value.mediaType === "audio") return AUDIO_MIMES.includes(info.mime as (typeof AUDIO_MIMES)[number]);
      if (value.mediaType === "video") return VIDEO_MIMES.includes(info.mime as (typeof VIDEO_MIMES)[number]);
      return IMAGE_MIMES.includes(info.mime as (typeof IMAGE_MIMES)[number]);
    }
    const matches = directUrlMediaTypes(value.mediaUrl);
    if (matches.length > 1) return Boolean(value.mediaType && matches.includes(value.mediaType));
    return Boolean(value.mediaType && matches.includes(value.mediaType));
  }, "Informe o tipo da mídia para URLs .webm/.ogg ambíguas ou use um formato inequívoco.")
  .refine((value) => value.mediaDurationMs == null || value.mediaType === "audio" || value.mediaType === "video", "A duração só pode ser informada para áudio ou vídeo.")
  .refine((value) => Boolean(value.mediaUrl) || (!value.mediaType && !value.mediaAlt && value.mediaDurationMs == null && !value.mediaThumbnailUrl), "Os metadados de mídia exigem uma mídia na publicação.")
  .refine((value) => {
    if (!value.mediaThumbnailUrl) return true;
    if (value.mediaType !== "video") return false;
    if (value.mediaThumbnailUrl.startsWith("data:")) return isAllowedDataMedia(value.mediaThumbnailUrl, IMAGE_MIMES, 1 * 1024 * 1024);
    return isAllowedDirectMedia(value.mediaThumbnailUrl, "image");
  }, "A miniatura deve ser uma imagem válida e só pode acompanhar um vídeo.");

export const createCommentSchema = z.object({
  postId: z.string().min(1),
  parentId: z.string().optional().nullable(),
  body: z
    .string()
    .trim()
    .min(1, "Escreva um comentário.")
    .max(300, "Máximo de 300 caracteres."),
});


export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1, "Informe um nome.").max(40, "Máximo de 40 caracteres."),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,20}$/, "Use 3–20 caracteres: a–z, 0–9 e _."),
  bio: z.string().trim().max(160, "Máximo de 160 caracteres."),
  image: profileMediaSource.optional().or(z.literal("")),
  bannerUrl: profileMediaSource.optional().or(z.literal("")),
  profileGifUrl: z.string().trim().max(MAX_PROFILE_MEDIA_DATA_URL_CHARS).refine((value) => {
    if (!value) return true;
    if (value.startsWith("data:")) return isAllowedDataMedia(value, ["image/gif", "image/webp"], MAX_PROFILE_MEDIA_BYTES);
    try {
      const url = new URL(value);
      return (url.protocol === "http:" || url.protocol === "https:") && /\.(gif|webp)$/i.test(url.pathname);
    } catch { return false; }
  }, "Use um GIF ou WebP animado válido.").optional().or(z.literal("")),
  websiteUrl: z.string().trim().max(2048).url().refine((value) => {
    try { const url = new URL(value); return url.protocol === "http:" || url.protocol === "https:"; }
    catch { return false; }
  }, "Use uma URL http(s) válida.").optional().or(z.literal("")),
  themeId: z.enum(["nyxoshi", "amethyst", "midnight", "ocean", "rose"]).default("nyxoshi"),
  backgroundId: z.enum(["stars", "nebula", "midnight", "aurora", "custom"]).default("stars"),
  backgroundUrl: profileMediaSource.optional().or(z.literal("")),
  profileEffect: z.enum(["none", "glow", "shimmer", "float"]).default("glow"),
  profileIntro: z.enum(["moonrise", "fade", "stars", "none"]).default("moonrise"),
  profileIntroEnabled: z.boolean().default(true),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use uma cor hexadecimal válida.").default("#c084fc"),
}).refine((value) => {
  const total = profileFieldsWithMedia.reduce((sum, key) => {
    const source = value[key] ?? "";
    return sum + (source.startsWith("data:") ? (dataUrlInfo(source)?.bytes ?? Number.MAX_SAFE_INTEGER) : 0);
  }, 0);
  return total <= MAX_PROFILE_MEDIA_TOTAL_BYTES;
}, "Os arquivos locais do perfil juntos devem ter no máximo 3 MB.")
.refine((value) => value.backgroundId !== "custom" || Boolean(value.backgroundUrl), {
  path: ["backgroundUrl"],
  message: "Escolha uma imagem ao usar o fundo personalizado.",
});

export const reportSchema = z.object({
  targetUserId: z.string().optional(),
  targetPostId: z.string().optional(),
  targetMessageId: z.string().optional(),
  reason: z
    .string()
    .trim()
    .min(8, "Descreva o motivo.")
    .max(400, "Máximo de 400 caracteres."),
}).refine((value) => [value.targetUserId, value.targetPostId, value.targetMessageId].filter(Boolean).length === 1, {
  message: "Informe exatamente um alvo para a denúncia.",
});

export const feedQuerySchema = z.object({
  tab: z.enum(["forYou", "following", "videos"]).default("forYou"),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(80),
});


export const sendMessageSchema = z.object({
  recipientId: z.string().trim().min(1),
  body: z.string().trim().min(1, "Escreva uma mensagem.").max(2000, "Máximo de 2000 caracteres."),
  replyToId: z.string().nullable().optional(),
});

export const messageDecisionSchema = z.object({
  requestId: z.string().min(1),
  action: z.enum(["accept", "decline", "spam"]),
});

export const moderationSchema = z.object({
  targetUserId: z.string().min(1),
  action: z.enum(["ban", "unban", "mute", "unmute", "shadow_ban", "shadow_unban", "expel"]),
  reason: z.string().trim().max(400).optional(),
  durationHours: z.number().int().positive().max(8760).optional(),
});

export const roleSchema = z.object({
  targetUserId: z.string().min(1),
  role: z.enum(["user", "tester", "bug_tester", "designer", "contributor", "vip", "moderator", "admin", "sub_founder"]),
  founderNumber: z.number().int().min(1).max(3).optional(),
});


export const reactionSchema = z.object({ id: z.string().min(1), reaction: z.string().trim().min(1).max(24) });
export const quotePostSchema = z.object({ postId: z.string().min(1), body: z.string().trim().min(1).max(500) });
export const searchPeopleSchema = z.object({ q: z.string().trim().min(1).max(80) });


export const reportDecisionSchema = z.object({
  reportId: z.string().min(1),
  decision: z.enum(["dismiss", "warning", "mute", "ban", "shadow_ban", "delete_content"]),
  reason: z.string().trim().max(400).optional(),
  durationHours: z.number().int().positive().max(8760).optional(),
});

export const reportModeratorSchema = z.object({
  userId: z.string().trim().min(1),
  enabled: z.boolean(),
});
