import { type ReactNode, useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  LogOut,
  Compass,
  Home,
  MessageCircle,
  PenLine,
  Search,
  Settings,
  UsersRound,
  User,
  ShieldCheck,
  X,
} from "lucide-react";
import { Logo, MoonMark } from "@/components/logo";
import { Compose } from "@/components/compose";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { suggestedPeople, unreadNotificationCount, listActiveGlobalAnnouncements } from "@/lib/nyxoshi/server";
import { signOut } from "@/lib/auth/client";
import { hasGateSessionMarker } from "@/lib/auth/gate-session-marker";
import type { Profile } from "@/lib/nyxoshi/types";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Início", icon: Home, exact: true },
  { to: "/search", label: "Explorar", icon: Compass, exact: false },
  { to: "/communities", label: "Comunidades", icon: UsersRound, exact: false },
  { to: "/messages", label: "Mensagens", icon: MessageCircle, exact: false },
  { to: "/notifications", label: "Notificações", icon: Bell, exact: false },
] as const;

export function AppShell({
  me,
  children,
}: {
  me: Profile;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [composeOpen, setComposeOpen] = useState(false);
  const [dismissedAnnouncementId, setDismissedAnnouncementId] = useState<string | null>(null);
  const unread = useQuery({
    queryKey: ["unread"],
    queryFn: () => unreadNotificationCount(),
    refetchInterval: 10000,
  });
  const lastUnread = useRef<number | null>(null);
  useEffect(() => {
    const count = unread.data ?? 0;
    if (lastUnread.current !== null && count > lastUnread.current && typeof window !== "undefined" && "Notification" in window) {
      const notify = () => { try { new Notification("Nyxoshi", { body: "Você tem uma nova notificação." }); } catch {} };
      if (Notification.permission === "granted") notify();
      else if (Notification.permission === "default") void Notification.requestPermission().then(p => { if (p === "granted") notify(); });
    }
    lastUnread.current = count;
  }, [unread.data]);
  const announcements = useQuery({queryKey:["global-announcements"],queryFn:()=>listActiveGlobalAnnouncements(),refetchInterval:5000});
  const suggestions = useQuery({
    queryKey: ["suggestions"],
    queryFn: () => suggestedPeople(),
  });

  return (
    <div className="night-wash min-h-dvh">{announcements.data?.[0] && announcements.data[0].id !== dismissedAnnouncementId ? <div className="fixed inset-x-4 top-4 z-[100] mx-auto max-w-lg rounded-2xl border border-fuchsia-400/30 bg-bg/95 p-4 shadow-2xl backdrop-blur"><button className="absolute right-2 top-2 rounded-full p-1 text-muted hover:bg-secondary hover:text-fg" onClick={()=>setDismissedAnnouncementId(announcements.data?.[0]?.id ?? null)} aria-label="Fechar comunicado"><X className="size-4"/></button><p className="text-xs font-semibold text-fuchsia-300">Nyxoshi · Equipe dos Fundadores</p><p className="mt-2 whitespace-pre-wrap pr-5 text-sm">{announcements.data[0].body}</p><p className="mt-2 text-[11px] text-muted">{new Date(announcements.data[0].created_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</p></div> : null}
      <div className="mx-auto grid min-h-dvh max-w-6xl grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[240px_minmax(0,640px)_280px]">
        <aside className="sticky top-0 hidden h-dvh flex-col justify-between border-r border-border px-4 py-5 md:flex">
          <div>
            <Logo />
            <nav className="mt-8 flex flex-col gap-1">
              {NAV.map((item) => {
                const active = item.exact
                  ? pathname === item.to
                  : pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "relative flex h-11 items-center gap-3 rounded-lg px-3 text-[15px] transition-colors",
                      active ? "bg-secondary text-fg" : "text-muted hover:bg-secondary hover:text-fg",
                    )}
                  >
                    <item.icon className="size-5" />
                    {item.label}
                    {item.to === "/notifications" && (unread.data ?? 0) > 0 ? (
                      <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-medium text-primary-foreground tabular-nums">
                        {unread.data}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
              <Link
                to="/u/$username"
                params={{ username: me.username }}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-lg px-3 text-[15px] transition-colors",
                  pathname.startsWith("/u/")
                    ? "bg-secondary text-fg"
                    : "text-muted hover:bg-secondary hover:text-fg",
                )}
              >
                <User className="size-5" />
                Perfil
              </Link>
              {me.role === "hardware_scientist" ? (
                <Link
                  to="/hardware-lab"
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-lg px-3 text-[15px] transition-colors",
                    pathname === "/hardware-lab" ? "bg-secondary text-fg" : "text-muted hover:bg-secondary hover:text-fg",
                  )}
                >
                  <span aria-hidden="true">🧪</span>
                  Laboratório da Maluca
                </Link>
              ) : null}
              {["founder","sub_founder","supreme_archmage","angel_girl"].includes(me.role) ? (
                <Link
                  to="/founders"
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-lg px-3 text-[15px] transition-colors",
                    pathname === "/founders" ? "bg-secondary text-fg" : "text-muted hover:bg-secondary hover:text-fg",
                  )}
                >
                  <ShieldCheck className="size-5" />
                  Fundadores
                </Link>
              ) : null}
              <Link
                to="/settings"
                className={cn(
                  "flex h-11 items-center gap-3 rounded-lg px-3 text-[15px] transition-colors",
                  pathname === "/settings"
                    ? "bg-secondary text-fg"
                    : "text-muted hover:bg-secondary hover:text-fg",
                )}
              >
                <Settings className="size-5" />
                Conta
              </Link>
            </nav>
            <Button className="mt-6 w-full nyx-glow" size="pill" onClick={() => setComposeOpen(true)}>
              <PenLine />
              Publicar
            </Button>
          </div>
          <AccountChip me={me} />
        </aside>

        <main className="min-w-0 border-border pb-[calc(5rem+env(safe-area-inset-bottom))] md:border-r md:pb-0">
          {children}
        </main>

        <aside className="sticky top-0 hidden h-dvh overflow-y-auto p-5 lg:block">
          <Link
            to="/search"
            className="nyx-panel flex h-11 items-center gap-2 rounded-full px-4 text-sm text-muted"
          >
            <Search className="size-4" />
            Buscar na noite
          </Link>
          {suggestions.data && suggestions.data.length > 0 ? (
            <section className="nyx-panel mt-5 rounded-2xl p-4">
              <h2 className="font-display text-lg tracking-tight">Quem seguir</h2>
              <ul className="mt-3 space-y-3">
                {suggestions.data.map((person) => (
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
                        className="size-9"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {person.displayName}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          @{person.username}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>

      <nav className="nyx-mobile-nav fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-[#09060fee] pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <TabLink to="/" icon={Home} label="Início" active={pathname === "/"} />
        <TabLink to="/search" icon={Compass} label="Explorar" active={pathname.startsWith("/search")} />
        <button type="button" onClick={() => setComposeOpen(true)} className="grid place-items-center py-2 text-fg">
          <span className="grid size-11 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-700 text-white shadow-[0_0_25px_#a855f755]"><PenLine className="size-5" /></span>
          <span className="sr-only">Publicar</span>
        </button>
        <TabLink to="/messages" icon={MessageCircle} label="Mensagens" active={pathname.startsWith("/messages")} />
        <TabLink to="/u/$username" params={{ username: me.username }} icon={User} label="Perfil" active={pathname.startsWith("/u/")} />
      </nav>

      <Sheet open={composeOpen} onOpenChange={setComposeOpen}>
        <SheetContent side="bottom" className="md:mx-auto md:max-w-xl">
          <SheetHeader>
            <SheetTitle>Nova publicação</SheetTitle>
          </SheetHeader>
          <Compose me={me} autoFocus onPosted={() => setComposeOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function TabLink({
  to,
  params,
  icon: Icon,
  label,
  active,
  badge,
}: {
  to: "/";
  params?: never;
  icon: typeof Home;
  label: string;
  active: boolean;
  badge?: number;
} | {
  to: "/search" | "/notifications" | "/messages";
  params?: never;
  icon: typeof Home;
  label: string;
  active: boolean;
  badge?: number;
} | {
  to: "/u/$username";
  params: { username: string };
  icon: typeof Home;
  label: string;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      to={to}
      params={params}
      className={cn(
        "relative grid place-items-center py-2",
        active ? "text-fg" : "text-muted",
      )}
    >
      <Icon className="size-5" />
      <span className="sr-only">{label}</span>
      {badge && badge > 0 ? (
        <span className="absolute top-1 right-[calc(50%-18px)] size-1.5 rounded-full bg-primary" />
      ) : null}
    </Link>
  );
}

function AccountChip({ me }: { me: Profile }) {
  const [signingOut, setSigningOut] = useState(false);
  const gateSession =
    typeof window !== "undefined" ? hasGateSessionMarker() : false;

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border p-2">
      <UserAvatar
        username={me.username}
        displayName={me.displayName}
        image={me.image}
        className="size-9"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{me.displayName}</p>
        <p className="truncate text-xs text-muted">@{me.username}</p>
      </div>
      {!gateSession ? (
        <Button
          variant="ghost"
          size="icon"
          className="size-9 text-muted"
          disabled={signingOut}
          onClick={() => {
            setSigningOut(true);
            void signOut("/").catch(() => setSigningOut(false));
          }}
        >
          <LogOut className="size-4" />
          <span className="sr-only">Sair</span>
        </Button>
      ) : (
        <MoonMark className="mr-1 size-4 text-muted" />
      )}
    </div>
  );
}
