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
  color: "emerald" | "amber" | "destructive" | "blue";
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
      sublabel: "perfil vermelho",
      icon: Users,
      color: "destructive",
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-3">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="rounded-md border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <kpi.icon className="size-4" />
            {kpi.label}
          </div>
          <p className="text-2xl font-extrabold">
            {typeof kpi.value === "number"
              ? kpi.label === "Clientes inadimplentes"
                ? String(kpi.value)
                : formatCurrency(kpi.value)
              : kpi.value}
          </p>
          <p className="text-xs text-muted-foreground">{kpi.sublabel}</p>
        </div>
      ))}
    </section>
  );
}
