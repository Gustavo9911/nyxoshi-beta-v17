import { useEffect, useState, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { Landing } from "@/components/landing";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useMe } from "@/hooks/use-me";

const AUTH_BOOT_TIMEOUT_MS = 8_000;

export function SignedShell({ children, guest = "redirect" }: { children: ReactNode; guest?: "redirect" | "landing" }) {
  const { sessionPending, sessionError, user, me, meLoading, meError, retryMe } = useMe();
  const [bootTimedOut, setBootTimedOut] = useState(false);

  useEffect(() => {
    if (!sessionPending && !meLoading) { setBootTimedOut(false); return; }
    const timer = window.setTimeout(() => setBootTimedOut(true), AUTH_BOOT_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [sessionPending, meLoading]);

  if (sessionError) return <ErrorShell title="A sessão não respondeu" message="Não foi possível verificar sua sessão. Recarregue a página ou entre novamente." action="Recarregar" onAction={() => window.location.reload()} />;
  if (sessionPending || meLoading) {
    if (bootTimedOut) return <ErrorShell title="A noite demorou demais para abrir" message="A autenticação ou o perfil não respondeu em 8 segundos. Sua conta não foi alterada." action="Tentar novamente" onAction={() => window.location.reload()} secondary={{ label: "Entrar novamente", href: "/login" }} />;
    return <div className="night-wash grid min-h-dvh place-items-center px-5"><div className="text-center" role="status" aria-live="polite"><Logo className="justify-center" /><div className="nyx-loading-mark mx-auto mt-6" aria-hidden="true">☾</div><p className="mt-4 text-sm text-muted">Abrindo a noite…</p><div className="mx-auto mt-4 h-1 w-32 overflow-hidden rounded-full bg-white/5"><span className="nyx-loading-bar block h-full w-1/2 rounded-full bg-primary" /></div></div></div>;
  }
  if (!user) return guest === "landing" ? <Landing /> : <RedirectToSignIn />;
  if (!me || meError) return <ErrorShell title="Não foi possível carregar o perfil" message="O login está ativo, mas os dados do seu perfil não responderam corretamente." action="Tentar novamente" onAction={() => void retryMe()} secondary={{ label: "Abrir login", href: "/login" }} />;
  return <AppShell me={me}>{children}</AppShell>;
}

function ErrorShell({ title, message, action, onAction, secondary }: { title: string; message: string; action: string; onAction: () => void; secondary?: { label: string; href: string } }) {
  return <div className="night-wash grid min-h-dvh place-items-center px-5"><div className="nyx-panel w-full max-w-md rounded-3xl p-6 text-center"><Logo className="justify-center" /><div className="nyx-loading-mark mx-auto mt-6" aria-hidden="true">☾</div><h1 className="mt-6 font-display text-2xl">{title}</h1><p className="mt-2 text-sm text-muted">{message}</p><div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center"><Button onClick={onAction}>{action}</Button>{secondary ? <Button asChild variant="outline"><a href={secondary.href}>{secondary.label}</a></Button> : null}</div></div></div>;
}
