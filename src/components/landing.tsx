import { Link } from "@tanstack/react-router";
import type { ComponentType } from "react";
import { ArrowRight, MessageCircle, Sparkles, UsersRound } from "lucide-react";
import { Logo, MoonMark } from "@/components/logo";
import { Button } from "@/components/ui/button";

export function Landing() {
  return (
    <div className="night-wash starfield relative min-h-dvh overflow-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <Button asChild variant="outline" size="sm"><Link to="/login">Entrar</Link></Button>
      </header>

      <main className="relative mx-auto grid min-h-[calc(100dvh-88px)] max-w-6xl items-center gap-12 px-5 pb-16 pt-6 lg:grid-cols-[1.05fr_.95fr]">
        <div className="max-w-xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-1.5 text-xs text-fuchsia-200">
            <Sparkles className="size-3.5" /> Rede social independente
          </div>
          <h1 className="mt-4 font-display text-5xl leading-[1.02] tracking-[-0.04em] sm:text-7xl">
            Conecte-se.<br /><span className="bg-gradient-to-r from-fuchsia-300 via-violet-300 to-indigo-300 bg-clip-text text-transparent">Compartilhe.</span><br />Faça parte de algo maior.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-muted">
            Nyxoshi é um espaço social independente para pessoas, ideias e comunidades. Um lugar para criar conexões sem precisar caber no mesmo molde.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="nyx-glow"><Link to="/login">Criar conta <ArrowRight /></Link></Button>
            <Button asChild variant="outline" size="lg"><Link to="/login">Já tenho conta</Link></Button>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            <Feature icon={UsersRound} title="Comunidade" text="Pessoas com interesses em comum." />
            <Feature icon={MessageCircle} title="Conversa" text="Posts, comentários e mensagens." />
            <Feature icon={MoonMark} title="Identidade" text="Seu perfil, seu espaço, sua noite." />
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <div className="absolute -inset-10 rounded-[50%] bg-violet-600/10 blur-3xl" />
          <div className="nyx-panel relative overflow-hidden rounded-[32px] p-4 shadow-2xl">
            <div className="rounded-[25px] border border-fuchsia-400/15 bg-[#09060e] p-5">
              <div className="flex items-center justify-between">
                <Logo />
                <span className="rounded-full bg-fuchsia-500/10 px-2.5 py-1 text-xs text-fuchsia-200">Ao vivo</span>
              </div>
              <div className="mt-6 flex gap-3 overflow-hidden">
                {Array.from({ length: 5 }).map((_, i) => <span key={i} className="story-ring shrink-0"><span className="block size-12 rounded-full bg-gradient-to-br from-[#24113e] to-[#0b0712]" /></span>)}
              </div>
              <div className="mt-5 rounded-2xl border border-fuchsia-400/10 bg-[#100a19] p-4">
                <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-violet-500/15 text-violet-300"><MoonMark /></span><div><p className="text-sm font-semibold">Nyxoshi</p><p className="text-xs text-muted">@nyxoshi · agora</p></div></div>
                <p className="mt-4 text-sm leading-relaxed">A noite também pode ser um lugar para encontrar pessoas. ✦</p>
                <div className="mt-4 h-40 rounded-xl bg-gradient-to-br from-violet-950 via-fuchsia-950 to-black opacity-90" />
                <div className="mt-3 flex gap-5 text-xs text-muted"><span>♡ 124</span><span>◌ 23</span><span>↗ 7</span></div>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2 text-center text-[10px] text-muted"><span>⌂<br />Início</span><span>⌕<br />Explorar</span><span className="text-fuchsia-300">＋<br />Publicar</span><span>◉<br />Perfil</span></div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Feature({ icon: Icon, title, text }: { icon: ComponentType<{ className?: string }>; title: string; text: string }) {
  return <div className="nyx-panel rounded-2xl p-3"><Icon className="size-4 text-fuchsia-300" /><p className="mt-2 text-sm font-medium">{title}</p><p className="mt-1 text-xs leading-relaxed text-muted">{text}</p></div>;
}
