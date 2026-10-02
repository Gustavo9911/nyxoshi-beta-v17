import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bookmark, Copy, Flag, Heart, MessageCircle, MoreHorizontal, Music2, Quote, Repeat2, Share2, Shield, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { relativeTime } from "@/lib/nyxoshi/time";
import type { PostCard as PostCardType } from "@/lib/nyxoshi/types";
import { createQuote, createReport, deletePost, toggleBookmark, toggleLike, toggleReaction, toggleRepost } from "@/lib/nyxoshi/server";
import { withAuthRetry } from "@/lib/auth/mutation";
import { cn } from "@/lib/utils";

function RoleBadge({ role, founderNumber }: { role?: string; founderNumber?: number | null }) {
  if (!role || role === "user") return null;
  const label = role === "founder" ? `Fundador ${founderNumber ?? ""}`.trim() : role === "angel_girl" ? "Angel Girl" : role === "supreme_archmage" ? "Supremo Arquimago" : role === "sub_founder" ? "Sub Fundador" : role === "hardware_scientist" ? "Maluco Cientista de Hardware com Farofa" : role.replaceAll("_", " ");
  const compact = role === "founder" ? `F${founderNumber ?? ""}` : role === "angel_girl" ? "🪽 Mika" : role === "supreme_archmage" ? "◈" : role === "sub_founder" ? "SF" : role === "hardware_scientist" ? "🧪" : role;
  return <span title={label} className="role-badge inline-flex max-w-[45vw] items-center gap-1 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-1.5 py-0.5 text-[10px] text-fuchsia-200"><Shield className="size-3 shrink-0" /><span className="truncate">{compact}</span></span>;
}

function MediaBlock({ post }: { post: PostCardType }) {
  const [mediaError, setMediaError] = useState(false);
  useEffect(() => setMediaError(false), [post.mediaUrl]);
  if (!post.mediaUrl || mediaError) {
    if (!post.mediaUrl) return null;
    return <div className="mt-3 rounded-2xl border border-border bg-secondary/30 p-4 text-sm text-muted">Não foi possível carregar esta mídia.</div>;
  }

  return (
    <div className="nyx-media-player mt-3 overflow-hidden rounded-2xl border border-border bg-black/30">
      {post.mediaType === "audio" ? (
        <div className="p-3 sm:p-4">
          <div className="mb-3 flex min-w-0 items-center gap-2 text-xs text-muted">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-fuchsia-200"><Music2 className="size-4" /></span>
            <span className="min-w-0 truncate">Áudio original de @{post.author.username}</span>
          </div>
          <audio controls preload="metadata" className="block w-full max-w-full" src={post.mediaUrl} onError={() => setMediaError(true)} />
        </div>
      ) : post.mediaType === "video" ? (
        <div>
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted"><Video className="size-4" /> Vídeo</div>
          <video
            controls
            playsInline
            preload="metadata"
            poster={post.mediaThumbnailUrl ?? undefined}
            className="mx-auto block max-h-[72dvh] w-full bg-black object-contain"
            src={post.mediaUrl}
            onError={() => setMediaError(true)}
          />
        </div>
      ) : (
        <img src={post.mediaUrl} alt={post.mediaAlt || "Imagem da publicação"} loading="lazy" decoding="async" className="mx-auto block max-h-[72dvh] w-full object-contain" onError={() => setMediaError(true)} />
      )}
    </div>
  );
}

