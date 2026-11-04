import { Clock, Globe, Receipt, Repeat, UserRound, Wallet } from "lucide-react";

import { useCountUp } from "@/hooks/use-count-up";
import { formatCurrency } from "@/lib/fincontrol";
import type { Totais } from "@/lib/totais";

export function KpiCards({
  totais,
  valoresVisiveis,
}: {
  totais: Totais;
  valoresVisiveis: boolean;
}) {
  const moeda = (valor: number) => (valoresVisiveis ? formatCurrency(valor) : "R$ ••••••");
  const pctFelipe =
    totais.mensalSite > 0 ? ((totais.lucroFelipe / totais.mensalSite) * 100).toFixed(1) : "0";
  const pagosPct = totais.quantidade > 0 ? (totais.pagos / totais.quantidade) * 100 : 0;

  // Count-up: reanima sempre que o valor muda (load ou troca de filtro)
  const animadoMensal = useCountUp(totais.mensalSite);
  const animadoFelipe = useCountUp(totais.lucroFelipe);
  const animadoFrancisco = useCountUp(totais.lucroFrancisco);
  const animadoCustos = useCountUp(totais.custoBltFra);
  const animadoMrr = useCountUp(totais.mrr);
  const animadoAssinaturas = useCountUp(totais.assinaturasAtivas);
  const animadoPagos = useCountUp(totais.pagos);
  const animadoQtd = useCountUp(totais.quantidade);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {/* 1. MENSAL SITE TOTAL */}
      <Card
        index={0}
        label="MENSAL SITE TOTAL"
        icon={<Globe className="size-3.5" />}
        iconClass="bg-sky-500/15 text-sky-700"
        value={moeda(animadoMensal)}
        hint={`${Math.round(totais.quantidade)} lançamentos`}
      />

      {/* 2. LUCRO FELIPE (LÍQUIDO) - Destaque Verde */}
      <Card
        index={1}
        label="LUCRO FELIPE (LÍQUIDO)"
        icon={<Wallet className="size-3.5" />}
        iconClass="bg-emerald-600 text-white font-bold"
        value={moeda(animadoFelipe)}
        valueClass="text-emerald-700"
        hint={valoresVisiveis ? `${pctFelipe}% do total` : "Percentual oculto"}
        hintClass="text-emerald-700 font-medium"
        className="border-emerald-500/40 bg-white shadow-sm"
      />

      {/* 3. LUCRO FRANCISCO - Roxo */}
      <Card
        index={2}
        label="LUCRO FRANCISCO"
        icon={<UserRound className="size-3.5" />}
        iconClass="bg-purple-500/15 text-purple-700"
        value={moeda(animadoFrancisco)}
        valueClass="text-purple-700"
        hint="Comissão repassada"
        className="border-purple-500/25 bg-white"
      />

      {/* 4. CUSTOS (BLT X FRA) - Âmbar */}
      <Card
        index={3}
        label="CUSTOS (BLT X FRA)"
        icon={<Receipt className="size-3.5" />}
        iconClass="bg-amber-500/15 text-amber-700"
        value={moeda(animadoCustos)}
        hint={
          valoresVisiveis ? `Boletos: ${formatCurrency(totais.custoBoleto)}` : "Boletos: R$ ••••••"
        }
        className="border-amber-500/25 bg-white"
      />

      {/* 5. MRR (ASSINATURAS) - Roxo */}
      <Card
        index={4}
        label="MRR (ASSINATURAS)"
        icon={<Repeat className="size-3.5" />}
        iconClass="bg-purple-500/15 text-purple-700"
        value={`${Math.round(animadoAssinaturas)} ativas`}
        valueClass="text-purple-700"
        hint={`${moeda(animadoMrr)} /mês`}
        hintClass="text-purple-700 font-medium"
        className="border-purple-500/25 bg-white"
      />

      {/* 6. SITUAÇÃO PAGAMENTOS */}
      <div
        className="card-panel flex flex-col justify-between p-3.5 bg-white animate-card-in transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-lg hover:border-sky-500/50 active:scale-95"
        style={{ animationDelay: "300ms" }}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
            SITUAÇÃO PAGAMENTOS
          </p>
          <div className="rounded-lg bg-sky-500/15 p-1.5 text-sky-700">
            <Clock className="size-3.5" />
          </div>
        </div>
        <div className="my-1.5">
          <h3 className="text-lg font-black tracking-tight text-foreground">
            {Math.round(animadoPagos)} / {Math.round(animadoQtd)} pagos
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
  index = 0,
  label,
  icon,
  iconClass,
  value,
  valueClass,
  hint,
  hintClass,
  className,
}: {
  index?: number;
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
    <div
      className={`card-panel flex flex-col justify-between p-3.5 bg-white animate-card-in transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-lg hover:ring-1 hover:ring-current/20 active:scale-95 ${className ?? ""}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
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
