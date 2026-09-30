import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CloudCheck, FileSpreadsheet, Repeat, ShieldCheck, Wallet } from "lucide-react";
import { useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FinControl Cloud — Contas a receber e assinaturas" },
      {
        name: "description",
        content:
          "Controle mensalidades de site, assinaturas recorrentes, lucros e cobranças em um painel único salvo na nuvem.",
      },
      { property: "og:title", content: "FinControl Cloud — Contas a receber e assinaturas" },
      {
        property: "og:description",
        content:
          "Controle mensalidades de site, assinaturas recorrentes, lucros e cobranças em um painel único salvo na nuvem.",
      },
    ],
  }),
  component: Index,
});

const features = [
  {
    icon: Wallet,
    title: "Divisão de lucros automática",
    text: "Mensal site, custo do boleto, comissão do Francisco e o lucro líquido calculados linha por linha.",
  },
  {
    icon: Repeat,
    title: "Assinaturas recorrentes",
    text: "Ative, cancele e gere as mensalidades dos próximos meses em poucos cliques.",
  },
  {
    icon: FileSpreadsheet,
    title: "Excel de entrada e saída",
    text: "Importe sua planilha de contas a receber e exporte o painel filtrado quando quiser.",
  },
  {
    icon: ShieldCheck,
    title: "Só você vê seus dados",
    text: "Cada conta acessa apenas os próprios lançamentos, de qualquer computador ou celular.",
  },
];

function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) void navigate({ to: "/painel", replace: true });
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-shell text-shell-foreground">
      <header className="border-b border-shell-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-brand p-2.5 text-brand-foreground shadow-md">
              <CloudCheck className="size-5" />
            </div>
            <div>
              <p className="text-base font-extrabold leading-tight">FinControl Cloud</p>
              <p className="text-xs font-medium text-brand">Contas a receber & assinaturas</p>
            </div>
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link to="/auth">Entrar</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-16">
        <span className="inline-flex rounded-full border border-brand-border/40 bg-brand/15 px-3 py-1 text-xs font-bold text-brand">
          Versão nuvem
        </span>
        <h1 className="mt-5 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          Seu controle de mensalidades e assinaturas, agora salvo na nuvem.
        </h1>
        <p className="mt-4 max-w-xl text-sm text-shell-muted sm:text-base">
          O mesmo painel da sua planilha, com cálculo de lucros, cobrança por WhatsApp, gráficos e
          geração de mensalidades — acessível de qualquer lugar com a sua conta.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Acessar meu painel</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth">Criar conta</Link>
          </Button>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2">
          {features.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="rounded-2xl border border-shell-border bg-white/5 p-5 backdrop-blur"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-brand/15 text-brand">
                <Icon className="size-5" />
              </div>
              <h2 className="mt-3 text-sm font-bold">{title}</h2>
              <p className="mt-1 text-xs leading-relaxed text-shell-muted">{text}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