export function PostCard({ post, viewerId, onChanged }: { post: PostCardType; viewerId: string | null; onChanged?: () => void }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isMine = viewerId === post.author.userId;
  const [liked, setLiked] = useState(post.likedByMe);
  const [likes, setLikes] = useState(post.likeCount);
  const [reposted, setReposted] = useState(post.repostedByMe);
  const [reposts, setReposts] = useState(post.repostCount);
  const [bookmarked, setBookmarked] = useState(post.bookmarkedByMe);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteBody, setQuoteBody] = useState("");

  useEffect(() => { setLiked(post.likedByMe); setLikes(post.likeCount); setReposted(post.repostedByMe); setReposts(post.repostCount); setBookmarked(post.bookmarkedByMe); }, [post.id, post.likedByMe, post.likeCount, post.repostedByMe, post.repostCount, post.bookmarkedByMe]);

  function requireViewer() {
    if (viewerId) return true;
    navigate({ to: "/login" });
    return false;
  }

  async function onLike() {
    if (!requireViewer()) return;
    const next = !liked;
    setLiked(next); setLikes((n) => Math.max(0, n + (next ? 1 : -1)));
    try { const result = await withAuthRetry(() => toggleLike({ data: post.id })); setLiked(result.liked); void queryClient.invalidateQueries({ queryKey: ["feed"] }); onChanged?.(); }
    catch (err) { setLiked(!next); setLikes((n) => Math.max(0, n + (next ? -1 : 1))); toast.error(err instanceof Error ? err.message : "Não foi possível curtir."); }
  }

  async function onRepost() {
    if (!requireViewer()) return;
    const next = !reposted;
    setReposted(next); setReposts((n) => Math.max(0, n + (next ? 1 : -1)));
    try { const result = await withAuthRetry(() => toggleRepost({ data: post.id })); setReposted(result.reposted); void queryClient.invalidateQueries({ queryKey: ["feed"] }); onChanged?.(); }
    catch (err) { setReposted(!next); setReposts((n) => Math.max(0, n + (next ? -1 : 1))); toast.error(err instanceof Error ? err.message : "Não foi possível repostar."); }
  }

  async function onBookmark() {
    if (!requireViewer()) return;
    const next = !bookmarked; setBookmarked(next);
    try { const result = await withAuthRetry(() => toggleBookmark({ data: post.id })); setBookmarked(result.bookmarked); toast.success(result.bookmarked ? "Salvo nos seus favoritos." : "Removido dos seus favoritos."); }
    catch (err) { setBookmarked(!next); toast.error(err instanceof Error ? err.message : "Não foi possível salvar."); }
  }

  async function onQuote() {
    if (!requireViewer()) return;
    const body = quoteBody.trim(); if (!body) return;
    setBusy(true);
    try { await withAuthRetry(() => createQuote({ data: { postId: post.id, body } })); setQuoteBody(""); setQuoteOpen(false); toast.success("Citação publicada."); void queryClient.invalidateQueries({ queryKey: ["feed"] }); onChanged?.(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Não foi possível citar."); }
    finally { setBusy(false); }
  }

  async function copyPostId() {
    try { if (!navigator.clipboard) throw new Error("A cópia não está disponível neste navegador."); await navigator.clipboard.writeText(post.id); toast.success("ID da publicação copiado."); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Não foi possível copiar o ID."); }
  }

  async function sharePost() {
    const url = new URL(`/post/${post.id}`, window.location.origin).toString();
    try {
      if (navigator.share) await navigator.share({ title: `${post.author.displayName} no Nyxoshi`, text: post.body || "Confira esta publicação no Nyxoshi.", url });
      else if (navigator.clipboard) { await navigator.clipboard.writeText(url); toast.success("Link copiado."); }
      else throw new Error("O compartilhamento não está disponível neste navegador.");
    } catch (err) { if (err instanceof DOMException && err.name === "AbortError") return; toast.error(err instanceof Error ? err.message : "Não foi possível compartilhar."); }
  }

  async function onDelete() {
    setBusy(true);
    try { await withAuthRetry(() => deletePost({ data: post.id })); toast.success("Publicação apagada."); void queryClient.invalidateQueries({ queryKey: ["feed"] }); onChanged?.(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Não foi possível apagar."); }
    finally { setBusy(false); }
  }

  async function onReport() {
    setBusy(true);
    try { await withAuthRetry(() => createReport({ data: { targetPostId: post.id, reason } })); toast.success("Denúncia enviada."); setReportOpen(false); setReason(""); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Não foi possível denunciar."); }
    finally { setBusy(false); }
  }

  async function onReaction() {
    if (!requireViewer()) return;
    try { await withAuthRetry(() => toggleReaction({ data: { id: post.id, reaction: "like" } })); void queryClient.invalidateQueries({ queryKey: ["feed"] }); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Não foi possível reagir."); }
  }

  return (
    <article className="min-w-0 border-b border-border px-4 py-4 transition-colors hover:bg-fuchsia-500/[.018]">
      <div className="flex min-w-0 gap-3">
        <UserAvatar username={post.author.username} displayName={post.author.displayName} image={post.author.image} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <Link to="/u/$username" params={{ username: post.author.username }} className="block max-w-full truncate font-medium text-fg hover:underline">{post.author.displayName}</Link>
              <div className="flex min-w-0 items-center gap-2"><p className="min-w-0 truncate text-sm text-muted">@{post.author.username}<span className="text-subtle"> · {relativeTime(post.createdAt)}</span></p><RoleBadge role={post.author.role} founderNumber={post.author.founderNumber} /></div>
            </div>
            {viewerId ? <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-9 shrink-0 text-muted"><MoreHorizontal /><span className="sr-only">Mais</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{isMine ? <DropdownMenuItem disabled={busy} onSelect={() => void onDelete()}><Trash2 className="size-4" />Apagar</DropdownMenuItem> : <DropdownMenuItem onSelect={() => setReportOpen(true)}><Flag className="size-4" />Denunciar</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu> : null}
          </div>

          {post.body ? <Link to="/post/$postId" params={{ postId: post.id }} className="mt-2 block whitespace-pre-wrap break-words text-[15px] leading-relaxed text-fg">{post.body}</Link> : null}
          <MediaBlock post={post} />
          {post.quotedPost ? <Link to="/post/$postId" params={{ postId: post.quotedPost.id }} className="mt-3 block min-w-0 rounded-2xl border border-border bg-secondary/40 p-3 hover:bg-secondary/60"><div className="flex min-w-0 items-center gap-2 text-xs"><strong className="truncate">{post.quotedPost.author.displayName}</strong><span className="shrink-0 text-muted">@{post.quotedPost.author.username}</span><RoleBadge role={post.quotedPost.author.role} founderNumber={post.quotedPost.author.founderNumber} /></div><p className="mt-2 whitespace-pre-wrap break-words text-sm text-fg">{post.quotedPost.body}</p></Link> : null}

          <div className="mt-3 flex min-w-0 flex-wrap items-center gap-0.5 sm:gap-1">
            <ActionButton active={liked} label={`${likes} curtidas`} onClick={() => void onLike()}><Heart className={cn("size-4", liked && "fill-current")} /><span>{likes}</span></ActionButton>
            <ActionButton active={reposted} label={`${reposts} reposts`} onClick={() => void onRepost()}><Repeat2 className="size-4" /><span>{reposts}</span></ActionButton>
            <ActionButton label={`${post.quoteCount} citações`} onClick={() => { if (!requireViewer()) return; setQuoteOpen(true); }}><Quote className="size-4" /><span>{post.quoteCount}</span></ActionButton>
            <ActionButton active={bookmarked} label={bookmarked ? "Remover dos favoritos" : "Salvar nos favoritos"} onClick={() => void onBookmark()}><Bookmark className={cn("size-4", bookmarked && "fill-current")} /></ActionButton>
            <ActionButton label="Copiar ID" onClick={() => void copyPostId()}><Copy className="size-4" /></ActionButton>
            <ActionButton label="Compartilhar" onClick={() => void sharePost()}><Share2 className="size-4" /></ActionButton>
            <ActionButton label="Reagir" onClick={() => void onReaction()}>✨</ActionButton>
            <Link to="/post/$postId" params={{ postId: post.id }} aria-label={`${post.commentCount} comentários`} className="inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-full px-2 text-sm text-muted hover:bg-secondary hover:text-fg"><MessageCircle className="size-4" /><span className="tabular-nums">{post.commentCount}</span></Link>
          </div>
        </div>
      </div>

      <Dialog open={quoteOpen} onOpenChange={setQuoteOpen}><DialogContent><DialogHeader><DialogTitle>Citar publicação</DialogTitle><DialogDescription>Adicione seu comentário e publique uma citação.</DialogDescription></DialogHeader><Textarea value={quoteBody} onChange={(e) => setQuoteBody(e.target.value.slice(0, 500))} placeholder="O que você acha?" /><Button onClick={() => void onQuote()} disabled={busy || !quoteBody.trim()} className="w-full sm:w-auto">{busy ? "Publicando…" : "Publicar citação"}</Button></DialogContent></Dialog>
      <Dialog open={reportOpen} onOpenChange={setReportOpen}><DialogContent><DialogHeader><DialogTitle>Denunciar publicação</DialogTitle><DialogDescription>Conte o que está errado. A equipe avalia cada relato.</DialogDescription></DialogHeader><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Descreva o motivo" maxLength={400} /><Button onClick={() => void onReport()} disabled={busy || reason.trim().length < 8} className="w-full sm:w-auto">{busy ? "Enviando…" : "Enviar denúncia"}</Button></DialogContent></Dialog>
    </article>
  );
}

function ActionButton({ children, onClick, active = false, label }: { children: ReactNode; onClick: () => void; active?: boolean; label: string }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className={cn("inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-full px-2 text-sm transition-colors hover:bg-secondary", active ? "text-fuchsia-300" : "text-muted hover:text-fg")}>{children}</button>;
}
