import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — UPSYSTEM FINCONTROL" },
    ],
  }),
  component: Configuracoes,
});

function Configuracoes() {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="card-panel border border-slate-200">
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
          <h1 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-900">
            <Settings className="size-4 text-slate-500" />
            Configurações
          </h1>
        </div>
        <div className="p-6">
          <p className="text-sm text-slate-500">
            Em breve: preferências do sistema, notificações e integrações.
          </p>
        </div>
      </div>
    </div>
  );
}
