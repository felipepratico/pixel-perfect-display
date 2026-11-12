import { AlertTriangle, Clock, MessageCircle, Wallet } from "lucide-react";

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
      <div
        className={`card-panel flex flex-col justify-between p-3.5 bg-white animate-card-in transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-sm hover:border-slate-300 active:scale-95`}
        style={{ animationDelay: "60ms" }}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            MENSAL TOTAL
          </p>
          <div className="rounded-lg bg-slate-100 p-1.5 text-slate-700">
            <Wallet className="size-3.5" />
          </div>
        </div>
        <div className="my-1.5">
          <h3 className={`text-lg font-black tracking-tight text-slate-900 tabular-nums`}>
            {moeda(animadoMensal)}
          </h3>
        </div>
        <p className="text-[11px] text-slate-500/75 truncate">
          {Math.round(animadoQtd)} lançamento(s)
        </p>
      </div>

      {/* 2. LUCRO FELIPE (LÍQUIDO) */}
      <div
        className={`card-panel flex flex-col justify-between p-3.5 bg-white animate-card-in transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-sm hover:border-slate-300 active:scale-95 border-slate-200`}
        style={{ animationDelay: "120ms" }}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            LUCRO FELIPE (LÍQUIDO)
          </p>
          <div className="rounded-lg bg-slate-100 p-1.5 text-slate-700">
            <Wallet className="size-3.5" />
          </div>
        </div>
        <div className="my-1.5">
          <h3 className={`text-lg font-black tracking-tight text-slate-900 tabular-nums`}>
            {moeda(animadoFelipe)}
          </h3>
        </div>
        <p className={`text-[11px] text-slate-500/75 truncate`}>
          {Math.round((totais.lucroFelipe / totais.mensalSite) * 100) ||
            0}% do faturamento
        </p>
      </div>

      {/* 3. LUCRO FRANCISCO */}
      <div
        className={`card-panel flex flex-col justify-between p-3.5 bg-white animate-card-in transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-sm hover:border-slate-300 active:scale-95`}
        style={{ animationDelay: "180ms" }}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            LUCRO FRANCISCO
          </p>
          <div className="rounded-lg bg-slate-100 p-1.5 text-slate-700">
            <Wallet className="size-3.5" />
          </div>
        </div>
        <div className="my-1.5">
          <h3 className={`text-lg font-black tracking-tight text-slate-900 tabular-nums`}>
            {moeda(animadoFrancisco)}
          </h3>
        </div>
        <p className="text-[11px] text-slate-500/75 truncate">Comissão repassada</p>
      </div>

      {/* 4. RECEBIDO X EM ABERTO */}
      <div
        className={`card-panel flex flex-col justify-between p-3.5 bg-white animate-card-in transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-sm hover:border-slate-300 active:scale-95 border-slate-200`}
        style={{ animationDelay: "240ms" }}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            RECEBIDO X EM ABERTO
          </p>
          <div className="rounded-lg bg-slate-100 p-1.5 text-slate-700">
            <Clock className="size-3.5" />
          </div>
        </div>
        <div className="my-1.5">
          <h3 className={`text-lg font-black tracking-tight text-slate-900 tabular-nums`}>
            {moeda(totais.mensalSite)}
          </h3>
        </div>
        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-200 mb-2">
          <div
            className="h-full bg-slate-800 transition-all duration-500"
            style={{ width: `${pagosPct}%` }}
            title={`${totais.pagos} pagos · ${formatCurrency(totais.mensalSite * (pagosPct / 100))}`}
          />
          <div
            className="h-full bg-slate-400/40 transition-all duration-500"
            style={{ width: `${100 - pagosPct}%` }}
            title={`${totais.abertos} abertos · ${formatCurrency(totais.mensalSite * ((100 - pagosPct) / 100))}`}
          />
        </div>
        <p className="text-[11px] text-slate-500/75 truncate">
          {Math.round(animadoPagos)} pagos · {Math.round(animadoQtd - animadoPagos)} abertos
        </p>
      </div>

      {/* 5. INADIMPLÊNCIA */}
      <div
        className={`card-panel flex flex-col justify-between p-3.5 bg-white animate-card-in transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-sm hover:border-slate-300 active:scale-95 border-slate-200`}
        style={{ animationDelay: "300ms" }}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            INADIMPLÊNCIA
          </p>
          <div className="rounded-lg bg-slate-100 p-1.5 text-slate-700">
            <AlertTriangle className="size-3.5" />
          </div>
        </div>
        <div className="my-1.5">
          <h3 className={`text-lg font-black tracking-tight text-slate-900`}>
            {animadoTaxa.toFixed(1)}%
          </h3>
        </div>
        <p className="text-[11px] text-slate-500/75 truncate">
          {totais.vencidos} vencidos em {formatCurrency(totais.valorVencido)} · {totais.abertos}{" "}
          em aberto
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!totais.vencidos}
          onClick={onCobrarVencidos}
          className="mt-1.5 h-6 w-full gap-1 border border-slate-300 bg-white px-2 text-[10px] font-bold text-slate-700 transition-all hover:bg-slate-50 active:scale-95"
        >
          <MessageCircle className="size-3" />
          Enviar lembrete
        </Button>
      </div>
    </div>
  );
}
