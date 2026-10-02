import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Flag, ShieldAlert, User, FileText, MessageSquare, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { SignedShell } from "@/components/signed-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { listReports, resolveReport } from "@/lib/nyxoshi/server";

export const Route = createFileRoute("/reports")({ component: ReportsPage });

type Report = any;

function ReportsPage(){ return <SignedShell><ReportsInner/></SignedShell>; }

function ReportsInner(){
  const qc=useQueryClient();
  const reports=useQuery({queryKey:["reports"],queryFn:()=>listReports()});
  const [decision,setDecision]=useState<Record<string,string>>({});
  const [reason,setReason]=useState<Record<string,string>>({});
  const [duration,setDuration]=useState<Record<string,string>>({});
  const [busy,setBusy]=useState<string|null>(null);

  async function resolve(report:Report){
    const d=(decision[report.id]||"dismiss") as "dismiss"|"warning"|"mute"|"ban"|"shadow_ban"|"delete_content";
    setBusy(report.id);
    try{
      await resolveReport({data:{reportId:report.id,decision:d,reason:reason[report.id]?.trim()||undefined,durationHours:duration[report.id]?Number(duration[report.id]):undefined}});
      await qc.invalidateQueries({queryKey:["reports"]});
      toast.success(d==="dismiss"?"Denúncia arquivada.":"Denúncia resolvida.");
    }catch(e){toast.error(e instanceof Error?e.message:"Não foi possível resolver a denúncia.");}
    finally{setBusy(null);}
  }

  return <div className="p-4 pb-12">
    <header className="border-b border-border pb-4">
      <div className="flex min-w-0 items-start gap-2"><Button asChild size="icon" variant="ghost"><Link to="/founders"><ArrowLeft/></Link></Button><div className="min-w-0"><h1 className="font-display text-2xl break-words">Painel de denúncias</h1><p className="text-sm text-muted">Área privada para fundadores e usuários autorizados por ID.</p></div></div>
    </header>
    {reports.isError?<div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm">Você não possui acesso a este painel ou houve um erro ao carregar as denúncias.</div>:null}
    <div className="mt-5 space-y-4">
      {reports.data?.map(r=><ReportCard key={r.id} report={r} decision={decision[r.id]??"dismiss"} setDecision={(v)=>{ setDecision(x=>({...x,[r.id]:v})); }} reason={reason[r.id]??""} setReason={(v)=>{ setReason(x=>({...x,[r.id]:v})); }} duration={duration[r.id]??"24"} setDuration={(v)=>{ setDuration(x=>({...x,[r.id]:v})); }} onResolve={()=>void resolve(r)} busy={busy===r.id}/>) }
      {reports.data?.length===0?<div className="nyx-panel rounded-2xl p-8 text-center text-sm text-muted">Nenhuma denúncia registrada.</div>:null}
    </div>
  </div>;
}

function ReportCard({report,decision,setDecision,reason,setReason,duration,setDuration,onResolve,busy}:{report:Report;decision:string;setDecision:(v:string)=>void;reason:string;setReason:(v:string)=>void;duration:string;setDuration:(v:string)=>void;onResolve:()=>void;busy:boolean}){
  const s:any=report.snapshot;
  const closed=report.status!=="pending";
  return <article className={`nyx-panel rounded-2xl p-4 ${closed?"opacity-80":""}`}>
    <div className="flex min-w-0 flex-wrap items-start justify-between gap-3"><div><div className="flex min-w-0 items-center gap-2"><Flag className="size-4 text-fuchsia-300"/><span className="text-xs uppercase tracking-wide text-fuchsia-200">{report.target_type??"alvo"}</span><span className="text-xs text-muted">· {new Date(report.createdAt).toLocaleString()}</span></div><p className="mt-2 text-sm">Denunciado por <strong>{report.reporter.displayName}</strong> (@{report.reporter.username})</p></div><span className="rounded-full border border-border px-2 py-1 text-xs">{report.status}</span></div>
    <section className="mt-4 rounded-xl border border-border bg-bg/50 p-3"><div className="flex items-center gap-2 text-sm font-medium">{report.target_type==="post"?<FileText className="size-4"/>:report.target_type==="message"?<MessageSquare className="size-4"/>:<User className="size-4"/>} Conteúdo denunciado</div>
      {report.target_type==="post"?<><p className="mt-2 text-xs text-muted">{s?.displayName?`${s.displayName} (@${s.username})`:"Publicação"}</p><p className="mt-2 whitespace-pre-wrap text-sm">{s?.body??"Conteúdo não disponível."}</p></>:null}
      {report.target_type==="message"?<><p className="mt-2 text-xs text-muted">{s?.senderName?`${s.senderName} (@${s.senderUsername}) → ${s.recipientName} (@${s.recipientUsername})`:"Mensagem"}</p><p className="mt-2 whitespace-pre-wrap text-sm">{s?.body??"Mensagem não disponível."}</p></>:null}
      {report.target_type==="user"?<><p className="mt-2 font-medium">{s?.display_name??"Usuário"}</p><p className="text-xs text-muted">@{s?.username??"desconhecido"}</p>{s?.bio?<p className="mt-2 text-sm">{s.bio}</p>:null}</>:null}
    </section>
    <section className="mt-3 rounded-xl border border-fuchsia-400/20 bg-fuchsia-500/5 p-3"><p className="text-xs font-semibold text-fuchsia-200">O que foi denunciado / motivo informado</p><p className="mt-2 whitespace-pre-wrap text-sm">{report.reason}</p></section>
    {closed?<section className="mt-3 rounded-xl border border-border p-3 text-sm"><p><strong>Decisão:</strong> {report.decision}</p>{report.decision_reason?<p className="mt-1 text-muted">{report.decision_reason}</p>:null}</section>:<section className="mt-4 space-y-3"><div><label className="text-xs text-muted">Punição / decisão</label><select value={decision} onChange={e=>setDecision(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-input bg-bg px-3 text-sm"><option value="dismiss">Arquivar sem punição</option><option value="warning">Advertência</option><option value="mute">Silenciar</option><option value="ban">Suspender</option><option value="shadow_ban">Shadow ban</option><option value="delete_content">Remover conteúdo</option></select></div>{["mute","ban"].includes(decision)?<div><label className="text-xs text-muted">Duração em horas</label><Input type="number" min={1} max={8760} value={duration} onChange={e=>setDuration(e.target.value)}/></div>:null}<div><label className="text-xs text-muted">Observação da moderação</label><Textarea value={reason} onChange={e=>setReason(e.target.value.slice(0,400))} placeholder="Registre o motivo da decisão..." maxLength={400}/></div><Button className="w-full" onClick={onResolve} disabled={busy}><CheckCircle2/>{busy?"Processando…":"Registrar decisão"}</Button></section>}
  </article>;
}
