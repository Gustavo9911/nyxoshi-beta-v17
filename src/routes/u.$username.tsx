import { useEffect, useState, type CSSProperties } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Copy, Flag, MessageCircle, Share2, Shield, ShieldAlert, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { SignedShell } from "@/components/signed-shell";
import { PostCard } from "@/components/post-card";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { FeedSkeleton } from "@/components/feed";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useMe } from "@/hooks/use-me";
import { createReport, getProfileByUsername, getProfileLikes, getProfilePosts, getProfileReposts, sendMessage, toggleBlock, toggleFollow, toggleMute, toggleRestriction } from "@/lib/nyxoshi/server";
import { withAuthRetry } from "@/lib/auth/mutation";

export const Route = createFileRoute("/u/$username")({ component: ProfilePage });

const PROFILE_QUERY_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs = PROFILE_QUERY_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("O carregamento do perfil demorou demais. Tente novamente."));
    }, timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function ProfilePage() { return <SignedShell><ProfileInner /></SignedShell>; }

function ProfileInner() {
  const { username } = Route.useParams();
  const { me } = useMe();
  const queryClient = useQueryClient();
  const profile = useQuery({
    queryKey: ["profile", username],
    queryFn: () => withTimeout(getProfileByUsername({ data: username })),
    staleTime: 15_000,
    retry: 1,
    retryDelay: 500,
    refetchOnWindowFocus: false,
  });
  const [tab, setTab] = useState<"posts" | "reposts" | "likes">("posts");
  const posts = useQuery({
    queryKey: ["profile-posts", username],
    queryFn: () => withTimeout(getProfilePosts({ data: username })),
    enabled: tab === "posts",
    retry: 1,
    retryDelay: 500,
    refetchOnWindowFocus: false,
  });
  const reposts = useQuery({
    queryKey: ["profile-reposts", username],
    queryFn: () => withTimeout(getProfileReposts({ data: username })),
    enabled: tab === "reposts",
    retry: 1,
    retryDelay: 500,
    refetchOnWindowFocus: false,
  });
  const likes = useQuery({
    queryKey: ["profile-likes", username],
    queryFn: () => withTimeout(getProfileLikes({ data: username })),
    enabled: tab === "likes",
    retry: 1,
    retryDelay: 500,
    refetchOnWindowFocus: false,
  });
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [muted, setMuted] = useState(false);
  const [restricted, setRestricted] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageBody, setMessageBody] = useState("");
  const [introVisible, setIntroVisible] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const person = profile.data;

  useEffect(() => {
    if (!person?.profileIntroEnabled || person.profileIntro === "none") return;
    setIntroVisible(true);
    const timer = window.setTimeout(() => setIntroVisible(false), 1000);
    return () => window.clearTimeout(timer);
  }, [person?.userId, person?.profileIntro, person?.profileIntroEnabled]);

  if (profile.isLoading) return <FeedSkeleton />;
  if (profile.isError) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <p className="text-sm text-destructive">
          Não foi possível carregar este perfil. Tente novamente.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void profile.refetch()}
        >
          Tentar novamente
        </Button>
      </div>
    );
  }
  if (!person) return <p className="px-6 py-16 text-center text-sm text-muted">Este perfil não existe.</p>;

  const targetId = person.userId;
  const themeStyle = { "--profile-accent": person.accentColor } as CSSProperties;
  const backgroundStyle = person.backgroundId === "custom" && person.backgroundUrl ? { backgroundImage: `url(${person.backgroundUrl})` } : undefined;

  async function onFollow() {
    if (actionBusy) return;
    setActionBusy("follow");
    try { await withAuthRetry(() => toggleFollow({ data: targetId })); await queryClient.invalidateQueries({ queryKey: ["profile", username] }); await queryClient.invalidateQueries({ queryKey: ["suggestions"] }); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Não foi possível seguir."); }
    finally { setActionBusy(null); }
  }
  async function onBlock() {
    if (actionBusy) return;
    setActionBusy("block");
    try { const result = await withAuthRetry(() => toggleBlock({ data: targetId })); toast.success(result.blocked ? "Conta bloqueada." : "Conta desbloqueada."); await queryClient.invalidateQueries({ queryKey: ["profile", username] }); await queryClient.invalidateQueries({ queryKey: ["feed"] }); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Não foi possível bloquear."); }
    finally { setActionBusy(null); }
  }
  async function onMute() { if (actionBusy) return; setActionBusy("mute"); try { const result = await withAuthRetry(() => toggleMute({ data: targetId })); setMuted(result.muted); toast.success(result.muted ? "Conta silenciada." : "Conta não está mais silenciada."); } catch (err) { toast.error(err instanceof Error ? err.message : "Não foi possível silenciar."); } finally { setActionBusy(null); } }
  async function onRestrict() { if (actionBusy) return; setActionBusy("restrict"); try { const result = await withAuthRetry(() => toggleRestriction({ data: targetId })); setRestricted(result.restricted); toast.success(result.restricted ? "Conta restringida." : "Restrição removida."); } catch (err) { toast.error(err instanceof Error ? err.message : "Não foi possível restringir."); } finally { setActionBusy(null); } }
  async function copyId() { try { if (!navigator.clipboard) throw new Error("A cópia não está disponível neste navegador."); await navigator.clipboard.writeText(person.permanentId); toast.success("ID permanente copiado."); } catch (err) { toast.error(err instanceof Error ? err.message : "Não foi possível copiar o ID."); } }
  async function shareProfile() {
    const url = new URL(`/u/${person.username}`, window.location.origin).toString();
    try { if (navigator.share) await navigator.share({ title: `${person.displayName} (@${person.username})`, url }); else if (navigator.clipboard) { await navigator.clipboard.writeText(url); toast.success("Link do perfil copiado."); } else throw new Error("O compartilhamento não está disponível."); }
    catch (err) { if (err instanceof DOMException && err.name === "AbortError") return; toast.error(err instanceof Error ? err.message : "Não foi possível compartilhar."); }
  }
  async function onReport() {
    try { await withAuthRetry(() => createReport({ data: { targetUserId: targetId, reason } })); toast.success("Denúncia enviada."); setReportOpen(false); setReason(""); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Não foi possível denunciar."); }
  }
  async function sendProfileMessage() {
    const body = messageBody.trim();
    if (!body) return;
    try { const result = await withAuthRetry(() => sendMessage({ data: { recipientId: targetId, body } })); setMessageBody(""); setMessageOpen(false); toast.success(result.kind === "request" ? "Solicitação de mensagem enviada." : "Mensagem enviada."); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Não foi possível enviar a mensagem."); }
  }

  return (
    <div style={themeStyle} data-profile-theme={person.themeId} data-profile-effect={person.profileEffect} className="profile-theme min-w-0">
      {introVisible ? <div className={`profile-intro profile-intro-${person.profileIntro}`} aria-hidden="true"><div className="profile-intro-orb">☾</div><span>Nyxoshi</span></div> : null}

      <div className={`relative h-36 overflow-hidden profile-cover profile-background-${person.backgroundId}`} style={backgroundStyle}>
        {person.bannerUrl ? <img src={person.bannerUrl} alt="" className="absolute inset-0 size-full object-cover object-center" /> : <div className="absolute inset-0 starfield opacity-70" />}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30" aria-hidden="true" />
        {person.profileGifUrl ? <img src={person.profileGifUrl} alt="" className="absolute right-3 top-3 size-16 rounded-xl border border-white/10 object-cover opacity-90 shadow-lg sm:right-4 sm:top-4 sm:size-20" /> : null}
      </div>

      <div className="-mt-10 px-4">
        <UserAvatar username={person.username} displayName={person.displayName} image={person.image || person.profileGifUrl} toProfile={false} className="size-20 ring-4 ring-bg shadow-[0_0_35px_#a855f755]" />
        <div className="mt-3 min-w-0">
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2"><h1 className="min-w-0 break-words font-display text-2xl tracking-tight">{person.displayName}</h1>{person.role !== "user" ? <RoleBadge role={person.role} founderNumber={person.founderNumber} /> : null}</div>
              <div className="mt-1 flex min-w-0 items-start gap-2"><p className="min-w-0 break-all text-sm text-muted">@{person.username} <span className="text-subtle">· ID permanente {person.permanentId}</span></p><button type="button" onClick={() => void copyId()} className="mt-0.5 shrink-0 rounded p-1 text-subtle hover:bg-secondary hover:text-fg" title="Copiar ID permanente" aria-label="Copiar ID permanente"><Copy className="size-3.5" /></button></div>
            </div>

            <div className="profile-actions w-full min-w-0 lg:w-auto">
              <div className="profile-primary-actions grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {person.isSelf ? <Button asChild variant="outline" size="sm" className="w-full sm:w-auto"><Link to="/settings">Editar perfil</Link></Button> : null}
                <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => void shareProfile()}><Share2 className="size-4" /><span>Compartilhar</span></Button>
                {!person.isSelf ? <Button size="sm" className="w-full sm:w-auto" variant={person.isFollowing ? "outline" : "default"} onClick={() => void onFollow()} disabled={actionBusy !== null}>{actionBusy === "follow" ? "Aguarde…" : person.isFollowing ? "Seguindo" : "Seguir"}</Button> : null}
              </div>
              {!person.isSelf ? <div className="profile-icon-actions mt-2 grid grid-cols-5 gap-1.5">
                <Button size="icon" variant="ghost" className="w-full" disabled={actionBusy !== null} onClick={() => void onBlock()} title={person.isBlocked ? "Desbloquear" : "Bloquear"} aria-label={person.isBlocked ? "Desbloquear" : "Bloquear"}><Ban className="size-4" /></Button>
                <Button size="icon" variant={muted ? "secondary" : "ghost"} className="w-full" disabled={actionBusy !== null} onClick={() => void onMute()} title={muted ? "Remover silêncio" : "Silenciar"} aria-label={muted ? "Remover silêncio" : "Silenciar"}><VolumeX className="size-4" /></Button>
                <Button size="icon" variant={restricted ? "secondary" : "ghost"} className="w-full" disabled={actionBusy !== null} onClick={() => void onRestrict()} title={restricted ? "Remover restrição" : "Restringir"} aria-label={restricted ? "Remover restrição" : "Restringir"}><ShieldAlert className="size-4" /></Button>
                <Button type="button" size="icon" variant="ghost" className="w-full" onClick={() => setMessageOpen(true)} title="Mensagem" aria-label="Mensagem"><MessageCircle className="size-4" /></Button>
                <Button type="button" size="icon" variant="ghost" className="w-full" onClick={() => setReportOpen(true)} title="Denunciar" aria-label="Denunciar"><Flag className="size-4" /></Button>
              </div> : null}
            </div>
          </div>

          {person.websiteUrl ? <a href={person.websiteUrl} target="_blank" rel="noreferrer noopener" className="mt-2 block break-all text-sm text-fuchsia-300 hover:underline" style={{ color: "var(--profile-accent)" }}>{person.websiteUrl}</a> : null}
          {person.bio ? <p className="mt-3 max-w-prose break-words text-sm leading-relaxed">{person.bio}</p> : null}
          <p className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm"><span><strong className="tabular-nums text-fg">{person.following}</strong> <span className="text-muted">seguindo</span></span><span><strong className="tabular-nums text-fg">{person.followers}</strong> <span className="text-muted">seguidores</span></span><span><strong className="tabular-nums text-fg">{person.posts}</strong> <span className="text-muted">publicações</span></span></p>
        </div>
      </div>

      <div className="mt-6 border-y border-border bg-[#0b0712]">
        <div className="grid grid-cols-3 text-center text-xs">
          {([['posts', 'Publicações'], ['reposts', 'Reposts'], ['likes', 'Curtidas']] as const).map(([key, label]) => <button key={key} type="button" onClick={() => setTab(key)} className={tab === key ? "min-w-0 border-b-2 border-fuchsia-400 px-2 py-3 font-medium text-fuchsia-200" : "min-w-0 px-2 py-3 text-muted hover:bg-secondary/40 hover:text-fg"}>{label}</button>)}
        </div>
        {(() => {
          const query = tab === "posts" ? posts : tab === "reposts" ? reposts : likes;
          if (query.isLoading) return <FeedSkeleton />;
          if (query.isError) return <p className="px-6 py-12 text-center text-sm text-destructive">Não foi possível carregar estas publicações.</p>;
          const data = query.data;
          return data && data.length > 0 ? data.map((post) => <PostCard key={post.id} post={post} viewerId={me?.userId ?? null} />) : <p className="px-6 py-12 text-center text-sm text-muted">{person.isSelf ? "Você ainda não publicou nada." : "Nenhuma publicação ainda."}</p>;
        })()}
      </div>

      <Dialog open={messageOpen} onOpenChange={setMessageOpen}><DialogContent><DialogHeader><DialogTitle>Enviar mensagem para {person.displayName}</DialogTitle><DialogDescription>Se ainda não existe uma conversa, sua mensagem será enviada como solicitação.</DialogDescription></DialogHeader><Textarea value={messageBody} onChange={(e) => setMessageBody(e.target.value.slice(0, 2000))} maxLength={2000} placeholder="Escreva sua mensagem..." /><Button onClick={() => void sendProfileMessage()} disabled={!messageBody.trim()} className="w-full sm:w-auto">Enviar</Button></DialogContent></Dialog>
      <Dialog open={reportOpen} onOpenChange={setReportOpen}><DialogContent><DialogHeader><DialogTitle>Denunciar conta</DialogTitle><DialogDescription>Descreva o motivo. Isso não é público.</DialogDescription></DialogHeader><Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={400} placeholder="Descreva o motivo" /><Button onClick={() => void onReport()} disabled={reason.trim().length < 8} className="w-full sm:w-auto">Enviar</Button></DialogContent></Dialog>
    </div>
  );
}

function RoleBadge({ role, founderNumber }: { role: string; founderNumber: number | null }) {
  const label = role === "founder" ? `Fundador ${founderNumber ?? ""}`.trim() : role === "angel_girl" ? "Angel Girl" : role === "supreme_archmage" ? "Supremo Arquimago" : role === "sub_founder" ? "Sub Fundador / Vice Fundador" : role === "hardware_scientist" ? "Maluco Cientista de Hardware com Farofa" : role.replaceAll("_", " ");
  const compact = role === "founder" ? `F${founderNumber ?? ""}` : role === "angel_girl" ? "🪽 Mika" : role === "supreme_archmage" ? "◈" : role === "sub_founder" ? "SF" : role === "hardware_scientist" ? "🧪" : role;
  return <span title={label} className="role-badge inline-flex max-w-[55vw] items-center gap-1 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-2 py-1 text-xs text-fuchsia-200"><Shield className="size-3.5 shrink-0" /><span className="truncate">{compact}</span></span>;
}
