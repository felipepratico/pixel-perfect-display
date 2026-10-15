import { createFileRoute } from "@tanstack/react-router";

import { AppHeader } from "@/components/fincontrol/app-header";
import { MonitoramentoTecnico, MOCK_CLIENTES } from "@/components/fincontrol/monitoramento-tecnico";
import { useClientes } from "@/lib/use-clientes";

export const Route = createFileRoute("/_authenticated/monitoramento")({
  head: () => ({
    meta: [
      { title: "Monitoramento Técnico — UPSYSTEM FINCONTROL" },
      {
        name: "description",
        content: "Relatório de backups atrasados e certificados digitais a vencer.",
      },
      { property: "og:title", content: "Monitoramento Técnico — UPSYSTEM FINCONTROL" },
      {
        property: "og:description",
        content: "Relatório de backups atrasados e certificados digitais a vencer.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MonitoramentoPage,
});

function MonitoramentoPage() {
  const { data: clientes } = useClientes();
  // Usa dados reais se disponíveis, senão usa mock data para visualização
  const fonte = clientes && clientes.length > 0 ? clientes : MOCK_CLIENTES;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="w-full space-y-6 px-3 py-6 sm:px-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold">Monitoramento Técnico</h1>
            <p className="text-sm text-muted-foreground">
              Backups atrasados e certificados digitais a vencer — dados em tempo real.
            </p>
          </div>
          {(!clientes || clientes.length === 0) && (
            <span className="rounded-full border border-yellow-500/30 bg-yellow-950/30 px-3 py-1 text-xs font-semibold text-yellow-400">
              Exibindo mock data — conecte clientes reais para ver dados ao vivo
            </span>
          )}
        </div>
        <MonitoramentoTecnico clientes={fonte} />
      </main>
    </div>
  );
}
