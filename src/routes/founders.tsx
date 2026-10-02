import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Send, Shield, Users, UserCog, Flag, UserPlus, UserMinus, Crown, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { SignedShell } from "@/components/signed-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMe } from "@/hooks/use-me";
import { getModerationOverview, listFounders, listUsersForRoleManagement, setUserRole, createGlobalAnnouncement, listReportModerators, setReportModerator } from "@/lib/nyxoshi/server";
import { withAuthRetry } from "@/lib/auth/mutation";

export const Route = createFileRoute("/founders")({ component: FoundersPage });

const assignableRoles = ["user", "tester", "bug_tester", "designer", "contributor", "vip", "moderator", "admin", "sub_founder"] as const;
const labels: Record<string,string> = { user:"Usuário", tester:"Testador", bug_tester:"Testador de Bugs", designer:"Designer", contributor:"Contribuidor", vip:"VIP", moderator:"Moderador", admin:"Administrador", sub_founder:"Sub Fundador / Vice Fundador" };

function FoundersPage() { return <SignedShell><Inner /></SignedShell>; }

function Inner() {
  const { me } = useMe(); const qc = useQueryClient();
  const canSeePanel = ["founder","sub_founder","supreme_archmage","angel_girl"].includes(me?.role ?? "");
  const canManage = me?.role === "angel_girl";
  const canModerate = me?.role === "founder" || me?.role === "angel_girl";
  const overview = useQuery({ queryKey:["moderation-overview"], queryFn:()=>getModerationOverview(), enabled:canModerate });
  const founders = useQuery({ queryKey:["founders"], queryFn:()=>listFounders(), enabled:canSeePanel });
  const users = useQuery({ queryKey:["role-management-users"], queryFn:()=>listUsersForRoleManagement(), enabled:canManage });
  const reportModerators = useQuery({ queryKey:["report-moderators"], queryFn:()=>listReportModerators(), enabled:canManage });
  const [announcement,setAnnouncement]=useState(""); const [reportModeratorId,setReportModeratorId]=useState("");

  async function role(targetUserId:string, role:typeof assignableRoles[number]) { try { await withAuthRetry(() => setUserRole({data:{targetUserId,role}})); await Promise.all([qc.invalidateQueries({queryKey:["moderation-overview"]}),qc.invalidateQueries({queryKey:["founders"]}),qc.invalidateQueries({queryKey:["role-management-users"]}),qc.invalidateQueries({queryKey:["me"]})]); toast.success("Cargo atualizado."); } catch(e){toast.error(e instanceof Error?e.message:"Não foi possível atualizar o cargo.");} }
  async function sendAnnouncement(){if(!announcement.trim())return;try{await withAuthRetry(() => createGlobalAnnouncement({data:{body:announcement,seconds:12}}));setAnnouncement("");toast.success("Comunicado enviado para todo o Nyxoshi.");}catch(e){toast.error(e instanceof Error?e.message:"Não foi possível enviar.");}}
  async function changeReportModerator(userId:string,enabled:boolean){try{await withAuthRetry(() => setReportModerator({data:{userId,enabled}}));setReportModeratorId("");await qc.invalidateQueries({queryKey:["report-moderators"]});toast.success(enabled?"Acesso ao painel concedido.":"Acesso removido.");}catch(e){toast.error(e instanceof Error?e.message:"Não foi possível alterar o acesso.");}}

  if(!me || !canSeePanel)return <p className="p-8 text-center text-muted">Acesso negado.</p>;

  return <div className="p-4 pb-12">
    <header className="border-b border-border pb-5"><div className="flex items-center gap-3"><div className="role-orbit"><Crown className="size-5"/></div><div><h1 className="font-display text-2xl tracking-tight">Painel da Liderança</h1><p className="mt-1 text-sm text-muted">Estrutura de cargos, segurança, denúncias e administração do Nyxoshi.</p></div></div><div className="mt-4 flex flex-wrap gap-2">{canModerate?<Button asChild size="sm" variant="outline"><Link to="/moderation"><Shield/> Painel de moderação</Link></Button>:null}{canManage?<Button asChild size="sm" variant="outline"><Link to="/founder-security"><Eye/> Segurança</Link></Button>:null}</div></header>

    <section className="mt-5 nyx-panel rounded-3xl p-4"><div className="flex items-center gap-2"><Sparkles className="text-fuchsia-300"/><h2 className="font-medium">Hierarquia Nyxoshi</h2></div><div className="mt-4 grid gap-2 sm:grid-cols-2">
      <RoleCard title="Angel Girl" icon="🪽" tone="angel" text="Cargo isolado acima de todos. Definido exclusivamente por e-mail e com todos os acessos da Fundadora #1."/>
      <RoleCard title="Fundadores #1 / #2 / #3" icon="♛" tone="founder" text="Os três fundadores originais possuem a mesma estrutura e o mesmo nível de permissões."/>
      <RoleCard title="Sub Fundador / Vice Fundador" icon="✦" tone="vice" text="Divisão imediatamente abaixo da liderança, atribuída pelo ID permanente do usuário."/>
      <RoleCard title="Supremo Arquimago" icon="◈" tone="mage" text="Cargo especial VIP/Contribuidor, um nível abaixo dos Fundadores e definido por e-mail."/>
      <RoleCard title="Maluco Cientista de Hardware com Farofa" icon="🧪" tone="scientist" text="Cargo especial exclusivo, com painel próprio no Laboratório da Maluca e sem acesso ao painel administrativo."/>
      <RoleCard title="Administrador / Moderador" icon="🛡" tone="staff" text="Cargos operacionais para administração e moderação da comunidade."/>
      <RoleCard title="Contribuidor / VIP / Designer / Testadores" icon="✧" tone="community" text="Cargos de contribuição, reconhecimento e testes, distribuídos pela liderança."/>
    </div></section>

    <section className="mt-5 nyx-panel rounded-3xl p-4"><div className="flex items-center gap-2"><Shield className="text-fuchsia-300"/><h2 className="font-medium">Fundadores originais</h2></div><div className="mt-3 space-y-2">{founders.data?.map((f:any)=><div key={f.user_id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-white/[.02] p-3"><div><strong>{f.display_name}</strong><p className="text-xs text-muted">@{f.username} · Fundador #{f.founder_number ?? "—"}</p></div><span className="role-chip role-chip-founder">F{f.founder_number ?? "?"}</span></div>)}</div></section>

    {canManage?<><section className="mt-5 nyx-panel rounded-3xl p-4"><div className="flex items-center gap-2"><UserCog className="text-fuchsia-300"/><h2 className="font-medium">Distribuição de cargos</h2></div><p className="mt-1 text-xs text-muted">Fundadores e cargos definidos por e-mail não aparecem como opções editáveis. Sub Fundadores usam o ID permanente e não podem trocar esse identificador.</p><div className="mt-4 space-y-3">{users.data?.map((u:any)=><div key={u.user_id} className="rounded-2xl border border-border bg-white/[.02] p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><strong className="block truncate">{u.display_name}</strong><p className="truncate text-xs text-muted">@{u.username}</p><p className="mt-1 break-all font-mono text-[11px] text-fuchsia-200/80">ID permanente: {u.permanent_id}</p></div><span className="role-chip">{u.role==="founder"?`Fundador #${u.founder_number}`:u.role==="angel_girl"?"Angel Girl":u.role==="supreme_archmage"?"Supremo Arquimago":u.role==="hardware_scientist"?"Maluco Cientista de Hardware com Farofa":labels[u.role] ?? u.role}</span></div>{u.user_id!==me.userId && !["founder","angel_girl","supreme_archmage","hardware_scientist"].includes(u.role)?<div className="mt-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center"><select defaultValue={u.role} className="h-10 w-full min-w-0 rounded-xl border border-input bg-bg px-3 text-sm sm:w-auto sm:min-w-48" onChange={e=>void role(e.target.value === "sub_founder" ? u.permanent_id : u.user_id,e.target.value as typeof assignableRoles[number])}>{assignableRoles.map(r=><option key={r} value={r}>{labels[r]}</option>)}</select>{u.role==="sub_founder"?<span className="self-center text-xs text-fuchsia-200">Atribuído por ID</span>:null}</div>:<p className="mt-2 text-xs text-fuchsia-200">Cargo protegido por regra de e-mail.</p>}</div>)}</div></section>

    <section className="mt-5 nyx-panel rounded-3xl p-4"><div className="flex items-center gap-2"><Flag className="text-fuchsia-300"/><h2 className="font-medium">Acesso ao painel de denúncias</h2></div><p className="mt-1 text-xs text-muted">Fundadores e Angel Girl têm acesso. Qualquer outro usuário precisa ser autorizado individualmente por ID permanente.</p><div className="mt-3 flex min-w-0 flex-col gap-2 sm:flex-row"><Input className="min-w-0 flex-1" value={reportModeratorId} onChange={e=>setReportModeratorId(e.target.value)} placeholder="ID permanente do usuário"/><Button className="w-full shrink-0 sm:w-auto" onClick={()=>void changeReportModerator(reportModeratorId.trim(),true)} disabled={!reportModeratorId.trim()}><UserPlus/> Adicionar</Button></div><div className="mt-3 space-y-2">{reportModerators.data?.map((u:any)=><div key={u.user_id} className="flex min-w-0 flex-wrap items-start justify-between gap-3 rounded-2xl border border-border p-3"><div className="min-w-0 flex-1"><strong className="block truncate">{u.display_name}</strong><p className="break-all text-xs text-muted">@{u.username} · ID permanente: {u.permanent_id}</p></div><Button className="shrink-0" size="sm" variant="outline" onClick={()=>void changeReportModerator(u.permanent_id,false)}><UserMinus/> Remover</Button></div>)}</div></section>

    <section className="mt-5 nyx-panel rounded-3xl p-4"><div className="flex items-center gap-2"><Send className="text-fuchsia-300"/><h2 className="font-medium">Comunicado global</h2></div><Textarea className="mt-3" value={announcement} onChange={e=>setAnnouncement(e.target.value)} placeholder="Mensagem do Nyxoshi..." maxLength={500}/><Button className="mt-2" onClick={()=>void sendAnnouncement()}><Send/> Enviar</Button></section></>:null}

    <section className="mt-5 nyx-panel rounded-3xl p-4"><div className="flex items-center gap-2"><Users className="text-fuchsia-300"/><h2 className="font-medium">Visão geral</h2></div><p className="mt-2 text-sm text-muted">Usuários: {overview.data?.counts.users ?? "—"} · Posts: {overview.data?.counts.posts ?? "—"} · Denúncias: {overview.data?.counts.reports ?? "—"}</p></section>
  </div>;
}

function RoleCard({title,icon,text,tone}:{title:string;icon:string;text:string;tone:string}){return <div className={`role-card role-card-${tone}`}><span className="role-card-icon">{icon}</span><div><strong>{title}</strong><p>{text}</p></div></div>}
