import { CalendarDays, CheckSquare, Search, Square } from "lucide-react";

import { Input } from "@/components/ui/input";

export type StatusFiltro = "all" | "PAGO" | "ABERTO" | "AVENCER" | "RECORRENTE" | "VENCIDO";
export type Ordenacao = "clienteAsc" | "vencimentoAsc" | "lucroFelipeDesc" | "mensalSiteDesc";

export type FiltrosState = {
  busca: string;
  status: StatusFiltro;
  mesAno: string;
  vencimento: string;
  mensagemSistema: "all" | "Normal" | "Bloqueado" | "Atualização" | "Cobrança";
  ordenacao: Ordenacao;
};

const selectClass =
  "rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-slate-800";

export function Filtros({
  state,
  onChange,
  mesesDisponiveis,
  countAVencer = 0,
  countVencidos = 0,
}: {
  state: FiltrosState;
  onChange: (next: Partial<FiltrosState>) => void;
  mesesDisponiveis: string[];
  countAVencer?: number;
  countVencidos?: number;
}) {
  const isAssinaturas = state.status === "RECORRENTE";

  return (
    <div className="card-panel space-y-3 p-3.5">
      {/* Linha Superior: Busca à esquerda + Pílulas de Status e Checkbox Assinaturas à direita */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative max-w-lg flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
          <Input
            value={state.busca}
            onChange={(event) => onChange({ busca: event.target.value })}
            placeholder="Buscar cliente, CNPJ, telefone ou situação..."
            className="h-9 rounded-xl border-border/70 bg-card/60 pl-9 text-xs placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          {/* Pílulas Todos / Pagos / Abertos */}
          <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-0.5">
            <button
              type="button"
              onClick={() => onChange({ status: "all" })}
              className={`rounded-full px-3.5 py-1 text-xs font-bold transition-colors ${
                state.status === "all"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => onChange({ status: "PAGO" })}
              className={`rounded-full px-3.5 py-1 text-xs font-bold transition-colors ${
                state.status === "PAGO"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              Pagos
            </button>
            <button
              type="button"
              onClick={() => onChange({ status: "ABERTO" })}
              className={`rounded-full px-3.5 py-1 text-xs font-bold transition-colors ${
                state.status === "ABERTO"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              Abertos
            </button>
          </div>

          {/* Checkbox Assinaturas ativas */}
          <button
            type="button"
            onClick={() => onChange({ status: isAssinaturas ? "all" : "RECORRENTE" })}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
              isAssinaturas
                ? "border-slate-800 bg-slate-800/10 text-slate-800"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            {isAssinaturas ? (
              <CheckSquare className="size-3.5 text-slate-800" />
            ) : (
              <Square className="size-3.5 text-slate-400" />
            )}
            <span className={isAssinaturas ? "text-slate-800" : "text-slate-500"}>
              Assinaturas ativas
            </span>
          </button>

          {/* Pílulas de vencimento, sempre visíveis: a vencer e vencidos */}
          <button
            type="button"
            onClick={() => onChange({ status: state.status === "AVENCER" ? "all" : "AVENCER" })}
            title="Títulos em aberto com vencimento hoje ou em data futura"
            className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition-colors ${
              state.status === "AVENCER"
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <span className={state.status === "AVENCER" ? "text-amber-700" : "text-slate-500"}>
              A vencer
            </span>
            <span className={`rounded-full px-1.5 text-[10px] font-bold ${
              state.status === "AVENCER" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
            }`}>
              {countAVencer}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onChange({ status: state.status === "VENCIDO" ? "all" : "VENCIDO" })}
            title="Títulos em aberto com vencimento já ultrapassado"
            className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition-colors ${
              state.status === "VENCIDO"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <span className={state.status === "VENCIDO" ? "text-rose-700" : "text-slate-500"}>
              Vencidos
            </span>
            <span className={`rounded-full px-1.5 text-[10px] font-bold ${
              state.status === "VENCIDO" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"
            }`}>
              {countVencidos}
            </span>
          </button>
        </div>
      </div>

      {/* Linha Inferior: Mês e Dia à esquerda | Ordenar por à direita */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 font-medium text-muted-foreground">
              <CalendarDays className="size-3.5 text-muted-foreground" />
              Mês referência:
            </span>
            <select
              className={selectClass}
              value={state.mesAno}
              onChange={(event) => onChange({ mesAno: event.target.value })}
            >
              <option value="all">Todos os meses</option>
              {mesesDisponiveis.map((mes) => (
                <option key={mes} value={mes}>
                  {mes}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-1.5">
            <span className="font-medium text-muted-foreground">Dia vencimento:</span>
            <select
              className={selectClass}
              value={state.vencimento}
              onChange={(event) => onChange({ vencimento: event.target.value })}
            >
              <option value="all">Todos os dias</option>
              {[5, 10, 15, 20, 25, 30].map((dia) => (
                <option key={dia} value={String(dia)}>
                  Dia {dia}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-1.5">
            <span className="font-medium text-muted-foreground">Msg. Sistema:</span>
            <select
              className={selectClass}
              value={state.mensagemSistema}
              onChange={(event) =>
                onChange({ mensagemSistema: event.target.value as FiltrosState["mensagemSistema"] })
              }
            >
              <option value="all">Todos</option>
              <option value="Normal">Normal</option>
              <option value="Bloqueado">Bloqueado</option>
              <option value="Atualização">Atualização</option>
              <option value="Cobrança">Cobrança</option>
            </select>
          </label>
        </div>

        <label className="flex items-center gap-2 text-muted-foreground">
          <span className="font-medium">Ordenar por:</span>
          <select
            className={selectClass}
            value={state.ordenacao}
            onChange={(event) => onChange({ ordenacao: event.target.value as Ordenacao })}
          >
            <option value="clienteAsc">Cliente (A-Z)</option>
            <option value="vencimentoAsc">Dia vencimento (1 → 31)</option>
            <option value="lucroFelipeDesc">Lucro Felipe (maior → menor)</option>
            <option value="mensalSiteDesc">Mensal site (maior → menor)</option>
          </select>
        </label>
      </div>
    </div>
  );
}
