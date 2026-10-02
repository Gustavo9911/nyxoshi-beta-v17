import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FlaskConical, Lightbulb, Search, Wrench, Sparkles, ScrollText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SignedShell } from "@/components/signed-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMe } from "@/hooks/use-me";
import { createHardwareLabEntry, deleteHardwareLabEntry, listHardwareLabEntries } from "@/lib/nyxoshi/server";

export const Route = createFileRoute("/hardware-lab")({ component: HardwareLabPage });

const categories = [
  ["idea", "Ideia", Lightbulb],
  ["experiment", "Experimento", FlaskConical],
  ["investigation", "Investigação", Search],
  ["solution", "Solução", Wrench],
  ["discovery", "Descoberta", Sparkles],
  ["record", "Registro", ScrollText],
] as const;

function HardwareLabPage() { return <SignedShell><HardwareLabInner /></SignedShell>; }

function HardwareLabInner() {
  const { me } = useMe();
  const qc = useQueryClient();
  const allowed = me?.role === "hardware_scientist";
  const entries = useQuery({ queryKey: ["hardware-lab"], queryFn: () => listHardwareLabEntries(), enabled: allowed });
  const [category, setCategory] = useState<(typeof categories)[number][0]>("idea");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!title.trim() || !content.trim()) { toast.error("Preencha o título e o registro."); return; }
    setBusy(true);
    try { await createHardwareLabEntry({ data: { category, title, content } }); setTitle(""); setContent(""); await qc.invalidateQueries({ queryKey: ["hardware-lab"] }); toast.success("Registro salvo no laboratório."); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível salvar o registro."); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    try { await deleteHardwareLabEntry({ data: id }); await qc.invalidateQueries({ queryKey: ["hardware-lab"] }); toast.success("Registro removido."); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível remover o registro."); }
  }

  if (!allowed) return <div className="p-8 text-center text-muted">Acesso negado.</div>;

  return <div className="p-4 pb-12">
    <header className="border-b border-border pb-5">
      <div className="flex items-center gap-3"><div className="role-orbit"><FlaskConical className="size-5"/></div><div><h1 className="font-display text-2xl tracking-tight">🧪 Laboratório da Maluca</h1><p className="mt-1 text-sm text-muted">Área privada da Maluco Cientista de Hardware com Farofa.</p></div></div>
      <div className="mt-4 rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/5 p-3 text-xs text-muted">Este painel é independente do painel administrativo do Nyxoshi. Os registros ficam persistidos no banco e são visíveis somente para a conta autorizada.</div>
    </header>

    <section className="mt-5 nyx-panel rounded-3xl p-4"><div className="flex items-center gap-2"><FlaskConical className="text-fuchsia-300"/><h2 className="font-medium">Novo registro</h2></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2"><div><label className="text-xs text-muted">Tipo</label><select value={category} onChange={e=>setCategory(e.target.value as typeof category)} className="mt-1 h-10 w-full rounded-xl border border-input bg-bg px-3 text-sm">{categories.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div><div><label className="text-xs text-muted">Título</label><Input className="mt-1" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Nome do experimento, ideia ou descoberta" maxLength={160}/></div></div>
      <Textarea className="mt-3 min-h-40" value={content} onChange={e=>setContent(e.target.value)} placeholder="Descreva o que foi pensado, testado, investigado ou descoberto..." maxLength={10000}/>
      <Button className="mt-3 w-full sm:w-auto" onClick={()=>void save()} disabled={busy}>{busy ? "Salvando…" : "Salvar no laboratório"}</Button>
    </section>

    <section className="mt-5"><div className="flex items-center justify-between gap-3"><h2 className="font-display text-xl">Registros</h2><span className="text-xs text-muted">{entries.data?.length ?? 0} salvos</span></div>
      <div className="mt-3 space-y-3">{entries.data?.map(entry => { const meta=categories.find(([value])=>value===entry.category); const Icon=meta?.[2] ?? ScrollText; return <article key={entry.id} className="nyx-panel rounded-2xl p-4"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2"><Icon className="size-4 text-fuchsia-300"/><span className="text-xs uppercase tracking-wide text-fuchsia-200">{meta?.[1] ?? entry.category}</span></div><Button size="icon" variant="ghost" className="text-muted hover:text-destructive" onClick={()=>void remove(entry.id)} aria-label="Remover registro"><Trash2 className="size-4"/></Button></div><h3 className="mt-2 text-base font-semibold">{entry.title}</h3><p className="mt-2 whitespace-pre-wrap text-sm text-muted">{entry.content}</p><p className="mt-3 text-[11px] text-muted">Atualizado em {new Date(entry.updated_at).toLocaleString()}</p></article>; })}{entries.data?.length===0 ? <div className="nyx-panel rounded-2xl p-8 text-center text-sm text-muted">Nenhum registro ainda. O laboratório está pronto para a primeira experiência.</div> : null}</div>
    </section>
  </div>;
}
