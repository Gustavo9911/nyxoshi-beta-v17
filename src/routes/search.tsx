import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Hash, Search as SearchIcon, Sparkles } from "lucide-react";
import { SignedShell } from "@/components/signed-shell";
import { Input } from "@/components/ui/input";
import { PostCard } from "@/components/post-card";
import { UserAvatar } from "@/components/user-avatar";
import { useMe } from "@/hooks/use-me";
import { searchNyxoshi } from "@/lib/nyxoshi/server";

export const Route = createFileRoute("/search")({ component: SearchPage });

function SearchPage() {
  return (
    <SignedShell>
      <SearchInner />
    </SignedShell>
  );
}

function SearchInner() {
  const { me } = useMe();
  const [q, setQ] = useState("");
  const trimmed = q.trim();
  const result = useQuery({
    queryKey: ["search", trimmed],
    queryFn: () => searchNyxoshi({ data: { q: trimmed } }),
    enabled: trimmed.length > 0,
  });

  return (
    <div>
      <header className="sticky top-0 z-20 border-b border-border bg-bg/85 px-4 py-3 backdrop-blur-sm">
        <h1 className="font-display text-xl tracking-tight">Explorar</h1>
        <div className="relative mt-3">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar pessoas e textos"
            className="rounded-full bg-secondary pl-9"
            autoFocus
          />
        </div>
      </header>

      {trimmed.length === 0 ? (
        <div className="p-4">
          <section className="nyx-panel rounded-2xl p-4">
            <div className="flex items-center gap-2"><Sparkles className="size-4 text-fuchsia-300" /><h2 className="font-display text-lg">Em alta na Nyxoshi</h2></div>
            <div className="mt-4 flex flex-wrap gap-2">{["#anime", "#games", "#tecnologia", "#programação", "#arte", "#música", "#memes", "#filosofia", "#femboy"].map((tag) => <button key={tag} type="button" onClick={() => setQ(tag)} className="rounded-full border border-fuchsia-400/15 bg-secondary px-3 py-1.5 text-xs text-muted hover:text-fg"><Hash className="mr-1 inline size-3" />{tag.slice(1)}</button>)}</div>
          </section>
          <p className="px-2 py-10 text-center text-sm text-muted">Procure um @, um nome ou um pedaço de texto.</p>
        </div>
      ) : result.isLoading ? (
        <p className="px-6 py-16 text-center text-sm text-muted">Buscando…</p>
      ) : result.isError ? (
        <div className="px-6 py-16 text-center"><p className="text-sm text-destructive">Não foi possível realizar a busca.</p><button type="button" className="mt-3 rounded-full border border-border px-4 py-2 text-sm" onClick={() => void result.refetch()}>Tentar novamente</button></div>
      ) : result.data &&
        result.data.people.length === 0 &&
        result.data.posts.length === 0 ? (
        <p className="px-6 py-16 text-center text-sm text-muted">
          Nada encontrado para “{trimmed}”.
        </p>
      ) : (
        <div>
          {result.data?.people.length ? (
            <section className="border-b border-border px-4 py-4">
              <h2 className="text-sm font-medium text-muted">Pessoas</h2>
              <ul className="mt-3 space-y-3">
                {result.data.people.map((person) => (
                  <li key={person.userId}>
                    <Link
                      to="/u/$username"
                      params={{ username: person.username }}
                      className="flex items-center gap-3"
                    >
                      <UserAvatar
                        username={person.username}
                        displayName={person.displayName}
                        image={person.image}
                        toProfile={false}
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {person.displayName}
                        </span>
                        <span className="block truncate text-sm text-muted">
                          @{person.username}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {result.data?.posts.map((post) => (
            <PostCard key={post.id} post={post} viewerId={me?.userId ?? null} />
          ))}
        </div>
      )}
    </div>
  );
}
