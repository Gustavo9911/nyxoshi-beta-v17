import { useState } from "react";
import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import {
  SOCIAL_PROVIDERS,
  authClient,
  authEnabled,
  socialAuthEnabled,
  signIn,
} from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();

  if (!isPending && user) {
    return <Navigate to="/" />;
  }

  return (
    <div className="night-wash starfield grid min-h-dvh place-items-center px-5 py-10">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6">
        <Logo />
        <h1 className="mt-6 font-display text-3xl tracking-tight">
          Entre na noite.
        </h1>
        <p className="mt-2 text-sm text-muted">
          Uma conta. Seu nome. Sem palco emprestado.
        </p>

        {authEnabled ? (
          <Tabs defaultValue="entrar" className="mt-6">
            <TabsList>
              <TabsTrigger value="entrar">Entrar</TabsTrigger>
              <TabsTrigger value="criar">Criar conta</TabsTrigger>
            </TabsList>
            <TabsContent value="entrar" className="pt-5">
              <EmailForm mode="signin" />
            </TabsContent>
            <TabsContent value="criar" className="pt-5">
              <EmailForm mode="signup" />
            </TabsContent>
          </Tabs>
        ) : (
          <p className="mt-6 text-sm text-muted">O acesso está desligado.</p>
        )}

        {authEnabled && socialAuthEnabled ? (
          <>
            <div className="my-5 flex items-center gap-3 text-xs tracking-wide text-subtle uppercase">
              <span className="h-px flex-1 bg-border" />
              ou
              <span className="h-px flex-1 bg-border" />
            </div>
            <div className="flex flex-col gap-2">
              {SOCIAL_PROVIDERS.map((p) => (
                <Button
                  key={p.providerId}
                  type="button"
                  variant="outline"
                  onClick={() => signIn(p.providerId, { callbackURL: "/" })}
                >
                  Continuar com {p.label}
                </Button>
              ))}
            </div>
          </>
        ) : null}

        <p className="mt-6 text-center text-sm text-muted">
          <Link to="/" className="hover:text-fg">
            Voltar
          </Link>
        </p>
      </div>
    </div>
  );
}

function EmailForm({ mode }: { mode: "signin" | "signup" }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "signup") {
        const { error: err } = await authClient.signUp.email({
          email,
          password,
          name: name.trim() || email.split("@")[0] || "Nyx",
        });
        if (err) throw new Error(err.message || "Não foi possível criar a conta.");
      } else {
        const { error: err } = await authClient.signIn.email({ email, password });
        if (err) throw new Error(err.message || "E-mail ou senha inválidos.");
      }
      await authClient.getSession();
      navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo deu errado.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-3">
      {mode === "signup" ? (
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
        </div>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor={`${mode}-email`}>E-mail</Label>
        <Input
          id={`${mode}-email`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${mode}-password`}>Senha</Label>
        <Input
          id={`${mode}-password`}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          minLength={8}
          required
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={busy}>
        {mode === "signup" ? "Criar conta" : "Entrar"}
      </Button>
    </form>
  );
}
