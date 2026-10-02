import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Compass, Film, Sparkles } from "lucide-react";
import { useState } from "react";
import { Compose } from "@/components/compose";
import { PostCard } from "@/components/post-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getFeed } from "@/lib/nyxoshi/server";
import type { FeedTab, Profile } from "@/lib/nyxoshi/types";
import { UserAvatar } from "@/components/user-avatar";

export function Feed({ me }: { me: Profile }) {
  const [tab, setTab] = useState<FeedTab>("forYou");
  const feed = useQuery({
    queryKey: ["feed", tab],
    queryFn: () => getFeed({ data: { tab } }),
    staleTime: 10_000,
  });

  return (
    <div className="min-w-0">
      <header className="sticky top-0 z-20 border-b border-border bg-[#09060dcc] px-4 py-3 backdrop-blur-xl">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <h1 className="font-display text-2xl tracking-tight">Início</h1>
          <Link to="/search" className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-secondary hover:text-fg" aria-label="Explorar">
            <Compass className="size-5" />
          </Link>
        </div>
      </header>

      <div className="border-b border-border p-3">
        <div className="nyx-panel rounded-2xl p-3">
          <div className="flex min-w-0 gap-3">
            <UserAvatar username={me.username} displayName={me.displayName} image={me.image} toProfile={false} className="size-10 shrink-0" />
            <div className="min-w-0 flex-1">
              <Compose me={me} compact />
            </div>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as FeedTab)}>
        <TabsList className="feed-tabs mx-3 mt-3 grid w-auto grid-cols-3 rounded-xl border border-border bg-[#0e0a18ee] p-1 backdrop-blur-xl md:sticky md:top-[69px] md:z-10">
          <TabsTrigger value="forYou" className="min-w-0 rounded-lg px-2">Para você</TabsTrigger>
          <TabsTrigger value="following" className="min-w-0 rounded-lg px-2">Seguindo</TabsTrigger>
          <TabsTrigger value="videos" className="min-w-0 rounded-lg px-2"><Film className="mr-1 size-3.5" />Vídeos</TabsTrigger>
        </TabsList>
        <TabsContent value={tab}>
          {feed.isLoading ? <FeedSkeleton /> : feed.isError ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm text-destructive">Não foi possível carregar o feed.</p>
              <button type="button" className="mt-3 rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary" onClick={() => void feed.refetch()}>Tentar novamente</button>
            </div>
          ) : feed.data && feed.data.length > 0 ? feed.data.map((post) => (
            <PostCard key={post.id} post={post} viewerId={me.userId} onChanged={() => void feed.refetch()} />
          )) : <EmptyFeed tab={tab} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyFeed({ tab }: { tab: FeedTab }) {
  const copy = {
    following: ["Ainda sem vozes próximas.", "Siga pessoas para montar o seu recorte da Nyxoshi."],
    videos: ["Ainda não há vídeos.", "Quando a comunidade publicar vídeos, eles aparecerão aqui."],
    forYou: ["A noite está quieta.", "Seja a primeira voz. Uma frase já acende o feed."],
  } as const;
  const [title, description] = copy[tab];

  return (
    <div className="px-8 py-20 text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-300 nyx-glow">
        {tab === "videos" ? <Film className="size-6" /> : <Sparkles className="size-6" />}
      </div>
      <p className="mt-5 font-display text-2xl tracking-tight">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">{description}</p>
    </div>
  );
}

export function FeedSkeleton() {
  return <div className="divide-y divide-border">{Array.from({ length: 4 }).map((_, i) => (
    <div key={i} className="flex gap-3 px-4 py-4"><Skeleton className="size-10 shrink-0 rounded-full" /><div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /></div></div>
  ))}</div>;
}
