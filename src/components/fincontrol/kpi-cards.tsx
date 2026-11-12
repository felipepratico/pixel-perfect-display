import { AlertTriangle, Clock, MessageCircle, Wallet, Globe } from "lucide-react";

import { useCountUp } from "@/hooks/use-count-up";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/fincontrol";
import type { Totais } from "@/lib/totais";

export function KpiCards({
  totais,
  valoresVisiveis,
  onCobrarVencidos,
}: {
  totais: Totais;
  valoresVisiveis: boolean;
  onCobrarVencidos?: () => void;
}) {
  const moeda = (valor: number) => (valoresVisiveis ? formatCurrency(valor) : "R$ ••••••");
  const pctFelipe =
    totais.mensalSite > 0 ? ((totais.lucroFelipe / totais.mensalSite) * 100).toFixed(1) : "0";
  const pagosPct = totais.quantidade > 0 ? (totais.pagos / totais.quantidade) * 100 : 0;
  const taxaInadimplencia =
    totais.quantidade > 0 ? ((totais.vencidos / totais.quantidade) * 100).toFixed(1) : "0.0";

  // Count-up: reanima sempre que o valor muda (load ou troca de filtro)
  const animadoMensal = useCountUp(totais.mensalSite);
  const animadoFelipe = useCountUp(totais.lucroFelipe);
  const animadoFrancisco = useCountUp(totais.lucroFrancisco);
  const animadoPagos = useCountUp(totais.pagos);
  const animadoQtd = useCountUp(totais.quantidade);
  const animadoTaxa = useCountUp(Number(taxaInadimplencia));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {/* 1. MENSAL TOTAL */}
      <Card
        index={0}
        label="MENSAL TOTAL"
        icon={<Globe className="size-3.5" />}
        iconClass="bg-sky-500/15 text-sky-700"
        value={moeda(animadoMensal)}
        valueClass="text-sky-700"
        hint={`${Math.round(totais.quantidade)} lançamentos`}
      />

      {/* 2. LUCRO FELIPE (LÍQUIDO) */}
      <Card
        index={1}
        label="LUCRO FELIPE (LÍQUIDO)"
        icon={<Wallet className="size-3.5" />}
        iconClass="bg-emerald-600 text-white font-bold"
        value={moeda(animadoFelipe)}
        valueClass="text-emerald-700 font-black"
        hint={valoresVisiveis ? `${pctFelipe}% do faturamento` : "Percentual oculto"}
        hintClass="text-emerald-700 font-medium"
        className="border-emerald-500/40 bg-white shadow-sm"
      />

      {/* 3. LUCRO FRANCISCO */}
      <Card
        index={2}
        label="LUCRO FRANCISCO"
        icon={<Wallet className="size-3.5" />}
        iconClass="bg-purple-500/15 text-purple-700"
        value={moeda(animadoFrancisco)}
        valueClass="text-purple-700 font-black"
        hint="Comissão repassada"
        className="border-purple-500/25 bg-white"
      />

      {/* 4. RECEBIDO X EM ABERTO */}
      <div
        className={`card-panel flex flex-col justify-between p-3.5 bg-white animate-card-in transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-lg hover:border-sky-500/50 active:scale-95 ${
          pagosPct >= 80 ? "border-emerald-500/40" : pagosPct >= 50 ? "border-amber-500/40" : "border-destructive/40"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
            RECEBIDO X EM ABERTO
          </p>
          <div className="rounded-lg bg-sky-500/15 p-1.5 text-sky-700">
            <Clock className="size-3.5" />
          </div>
        </div>
        <div className="my-1.5">
          <h3 className="text-lg font-black tracking-tight text-foreground">
            {moeda(totais.mensalSite)}
          </h3>
        </div>
        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted/60 mb-2">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${pagosPct}%` }}
            title={`${totais.pagos} pagos · ${formatCurrency(totais.mensalSite * (pagosPct / 100))}`}
          />
          <div
            className="h-full bg-amber-500 transition-all duration-500"
            style={{ width: `${100 - pagosPct}%` }}
            title={`${totais.abertos} abertos · ${formatCurrency(totais.mensalSite * ((100 - pagosPct) / 100))}`}
          />
        </div>
        <p className="text-[11px] text-muted-foreground/75 truncate">
          {Math.round(animadoPagos)} pagos · {Math.round(animadoQtd - animadoPagos)} abertos
        </p>
      </div>

      {/* 5. INADIMPLÊNCIA */}
      <div
        className={`card-panel flex flex-col justify-between p-3.5 bg-white animate-card-in transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-lg hover:border-destructive/40 active:scale-95`}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
            INADIMPLÊNCIA
          </p>
          <div className="rounded-lg bg-destructive/10 p-1.5 text-destructive">
            <AlertTriangle className="size-3.5" />
          </div>
        </div>
        <div className="my-1.5">
          <h3 className="text-lg font-black tracking-tight text-destructive">
            {animadoTaxa.toFixed(1)}%
          </h3>
        </div>
        <p className="text-[11px] text-muted-foreground/75 truncate">
          {totais.vencidos} vencidos em {formatCurrency(totais.valorVencido)} · {totais.abertos}{" "}
          em aberto
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!totais.vencidos}
          onClick={onCobrarVencidos}
          className="mt-1.5 h-6 w-full gap-1 border-emerald-600/40 bg-white px-2 text-[10px] font-bold text-emerald-700 transition-all hover:bg-emerald-50 active:scale-95"
        >
          <MessageCircle className="size-3" />
          Enviar lembrete
        </Button>
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
