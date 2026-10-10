import { Clock, Globe, Receipt, Repeat, UserRound, Wallet } from "lucide-react";

import { formatCurrency } from "@/lib/fincontrol";
import type { Totais } from "@/lib/totais";

export function KpiCards({ totais, valoresVisiveis }: { totais: Totais; valoresVisiveis: boolean }) {
  const moeda = (valor: number) => (valoresVisiveis ? formatCurrency(valor) : "R$ ••••••");
  const pctFelipe =
    totais.mensalSite > 0 ? ((totais.lucroFelipe / totais.mensalSite) * 100).toFixed(1) : "0";
  const pagosPct = totais.quantidade > 0 ? (totais.pagos / totais.quantidade) * 100 : 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {/* 1. MENSAL SITE TOTAL */}
      <Card
        label="MENSAL SITE TOTAL"
        icon={<Globe className="size-3.5" />}
        iconClass="bg-sky-500/15 text-sky-400"
        value={moeda(totais.mensalSite)}
        hint={`${totais.quantidade} lançamentos`}
      />

      {/* 2. LUCRO FELIPE (LÍQUIDO) - Destaque Verde */}
      <Card
        label="LUCRO FELIPE (LÍQUIDO)"
        icon={<Wallet className="size-3.5" />}
        iconClass="bg-emerald-500 text-black font-bold"
        value={moeda(totais.lucroFelipe)}
        valueClass="text-emerald-400"
        hint={valoresVisiveis ? `${pctFelipe}% do total` : "Percentual oculto"}
        hintClass="text-emerald-400/90 font-medium"
        className="border-emerald-500/35 bg-emerald-950/25 shadow-sm shadow-emerald-950/30"
      />

      {/* 3. LUCRO FRANCISCO - Roxo */}
      <Card
        label="LUCRO FRANCISCO"
        icon={<UserRound className="size-3.5" />}
        iconClass="bg-purple-500/20 text-purple-400"
        value={moeda(totais.lucroFrancisco)}
        valueClass="text-purple-400"
        hint="Comissão repassada"
        className="border-purple-500/20 bg-card/70"
      />

      {/* 4. CUSTOS (BLT X FRA) - Âmbar */}
      <Card
        label="CUSTOS (BLT X FRA)"
        icon={<Receipt className="size-3.5" />}
        iconClass="bg-amber-500/20 text-amber-400"
        value={moeda(totais.custoBltFra)}
        hint={valoresVisiveis ? `Boletos: ${formatCurrency(totais.custoBoleto)}` : "Boletos: R$ ••••••"}
        className="border-amber-500/20 bg-card/70"
      />

      {/* 5. MRR (ASSINATURAS) - Roxo */}
      <Card
        label="MRR (ASSINATURAS)"
        icon={<Repeat className="size-3.5" />}
        iconClass="bg-purple-500/20 text-purple-400"
        value={`${totais.assinaturasAtivas} ativas`}
        valueClass="text-purple-400"
        hint={`${moeda(totais.mrr)} /mês`}
        hintClass="text-purple-400/80 font-medium"
        className="border-purple-500/20 bg-card/70"
      />

      {/* 6. SITUAÇÃO PAGAMENTOS */}
      <div className="card-panel flex flex-col justify-between p-3.5 bg-card/70">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
            SITUAÇÃO PAGAMENTOS
          </p>
          <div className="rounded-lg bg-sky-500/20 p-1.5 text-sky-400">
            <Clock className="size-3.5" />
          </div>
        </div>
        <div className="my-1.5">
          <h3 className="text-lg font-black tracking-tight text-foreground">
            {totais.pagos} / {totais.quantidade} pagos
          </h3>
        </div>
        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${pagosPct}%` }}
            title={`${totais.pagos} pagos`}
          />
          <div
            className="h-full bg-amber-500 transition-all"
            style={{ width: `${100 - pagosPct}%` }}
            title={`${totais.abertos} abertos`}
          />
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
    <div className={`card-panel flex flex-col justify-between p-3.5 bg-card/70 ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
          {label}
        </p>
        <div className={`rounded-lg p-1.5 ${iconClass}`}>{icon}</div>
      </div>
      <div className="my-1.5">
        <h3 className={`text-lg font-black tracking-tight text-foreground ${valueClass ?? ""}`}>
          {value}
        </h3>
      </div>
      <p className={`text-[11px] text-muted-foreground/75 truncate ${hintClass ?? ""}`}>{hint}</p>
    </div>
  );
}
