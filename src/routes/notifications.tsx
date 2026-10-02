import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SignedShell } from "@/components/signed-shell";
import { UserAvatar } from "@/components/user-avatar";
import {
  listNotifications,
  markNotificationsRead,
  markNotificationRead,
} from "@/lib/nyxoshi/server";
import { relativeTime } from "@/lib/nyxoshi/time";
import type { NotificationCard } from "@/lib/nyxoshi/types";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  return (
    <SignedShell>
      <NotificationsInner />
    </SignedShell>
  );
}

function NotificationsInner() {
  const queryClient = useQueryClient();
  const list = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listNotifications(),
  });

  const [filter,setFilter] = useState<"all"|"unread">("all");
  const visible = (list.data ?? []).filter(item => filter === "all" || !item.read);

  return (
    <div className="min-w-0 overflow-x-hidden">
      <header className="sticky top-0 z-20 border-b border-border bg-bg/85 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3"><h1 className="font-display text-xl tracking-tight">Notificações</h1><button type="button" className="text-right text-xs text-fuchsia-300" onClick={async()=>{try{await markNotificationsRead();await queryClient.invalidateQueries({queryKey:["notifications"]});await queryClient.invalidateQueries({queryKey:["unread"]});}catch{}}}>Marcar todas como lidas</button></div>
        <div className="mt-3 flex gap-2"><button className={`rounded-full px-3 py-1.5 text-xs ${filter==="all"?"bg-secondary":"text-muted"}`} onClick={()=>setFilter("all")}>Todas</button><button className={`rounded-full px-3 py-1.5 text-xs ${filter==="unread"?"bg-secondary":"text-muted"}`} onClick={()=>setFilter("unread")}>Não lidas</button></div>
      </header>
      {list.isError ? <div className="px-6 py-16 text-center"><p className="text-sm text-destructive">Não foi possível carregar as notificações.</p><button type="button" className="mt-3 rounded-full border border-border px-4 py-2 text-sm" onClick={() => void list.refetch()}>Tentar novamente</button></div> : visible.length > 0 ? (
        <ul>
          {visible.map((item) => (
            <NotificationRow key={item.id} item={item} onRead={async()=>{if(!item.read){try{await markNotificationRead({data:item.id});await queryClient.invalidateQueries({queryKey:["notifications"]});await queryClient.invalidateQueries({queryKey:["unread"]});}catch{}}}} />
          ))}
        </ul>
      ) : (
        <p className="px-6 py-16 text-center text-sm text-muted">
          Nada novo por enquanto. Curtidas, comentários e novos seguidores
          aparecem aqui.
        </p>
      )}
    </div>
  );
}

function NotificationRow({ item, onRead }: { item: NotificationCard; onRead: () => Promise<void> }) {
  const copy =
    item.type === "like" ? "curtiu sua publicação" :
    item.type === "comment" ? "comentou sua publicação" :
    item.type === "follow" ? "começou a seguir você" :
    item.type === "repost" ? "repostou sua publicação" :
    item.type === "quote" ? "citou sua publicação" :
    item.type === "mention" ? "mencionou você" : item.type === "message_request" ? "enviou uma solicitação de mensagem" : item.type === "message_accepted" ? "aceitou sua solicitação de mensagem" : "reagiu à sua publicação";

  const inner = (
    <>
      <UserAvatar
        username={item.actor.username}
        displayName={item.actor.displayName}
        image={item.actor.image}
        toProfile={false}
      />
      <div className="min-w-0">
        <p className="text-sm">
          <span className="font-medium">{item.actor.displayName}</span>{" "}
          <span className="text-muted">{copy}</span>
        </p>
        <p className="text-xs text-subtle">{relativeTime(item.createdAt)}</p>
      </div>
    </>
  );

  return (
    <li className={`border-b border-border ${item.read ? "" : "bg-fuchsia-500/[0.05]"}`} onClick={()=>void onRead()}>
      {item.type === "message_request" || item.type === "message_accepted" ? (
        <Link to="/messages" className="flex items-center gap-3 px-4 py-4">{inner}</Link>
      ) : item.postId ? (
        <Link
          to="/post/$postId"
          params={{ postId: item.postId }}
          className="flex items-center gap-3 px-4 py-4"
        >
          {inner}
        </Link>
      ) : (
        <Link
          to="/u/$username"
          params={{ username: item.actor.username }}
          className="flex items-center gap-3 px-4 py-4"
        >
          {inner}
        </Link>
      )}
    </li>
  );
}
