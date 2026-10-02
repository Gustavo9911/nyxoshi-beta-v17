import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Gamepad2, Hash, Palette, Code2, Music2, UsersRound } from "lucide-react";
import { SignedShell } from "@/components/signed-shell";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/communities")({ component: CommunitiesPage });

const communities = [
  { name: "Anime & Mangá", members: "12,4 mil membros", category: "Anime", icon: Gamepad2 },
  { name: "Games", members: "8,7 mil membros", category: "Games", icon: Gamepad2 },
  { name: "Programação", members: "5,2 mil membros", category: "Tecnologia", icon: Code2 },
  { name: "Tecnologia", members: "4,8 mil membros", category: "Tecnologia", icon: Hash },
  { name: "Arte & Design", members: "3,9 mil membros", category: "Arte", icon: Palette },
  { name: "Música", members: "3,1 mil membros", category: "Todas", icon: Music2 },
];

function CommunitiesPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas");
  const filtered = useMemo(() => communities.filter((community) => {
    const matchesCategory = category === "Todas" || community.category === category;
    const matchesQuery = !query.trim() || community.name.toLowerCase().includes(query.trim().toLowerCase());
    return matchesCategory && matchesQuery;
  }), [category, query]);

  return <SignedShell><div className="min-w-0 overflow-x-hidden">
    <header className="sticky top-0 z-20 border-b border-border bg-[#09060dcc] px-4 py-3 backdrop-blur-xl">
      <div className="flex items-center justify-between"><h1 className="font-display text-2xl">Comunidades</h1><UsersRound className="size-5 text-fuchsia-300" /></div>
      <Input value={query} onChange={(e) => setQuery(e.target.value)} className="mt-3 rounded-full bg-secondary" placeholder="Buscar comunidades..." />
    </header>
    <div className="flex gap-2 overflow-x-auto px-4 py-3 nyx-scrollbar" role="tablist" aria-label="Categorias">{["Todas", "Anime", "Games", "Tecnologia", "Arte"].map((x) => <button type="button" key={x} onClick={() => setCategory(x)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs ${category === x ? "bg-primary text-white" : "bg-secondary text-muted"}`}>{x}</button>)}</div>
    <section className="divide-y divide-border">
      {filtered.map(({ name, members, icon: Icon }) => <div key={name} className="flex min-w-0 items-center gap-3 px-4 py-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-fuchsia-400/15 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/5 text-fuchsia-300"><Icon className="size-5" /></span>
        <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{name}</strong><span className="text-xs text-muted">{members}</span></span>
        <span className="shrink-0 rounded-full border border-border px-3 py-1 text-xs text-muted">Em breve</span>
      </div>)}
      {!filtered.length ? <p className="px-6 py-16 text-center text-sm text-muted">Nenhuma comunidade encontrada.</p> : null}
    </section>
  </div></SignedShell>;
}
