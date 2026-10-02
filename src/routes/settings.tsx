import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RotateCcw, Sparkles } from "lucide-react";
import { SignedShell } from "@/components/signed-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getMyPreferences, updateMyPreferences, updateMyProfile } from "@/lib/nyxoshi/server";
import { withAuthRetry } from "@/lib/auth/mutation";
import { useMe } from "@/hooks/use-me";
import { signOut } from "@/lib/auth/client";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

const THEMES = [
  ["nyxoshi", "Nyxoshi", "Roxo-noite original", "#c084fc"],
  ["amethyst", "Ametista", "Violeta celestial", "#d8b4fe"],
  ["midnight", "Meia-noite", "Preto azulado", "#93c5fd"],
  ["ocean", "Oceano lunar", "Azul profundo", "#67e8f9"],
  ["rose", "Rosa eclipse", "Rosa escuro", "#f9a8d4"],
] as const;
const BACKGROUNDS = [["stars", "Campo de estrelas"], ["nebula", "Nebulosa"], ["midnight", "Meia-noite"], ["aurora", "Aurora"], ["custom", "Imagem personalizada"]] as const;
const EFFECTS = [["none", "Nenhum"], ["glow", "Brilho lunar"], ["shimmer", "Cintilação"], ["float", "Flutuação"]] as const;
const INTROS = [["moonrise", "Nascer da lua"], ["fade", "Aparecer suave"], ["stars", "Estrelas"], ["none", "Sem introdução"]] as const;

const DEFAULT_PREFS = { likes: true, comments: true, follows: true, messages: true, reposts: true, mentions: true, quotes: true, reactions: true, discoverable: true, message_policy: "requests", mention_policy: "everyone" };

async function fileToDataUrl(file: File, allowed: string, maxBytes: number): Promise<string> {
  if (!new RegExp(`^(${allowed})$`, "i").test(file.type)) throw new Error("Tipo de arquivo não permitido.");
  if (file.size > maxBytes) throw new Error(`O arquivo deve ter no máximo ${maxBytes >= 1024 * 1024 ? `${maxBytes / 1024 / 1024} MB` : `${Math.round(maxBytes / 1024)} KB`}.`);
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Não foi possível ler o arquivo.")); reader.readAsDataURL(file); });
}

async function pickImage(setter: (value: string) => void, event: ChangeEvent<HTMLInputElement>, maxBytes = 1 * 1024 * 1024) {
  const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
  try { setter(await fileToDataUrl(file, "image/(png|jpeg|webp|gif)", maxBytes)); toast.success("Imagem carregada. Salve o perfil para aplicar."); }
  catch (err) { toast.error(err instanceof Error ? err.message : "Não foi possível carregar a imagem."); }
}

function SettingsPage() { return <SignedShell><SettingsInner /></SignedShell>; }

