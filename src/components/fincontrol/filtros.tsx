import { CalendarDays, CheckSquare, Search, Square } from "lucide-react";

import { Input } from "@/components/ui/input";

export type StatusFiltro = "all" | "PAGO" | "ABERTO" | "RECORRENTE" | "VENCIDO";
export type Ordenacao = "clienteAsc" | "vencimentoAsc" | "lucroFelipeDesc" | "mensalSiteDesc";

export type FiltrosState = {
  busca: string;
  status: StatusFiltro;
  mesAno: string;
  vencimento: string;
  ordenacao: Ordenacao;
};

const selectClass =
  "rounded-lg border border-input/60 bg-card/80 px-2.5 py-1 text-xs font-semibold text-foreground outline-none focus:ring-1 focus:ring-primary";

export function Filtros({
  state,
  onChange,
  mesesDisponiveis,
  countVencidos = 0,
}: {
  state: FiltrosState;
  onChange: (next: Partial<FiltrosState>) => void;
  mesesDisponiveis: string[];
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
          <div className="flex items-center gap-1 rounded-full bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => onChange({ status: "all" })}
              className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-colors ${
                state.status === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => onChange({ status: "PAGO" })}
              className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-colors ${
                state.status === "PAGO"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Pagos
            </button>
            <button
              type="button"
              onClick={() => onChange({ status: "ABERTO" })}
              className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-colors ${
                state.status === "ABERTO"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
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
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border/60 bg-card/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            {isAssinaturas ? (
              <CheckSquare className="size-3.5 text-primary" />
            ) : (
              <Square className="size-3.5 text-muted-foreground" />
            )}
            <span>Assinaturas ativas</span>
          </button>

          {countVencidos > 0 && (
            <button
              type="button"
              onClick={() => onChange({ status: state.status === "VENCIDO" ? "all" : "VENCIDO" })}
              className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition-colors ${
                state.status === "VENCIDO"
                  ? "border-destructive bg-destructive text-destructive-foreground"
                  : "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
              }`}
            >
              <span>Vencidos</span>
              <span className="rounded-full bg-destructive/30 px-1.5 text-[10px] font-bold">
                {countVencidos}
              </span>
            </button>
          )}
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
