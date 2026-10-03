import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CloudCheck, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Up System FinControl" },
      {
        name: "description",
        content: "Acesse o painel de contas a receber e assinaturas do Up System FinControl.",
      },
      { property: "og:title", content: "Entrar — Up System FinControld" },
      {
        property: "og:description",
        content: "Acesse o painel de contas a receber e assinaturas do Up System FinControl.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) void navigate({ to: "/painel", replace: true });
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) {
          setCheckEmail(true);
          return;
        }
        await navigate({ to: "/painel", replace: true });
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await navigate({ to: "/painel", replace: true });
    } catch (error) {
      toast.error(
        error instanceof Error ? traduzErro(error.message) : "Não foi possível continuar.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setLoading(false);
      toast.error("Não foi possível entrar com o Google.");
      return;
    }
    if (result.redirected) return;
    await navigate({ to: "/painel", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-shell text-shell-foreground">
      <header className="border-b border-shell-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="rounded-2xl bg-brand p-2.5 text-brand-foreground shadow-md">
              <CloudCheck className="size-5" />
            </div>
            <span className="text-base font-extrabold">FinControl Cloud</span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-3xl bg-card p-6 text-card-foreground shadow-2xl">
          {checkEmail ? (
            <div className="space-y-3 text-center">
              <h1 className="text-lg font-bold">Confirme seu e-mail</h1>
              <p className="text-sm text-muted-foreground">
                Enviamos um link de confirmação para <strong>{email}</strong>. Depois de confirmar,
                volte aqui e entre com sua senha.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setCheckEmail(false);
                  setMode("login");
                }}
              >
                Voltar para o login
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-extrabold">
                {mode === "login" ? "Entrar no painel" : "Criar sua conta"}
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Seus lançamentos ficam salvos na nuvem e só você tem acesso.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@empresa.com.br"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                  {mode === "login" ? "Entrar" : "Criar conta"}
                </Button>
              </form>

              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                ou
                <span className="h-px flex-1 bg-border" />
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogle}
                disabled={loading}
              >
                Continuar com o Google
              </Button>

              <p className="mt-6 text-center text-xs text-muted-foreground">
                {mode === "login" ? "Ainda não tem conta?" : "Já tem uma conta?"}{" "}
                <button
                  type="button"
                  className="font-bold text-primary hover:underline"
                  onClick={() => setMode(mode === "login" ? "signup" : "login")}
                >
                  {mode === "login" ? "Criar agora" : "Entrar"}
                </button>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function traduzErro(message: string): string {
  if (/invalid login credentials/i.test(message)) return "E-mail ou senha incorretos.";
  if (/already registered/i.test(message)) return "Este e-mail já tem conta. Faça login.";
  if (/email not confirmed/i.test(message)) return "Confirme seu e-mail antes de entrar.";
  if (/password should be at least/i.test(message)) return "A senha precisa ter 6+ caracteres.";
  return message;
}