function SettingsInner() {
  const { me } = useMe();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState(""); const [username, setUsername] = useState(""); const [bio, setBio] = useState("");
  const [image, setImage] = useState(""); const [bannerUrl, setBannerUrl] = useState(""); const [profileGifUrl, setProfileGifUrl] = useState(""); const [websiteUrl, setWebsiteUrl] = useState("");
  const [themeId, setThemeId] = useState("nyxoshi"); const [backgroundId, setBackgroundId] = useState("stars"); const [backgroundUrl, setBackgroundUrl] = useState(""); const [profileEffect, setProfileEffect] = useState("glow"); const [profileIntro, setProfileIntro] = useState("moonrise"); const [profileIntroEnabled, setProfileIntroEnabled] = useState(true); const [accentColor, setAccentColor] = useState("#c084fc");
  const [busy, setBusy] = useState(false);
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);

  useEffect(() => {
    if (!me) return;
    setDisplayName(me.displayName); setUsername(me.username); setBio(me.bio); setImage(me.image ?? ""); setBannerUrl(me.bannerUrl ?? ""); setProfileGifUrl(me.profileGifUrl ?? ""); setWebsiteUrl(me.websiteUrl ?? "");
    setThemeId(me.themeId ?? "nyxoshi"); setBackgroundId(me.backgroundId ?? "stars"); setBackgroundUrl(me.backgroundUrl ?? ""); setProfileEffect(me.profileEffect ?? "glow"); setProfileIntro(me.profileIntro ?? "moonrise"); setProfileIntroEnabled(me.profileIntroEnabled ?? true); setAccentColor(me.accentColor ?? "#c084fc");
    void withAuthRetry(() => getMyPreferences()).then((value) => setPrefs({ ...DEFAULT_PREFS, ...value.notifications, ...value.privacy })).catch((err) => toast.error(err instanceof Error ? err.message : "Não foi possível carregar suas preferências."));
  }, [me]);

  const selectedTheme = THEMES.find(([id]) => id === themeId) ?? THEMES[0];
  const previewStyle = useMemo(() => ({ "--profile-accent": accentColor, "--preview-accent": selectedTheme[3] } as CSSProperties), [accentColor, selectedTheme]);

  if (!me) return null;

  function resetV15() { setThemeId("nyxoshi"); setBackgroundId("stars"); setBackgroundUrl(""); setProfileEffect("glow"); setProfileIntro("moonrise"); setProfileIntroEnabled(true); setAccentColor("#c084fc"); toast.success("Personalização restaurada ao padrão."); }

  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      const original = { image: me.image ?? "", bannerUrl: me.bannerUrl ?? "", profileGifUrl: me.profileGifUrl ?? "", backgroundUrl: me.backgroundUrl ?? "" };
      const media = {
        image: image === original.image ? undefined : image,
        bannerUrl: bannerUrl === original.bannerUrl ? undefined : bannerUrl,
        profileGifUrl: profileGifUrl === original.profileGifUrl ? undefined : profileGifUrl,
        backgroundUrl: backgroundUrl === original.backgroundUrl ? undefined : backgroundUrl,
      };
      await withAuthRetry(() => updateMyProfile({ data: { displayName, username, bio, ...media, websiteUrl, themeId, backgroundId, profileEffect, profileIntro, profileIntroEnabled, accentColor } }));
      await withAuthRetry(() => updateMyPreferences({ data: { notifications: { likes: prefs.likes, comments: prefs.comments, follows: prefs.follows, messages: prefs.messages, reposts: prefs.reposts, mentions: prefs.mentions, quotes: prefs.quotes, reactions: prefs.reactions }, privacy: { discoverable: prefs.discoverable, message_policy: prefs.message_policy, mention_policy: prefs.mention_policy } } }));
      await queryClient.invalidateQueries({ queryKey: ["me"] }); await queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Perfil e personalização atualizados.");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Não foi possível salvar."); }
    finally { setBusy(false); }
  }

  async function logout() { try { await signOut("/"); } catch (err) { toast.error(err instanceof Error ? err.message : "Não foi possível sair."); } }

  return <div className="min-w-0">
    <header className="sticky top-0 z-20 border-b border-border bg-bg/90 px-4 py-3 backdrop-blur-xl"><div className="flex items-center justify-between gap-3"><h1 className="font-display text-xl tracking-tight">Configurações</h1><span className="text-xs text-muted">V15 · perfil</span></div></header>
    <form onSubmit={(event) => void save(event)} className="space-y-8 px-4 py-6 pb-32">
      <section><h2 className="font-display text-lg">Perfil</h2><p className="mt-1 text-sm text-muted">Nome, @, bio e identidade pública.</p><div className="mt-4 space-y-4"><Field label="Nome"><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} required /></Field><Field label="Usuário"><div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">@</span><Input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} className="pl-7" maxLength={20} required /></div></Field><Field label="Bio"><Textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 160))} maxLength={160} placeholder="Uma linha sobre você" /><p className="text-right text-xs text-subtle">{bio.length}/160</p></Field></div></section>

      <section className="space-y-4"><div><h2 className="font-display text-lg">V15 · Personalização</h2><p className="mt-1 text-sm text-muted">Temas, fundos, efeitos, cor de destaque e introdução do perfil.</p></div>
        <div className="grid gap-3 sm:grid-cols-2">{THEMES.map(([id, name, description, color]) => <button key={id} type="button" onClick={() => { setThemeId(id); if (!accentColor || accentColor === selectedTheme[3]) setAccentColor(color); }} className={`theme-choice ${themeId === id ? "theme-choice-active" : ""}`}><span className="size-8 shrink-0 rounded-full border border-white/10" style={{ background: `linear-gradient(135deg, ${color}, #111)` }} /><span className="min-w-0 text-left"><strong className="block text-sm">{name}</strong><span className="block truncate text-xs text-muted">{description}</span></span></button>)}</div>
        <div className="grid gap-3 sm:grid-cols-2"><SelectField label="Fundo" value={backgroundId} onChange={setBackgroundId} options={BACKGROUNDS} /><SelectField label="Efeito" value={profileEffect} onChange={setProfileEffect} options={EFFECTS} /><SelectField label="Introdução" value={profileIntro} onChange={setProfileIntro} options={INTROS} /><Field label="Cor de destaque"><div className="flex gap-2"><input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="size-11 shrink-0 cursor-pointer rounded-lg border border-input bg-bg p-1" aria-label="Escolher cor de destaque" /><Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} placeholder="#c084fc" pattern="^#[0-9a-fA-F]{6}$" /></div></Field></div>
        <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm"><span><strong className="block">Introdução do perfil</strong><span className="text-xs text-muted">Mostra a animação quando o perfil é aberto.</span></span><input type="checkbox" checked={profileIntroEnabled} onChange={(e) => setProfileIntroEnabled(e.target.checked)} /></label>
        {backgroundId === "custom" ? <MediaField label="Fundo personalizado" value={backgroundUrl} setValue={setBackgroundUrl} accept="image/png,image/jpeg,image/webp,image/gif" tall /> : null}
        <div className="rounded-2xl border border-border bg-[#0b0712] p-4" style={previewStyle}><p className="text-xs font-medium text-muted">Pré-visualização</p><div className={`mt-3 profile-preview profile-background-${backgroundId} ${profileEffect}`} style={backgroundId === "custom" && backgroundUrl ? { backgroundImage: `url(${backgroundUrl})` } : undefined}><div className="flex items-center gap-3"><div className="grid size-12 shrink-0 place-items-center rounded-full bg-black/30 text-lg shadow-[0_0_30px_var(--profile-accent)]">☾</div><div className="min-w-0"><p className="truncate font-display text-lg">{displayName || "Seu nome"}</p><p className="truncate text-xs text-white/65">@{username || "seu_usuario"}</p></div></div><p className="mt-4 line-clamp-2 text-sm text-white/85">{bio || "Sua bio aparecerá aqui."}</p><span className="mt-4 inline-flex rounded-full border border-white/15 bg-black/20 px-2.5 py-1 text-[11px] text-white/80">{selectedTheme[1]} · {profileEffect === "none" ? "Sem efeito" : EFFECTS.find(([id]) => id === profileEffect)?.[1]}</span></div></div>
        <Button type="button" variant="ghost" onClick={resetV15}><RotateCcw className="size-4" />Restaurar V15</Button>
      </section>

      <section><h2 className="font-display text-lg">V15 · Mídia do perfil</h2><p className="mt-1 text-sm text-muted">Fotos, banner, GIF e link público.</p><div className="mt-4 space-y-5"><MediaField label="Foto de perfil" value={image} setValue={setImage} accept="image/png,image/jpeg,image/webp,image/gif" /><MediaField label="Banner" value={bannerUrl} setValue={setBannerUrl} accept="image/png,image/jpeg,image/webp,image/gif" tall /><MediaField label="GIF do perfil" value={profileGifUrl} setValue={setProfileGifUrl} accept="image/gif,image/webp" /><Field label="Site/link"><Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} type="url" placeholder="https://..." /></Field></div></section>

      <section><h2 className="font-display text-lg">Privacidade e notificações</h2><div className="mt-4 space-y-3 text-sm"><Link className="block rounded-xl border border-border p-3 hover:bg-secondary" to="/messages">Mensagens e solicitações →</Link><div className="grid gap-2 sm:grid-cols-2">{(["likes", "comments", "follows", "messages", "reposts", "mentions", "quotes", "reactions"] as const).map((key) => <label key={key} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border p-3"><span>{({ likes: "Curtidas", comments: "Comentários", follows: "Novos seguidores", messages: "Mensagens", reposts: "Reposts", mentions: "Menções", quotes: "Citações", reactions: "Reações" } as Record<string, string>)[key]}</span><input type="checkbox" checked={Boolean(prefs[key])} onChange={(e) => setPrefs((value) => ({ ...value, [key]: e.target.checked }))} /></label>)}</div><div className="grid gap-3 sm:grid-cols-2"><label className="min-w-0 rounded-xl border border-border p-3"><span className="block font-medium">Quem pode iniciar mensagens</span><select value={prefs.message_policy} onChange={(e) => setPrefs((v) => ({ ...v, message_policy: e.target.value }))} className="mt-2 h-10 w-full min-w-0 rounded-lg border border-input bg-bg px-3 text-sm"><option value="everyone">Todos</option><option value="requests">Solicitações</option><option value="nobody">Ninguém</option></select></label><label className="min-w-0 rounded-xl border border-border p-3"><span className="block font-medium">Quem pode mencionar você</span><select value={prefs.mention_policy} onChange={(e) => setPrefs((v) => ({ ...v, mention_policy: e.target.value }))} className="mt-2 h-10 w-full min-w-0 rounded-lg border border-input bg-bg px-3 text-sm"><option value="everyone">Todos</option><option value="followers">Seguidores</option><option value="nobody">Ninguém</option></select></label></div><label className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border p-3"><span>Permitir descoberta do perfil</span><input type="checkbox" checked={prefs.discoverable} onChange={(e) => setPrefs((v) => ({ ...v, discoverable: e.target.checked }))} /></label></div></section>

      <section className="rounded-2xl border border-border p-4"><div className="flex min-w-0 items-start gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-fuchsia-200"><Sparkles className="size-5" /></div><div className="min-w-0"><p className="text-sm font-medium">Seu cargo</p><p className="mt-1 break-words text-sm text-muted">{me.role === "founder" ? `Fundadora${me.founderNumber ? ` #${me.founderNumber}` : ""}` : me.role === "angel_girl" ? "Angel Girl" : me.role === "supreme_archmage" ? "Supremo Arquimago" : me.role === "sub_founder" ? "Sub Fundador / Vice Fundador" : me.role === "hardware_scientist" ? "Maluco Cientista de Hardware com Farofa" : me.role.replaceAll("_", " ")}</p><p className="mt-2 break-all font-mono text-[11px] text-fuchsia-200/80">ID permanente: {me.permanentId}</p>{["founder", "sub_founder", "supreme_archmage", "angel_girl"].includes(me.role) ? <Link to="/founders" className="mt-3 inline-block text-sm text-fuchsia-300">Abrir painel dos fundadores →</Link> : null}</div></div></section>

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 -mx-4 border-t border-border bg-[#09060df2] p-3 backdrop-blur-xl md:static md:m-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none"><div className="flex flex-col gap-2 sm:flex-row"><Button type="submit" disabled={busy} className="w-full sm:w-auto">{busy ? "Salvando…" : "Salvar alterações"}</Button><Button type="button" variant="outline" onClick={() => void logout()} className="w-full sm:w-auto">Sair da conta</Button></div></div>
    </form>
  </div>;
}

function MediaField({ label, value, setValue, accept, tall = false }: { label: string; value: string; setValue: (value: string) => void; accept: string; tall?: boolean }) {
  const isStoredMedia = value.startsWith("/api/profile-media/");
  const isInlineMedia = value.startsWith("data:");
  return <div className="space-y-2">
    <Label>{label}</Label>
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
      {isStoredMedia || isInlineMedia ? (
        <div className="flex min-h-11 min-w-0 flex-1 items-center rounded-md border border-input bg-secondary/30 px-3 text-sm text-muted">{isStoredMedia ? "Arquivo atual salvo no Nyxoshi" : "Arquivo novo selecionado"}</div>
      ) : (
        <Input value={value} onChange={(e) => setValue(e.target.value)} className="min-w-0 flex-1" type="url" inputMode="url" autoComplete="url" placeholder="https://..." />
      )}
      <label className="inline-flex h-11 w-full shrink-0 cursor-pointer items-center justify-center rounded-md border border-input px-3 text-sm hover:bg-secondary sm:w-auto">
        <span>Enviar arquivo</span>
        <input className="hidden" type="file" accept={accept} onChange={(e) => void pickImage(setValue, e)} />
      </label>
      {value ? <Button type="button" variant="ghost" onClick={() => setValue("")} className="w-full shrink-0 sm:w-auto">Remover</Button> : null}
    </div>
    {value ? <div className={`overflow-hidden rounded-xl border border-border bg-bg ${tall ? "aspect-[3/1]" : "size-24"}`}><img src={value} alt="Pré-visualização" loading="lazy" decoding="async" className="size-full object-cover" /></div> : null}
    <p className="text-xs text-subtle">Você pode usar uma URL HTTPS direta ou um arquivo local. O arquivo atual não é reenviado ao salvar sem alteração.</p>
  </div>;
}
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: readonly (readonly [string, string])[] }) { return <label className="min-w-0 rounded-xl border border-border p-3"><span className="block text-sm font-medium">{label}</span><select value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 h-11 w-full min-w-0 rounded-lg border border-input bg-bg px-3 text-sm">{options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block min-w-0 space-y-1.5"><span className="text-sm font-medium">{label}</span>{children}</label>; }
