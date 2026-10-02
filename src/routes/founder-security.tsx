import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Eye, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { SignedShell } from "@/components/signed-shell";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/use-me";
import { getUserSecurityInfo, revealUserEmail } from "@/lib/nyxoshi/server";

export const Route = createFileRoute("/founder-security")({ component: FounderSecurityPage });
function FounderSecurityPage(){return <SignedShell><Inner/></SignedShell>}
function Inner(){
  const {me}=useMe();
  const security=useQuery({queryKey:["founder-security"],queryFn:()=>getUserSecurityInfo(),enabled:me?.role === "angel_girl"});
  const [email,setEmail]=useState<string|null>(null);
  if(!(me?.role === "angel_girl"))return <div className="p-8 text-center"><p className="text-muted">Acesso restrito à Angel Girl.</p><Button asChild className="mt-4" variant="outline"><Link to="/founders"><ArrowLeft/>Voltar</Link></Button></div>;
  async function reveal(id:string){try{const r=await revealUserEmail({data:{targetUserId:id}});setEmail(r.email);}catch(e){toast.error(e instanceof Error?e.message:"Não foi possível revelar o e-mail.");}}
  return <div className="p-4 pb-12"><div className="flex items-center gap-2"><Button asChild variant="ghost" size="icon"><Link to="/founders"><ArrowLeft/></Link></Button><div><h1 className="font-display text-2xl">Segurança confidencial</h1><p className="text-sm text-muted">Área exclusiva da Angel Girl.</p></div></div><p className="mt-4 text-xs text-muted">Os e-mails continuam protegidos no servidor e só esta conta pode revelá-los. Não é necessário motivo.</p><div className="mt-4 space-y-2">{security.data?.map((u:any)=><div key={u.user_id} className="flex items-center justify-between rounded-xl border border-border p-3"><div><strong>{u.display_name}</strong><p className="text-xs text-muted">@{u.username} · {u.emailMasked}</p></div><Button size="sm" variant="outline" onClick={()=>void reveal(u.user_id)}><Eye/>Ver e-mail</Button></div>)}</div>{email?<div className="mt-4 rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10 p-4">E-mail revelado: <strong>{email}</strong><Button className="mt-2" size="sm" variant="ghost" onClick={()=>setEmail(null)}>Ocultar</Button></div>:null}</div>;
}
