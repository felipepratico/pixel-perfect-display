import { createFileRoute } from "@tanstack/react-router";
import { CloudCheck } from "lucide-react";

import { AppHeader } from "@/components/fincontrol/app-header";

export const Route = createFileRoute("/_authenticated/cobrancas-efi")({
  head: () => ({
    meta: [
      { title: "Cobranças Efí — FinControl Cloud" },
      { name: "description", content: "Acompanhamento das cobranças recorrentes emitidas pelo Efí Bank." },
      { property: "og:title", content: "Cobranças Efí — FinControl Cloud" },
      { property: "og:description", content: "Acompanhamento das cobranças recorrentes emitidas pelo Efí Bank." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CobrancasEfi,
});

function CobrancasEfi() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center gap-3 border-b pb-5">
          <span className="rounded-md bg-brand-soft p-2 text-brand"><CloudCheck className="size-5" /></span>
          <div>
            <h1 className="text-2xl font-bold">Cobranças Efí</h1>
            <p className="text-sm text-muted-foreground">Emissão recorrente em homologação será disponibilizada após a validação das credenciais.</p>
          </div>
        </div>
      </main>
    </div>
  );
}