import { Clock, CreditCard, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/fincontrol";
import { metricasAdimplencia, type PerfilPagamento } from "@/lib/adimplencia";
import { valorContrato, type Cliente } from "@/lib/clientes";
import type { Titulo } from "@/lib/fincontrol";

type AdimplenciaKPI = {
  label: string;
  value: string | number;
  sublabel: string;
  icon: React.ElementType;
  color: "slate" | "emerald" | "amber" | "rose";
};

export function CardAdimplencia({
  titulos,
  clientes,
  valoresVisiveis,
}: {
  titulos: Titulo[];
  clientes: Cliente[];
  valoresVisiveis: boolean;
}) {
  const m = metricasAdimplencia(titulos, clientes);
  const mediaAtraso = m.mediaAtrasoGeral.toFixed(1);
  const taxaPontualidade = (m.taxaPontualidadeGeral * 100).toFixed(0);

  const kpis: AdimplenciaKPI[] = [
    {
      label: "Taxa de pontualidade",
      value: `${taxaPontualidade}%`,
      sublabel: "títulos em dia (não vencidos)",
      icon: CreditCard,
      color: "emerald",
    },
    {
      label: "Média de atraso",
      value: `${mediaAtraso} dias`,
      sublabel: "por título vencido em aberto",
      icon: Clock,
      color: m.mediaAtrasoGeral <= 5 ? "emerald" : "amber",
    },
    {
      label: "Clientes inadimplentes",
      value: m.inadimplentes,
      sublabel: "perfil em atraso",
      icon: Users,
      color: "rose",
    },
  ];

  const COLOR_MAP: Record<AdimplenciaKPI["color"], { bg: string; text: string; border: string; dot: string }> = {
    slate: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200", dot: "bg-slate-500" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-600" },
    amber: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500" },
    rose: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", dot: "bg-rose-500" },
  };

  return (
    <section className="grid gap-3 sm:grid-cols-3">
      {kpis.map((kpi) => {
        const { bg, text, border, dot } = COLOR_MAP[kpi.color];
        return (
          <div key={kpi.label} className={`card-panel p-4 border ${border}`}>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
              <div className={`size-4 rounded-full ${dot}`} />
              {kpi.label}
            </div>
            <p className={`text-2xl font-black tracking-tight text-slate-900 tabular-nums`}>
              {typeof kpi.value === "number"
                ? kpi.label === "Clientes inadimplentes"
                  ? String(kpi.value)
                  : formatCurrency(kpi.value)
                : kpi.value}
            </p>
            <p className="text-xs text-slate-500">{kpi.sublabel}</p>
          </div>
        );
      })}
    </section>
  );
}
