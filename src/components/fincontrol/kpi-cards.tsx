import { ChartPie, Globe, Receipt, Repeat, UserRoundCog, Wallet } from "lucide-react";

import { formatCurrency } from "@/lib/fincontrol";
import type { Totais } from "@/lib/totais";

export function KpiCards({ totais, valoresVisiveis }: { totais: Totais; valoresVisiveis: boolean }) {
  const moeda = (valor: number) => (valoresVisiveis ? formatCurrency(valor) : "R$ ••••••");
  const pctFelipe =
    totais.mensalSite > 0 ? ((totais.lucroFelipe / totais.mensalSite) * 100).toFixed(1) : "0";
  const pagosPct = totais.quantidade > 0 ? (totais.pagos / totais.quantidade) * 100 : 0;

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-6">
      <Card
        label="Mensal site total"
        icon={<Globe className="size-4" />}
        iconClass="bg-info-soft text-info"
        value={moeda(totais.mensalSite)}
        hint={`${totais.quantidade} lançamentos`}
      />
      <Card
        label="Lucro Felipe (líquido)"
        icon={<Wallet className="size-4" />}
        iconClass="bg-brand text-brand-foreground"
        value={moeda(totais.lucroFelipe)}
        valueClass="text-brand"
        hint={valoresVisiveis ? `${pctFelipe}% do total` : "Percentual oculto"}
        hintClass="text-brand"
        className="border-brand-border bg-brand-soft/40"
      />
      <Card
        label="Lucro Francisco"
        icon={<UserRoundCog className="size-4" />}
        iconClass="bg-partner-soft text-partner"
        value={moeda(totais.lucroFrancisco)}
        valueClass="text-partner"
        hint="Comissão repassada"
        className="border-partner-border"
      />
      <Card
        label="Custos (Blt x Fra)"
        icon={<Receipt className="size-4" />}
        iconClass="bg-warning-soft text-warning"
        value={moeda(totais.custoBltFra)}
        hint={valoresVisiveis ? `Boletos: ${formatCurrency(totais.custoBoleto)}` : "Boletos: R$ ••••••"}
      />
      <Card
        label="MRR (assinaturas)"
        icon={<Repeat className="size-4" />}
        iconClass="bg-partner-soft text-partner"
        value={`${totais.assinaturasAtivas} ativas`}
        valueClass="text-partner"
        hint={`${moeda(totais.mrr)} /mês`}
        hintClass="text-partner font-semibold"
        className="border-partner-border"
      />
      <div className="card-panel p-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Situação pagamentos
          </p>
          <div className="rounded-xl bg-info-soft p-2 text-info">
            <ChartPie className="size-4" />
          </div>
        </div>
        <h3 className="mt-2 text-xl font-extrabold">
          {totais.pagos} / {totais.quantidade} pagos
        </h3>
        <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-brand transition-all" style={{ width: `${pagosPct}%` }} />
          <div className="h-full bg-warning transition-all" style={{ width: `${100 - pagosPct}%` }} />
        </div>
      </div>
    </div>
  );
}

function Card({
  label,
  icon,
  iconClass,
  value,
  valueClass,
  hint,
  hintClass,
  className,
}: {
  label: string;
  icon: React.ReactNode;
  iconClass: string;
  value: string;
  valueClass?: string;
  hint: string;
  hintClass?: string;
  className?: string;
}) {
  return (
    <div className={`card-panel p-4 ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <div className={`rounded-xl p-2 ${iconClass}`}>{icon}</div>
      </div>
      <h3 className={`mt-2 text-xl font-extrabold ${valueClass ?? ""}`}>{value}</h3>
      <p className={`mt-1 text-xs text-muted-foreground ${hintClass ?? ""}`}>{hint}</p>
    </div>
  );
}
