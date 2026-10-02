import { useState, type ChangeEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Image, Link2, Music2, Paperclip, PlaySquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/user-avatar";
import { createPost } from "@/lib/nyxoshi/server";
import { withAuthRetry } from "@/lib/auth/mutation";
import type { Profile } from "@/lib/nyxoshi/types";
import { cn } from "@/lib/utils";

const SUPPORTED_IMAGE_MIMES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"]);

const MAX = 500;
const MAX_AUDIO = 3 * 1024 * 1024;
const MAX_VIDEO = 3 * 1024 * 1024;
const MAX_IMAGE = 3 * 1024 * 1024;

type MediaDraft = { url: string; type: "audio" | "video" | "image"; name: string; durationMs: number | null } | null;

function readFile(file: File, maxBytes: number): Promise<string> {
  if (file.size > maxBytes) throw new Error(`O arquivo deve ter no máximo ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

function identifyUrlTypes(value: string): ("audio" | "video" | "image")[] {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return [];
    const path = url.pathname.toLowerCase();
    const types: ("audio" | "video" | "image")[] = [];
    if (/\.(mp3|wav|m4a|aac|flac|opus)$/.test(path)) types.push("audio");
    if (/\.(ogg|webm)$/.test(path)) types.push("audio", "video");
    if (/\.(mp4|mov|m4v|ogv)$/.test(path)) types.push("video");
    if (/\.(png|jpe?g|gif|webp|avif)$/.test(path)) types.push("image");
    return [...new Set(types)];
  } catch { return []; }
}

export function Compose({ me, autoFocus = false, compact = false, onPosted }: { me: Profile; autoFocus?: boolean; compact?: boolean; onPosted?: () => void }) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<MediaDraft>(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaUrlType, setMediaUrlType] = useState<"audio" | "video">("video");
  const [busy, setBusy] = useState(false);
  const remaining = MAX - body.length;
  const canPost = (body.trim().length > 0 || Boolean(media)) && body.length <= MAX && !busy;

  async function chooseMedia(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const type = file.type.startsWith("audio/") ? "audio" : file.type.startsWith("video/") ? "video" : SUPPORTED_IMAGE_MIMES.has(file.type.toLowerCase()) ? "image" : null;
      if (!type) throw new Error("Escolha uma imagem, áudio ou vídeo compatível.");
      const url = await readFile(file, type === "audio" ? MAX_AUDIO : type === "video" ? MAX_VIDEO : MAX_IMAGE);
      let durationMs: number | null = null;
      if (type === "audio" || type === "video") {
        const element = document.createElement(type);
        element.preload = "metadata";
        durationMs = await new Promise<number | null>((resolve) => {
          let settled = false;
          const finish = (value: number | null) => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timer);
            element.removeAttribute("src");
            element.load();
            resolve(value);
          };
          const timer = window.setTimeout(() => finish(null), 2500);
          element.addEventListener("loadedmetadata", () => finish(Number.isFinite(element.duration) ? Math.round(element.duration * 1000) : null), { once: true });
          element.addEventListener("error", () => finish(null), { once: true });
          element.src = url;
        });
      }
      setMedia({ url, type, name: file.name, durationMs });
      setMediaUrl("");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Não foi possível carregar a mídia."); }
  }

  function applyUrl() {
    const value = mediaUrl.trim();
    if (!value) return;
    const types = identifyUrlTypes(value);
    if (!types.length) { toast.error("Não consegui identificar o tipo. Use uma URL direta de imagem, áudio ou vídeo."); return; }
    if (types.length > 1 && !types.includes(mediaUrlType)) { toast.error("Escolha se esta URL é áudio ou vídeo."); return; }
    const type = types.length === 1 ? types[0] : mediaUrlType;
    setMedia({ url: value, type, name: value, durationMs: null });
    setMediaUrl("");
  }

  async function submit() {
    if (!canPost) return;
    setBusy(true);
    try {
      await withAuthRetry(() => createPost({ data: { body: body.trim(), mediaUrl: media?.url ?? "", mediaType: media?.type ?? null, mediaAlt: media?.name ?? "", mediaDurationMs: media?.durationMs ?? null } }));
      setBody(""); setMedia(null); setMediaUrl("");
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      onPosted?.();
      toast.success("Publicação criada.");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Não foi possível publicar."); }
    finally { setBusy(false); }
  }

  return <div className={cn("flex min-w-0 gap-3", compact ? "py-0" : "border-b border-border px-4 py-4")}>
    {!compact ? <UserAvatar username={me.username} displayName={me.displayName} image={me.image} className="shrink-0" /> : null}
    <div className="min-w-0 flex-1">
      <Textarea value={body} onChange={(e) => setBody(e.target.value.slice(0, MAX))} placeholder="O que a noite guarda?" autoFocus={autoFocus} aria-label="Texto da publicação" className={cn("resize-none border-0 p-0 text-[17px] leading-relaxed focus-visible:ring-0", compact ? "min-h-[48px]" : "min-h-[80px]")} onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void submit(); }} />
      {media ? <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-secondary/30 p-3">
        <div className="flex min-w-0 items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-2 text-sm"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/15">{media.type === "audio" ? <Music2 className="size-4" /> : media.type === "video" ? <PlaySquare className="size-4" /> : <Image className="size-4" />}</span><span className="truncate" title={media.name}>{media.name}</span></div><button type="button" onClick={() => setMedia(null)} className="rounded-full p-2 text-muted hover:bg-secondary hover:text-fg" aria-label="Remover mídia"><X className="size-4" /></button></div>
        {media.type === "audio" ? <audio className="mt-3 block w-full" controls preload="metadata" src={media.url} /> : media.type === "video" ? <video className="mt-3 mx-auto block max-h-[55dvh] w-full rounded-xl bg-black object-contain" controls playsInline preload="metadata" src={media.url} /> : <img className="mt-3 mx-auto block max-h-72 w-full rounded-xl object-contain" src={media.url} alt="Pré-visualização da mídia" />}
      </div> : null}
      <div className="mt-3 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className={cn("shrink-0 text-xs tabular-nums", remaining < 40 ? "text-destructive" : "text-subtle")} aria-live="polite">{remaining}</span>
          <label className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-full border border-border px-3 text-xs text-muted hover:bg-secondary hover:text-fg"><Paperclip className="size-3.5" /> Mídia<input className="hidden" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif,audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/aac,audio/flac,audio/opus,audio/webm,video/mp4,video/webm,video/quicktime,video/ogg" onChange={(e) => void chooseMedia(e)} /></label>
          <div className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-lg sm:flex-row">
            <Input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyUrl(); } }} placeholder="URL direta de mídia" aria-label="URL de mídia" className="h-9 min-w-0 flex-1 text-xs" />
            {identifyUrlTypes(mediaUrl.trim()).length > 1 ? <select value={mediaUrlType} onChange={(e) => setMediaUrlType(e.target.value as "audio" | "video")} className="h-9 min-w-0 rounded-full border border-border bg-bg px-2 text-xs"><option value="video">Vídeo</option><option value="audio">Áudio</option></select> : null}
            <Button type="button" size="sm" variant="ghost" onClick={applyUrl} disabled={!mediaUrl.trim()} aria-label="Usar URL"><Link2 className="size-3.5" /><span>Usar</span></Button>
          </div>
        </div>
        <Button size="pill" type="button" onClick={() => void submit()} disabled={!canPost} className="w-full shrink-0 sm:w-auto">{busy ? "Publicando…" : "Publicar"}</Button>
      </div>
    </div>
  </div>;
}
