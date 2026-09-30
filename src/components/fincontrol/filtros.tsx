import { CalendarDays, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type StatusFiltro = "all" | "PAGO" | "ABERTO" | "RECORRENTE";
export type Ordenacao = "clienteAsc" | "vencimentoAsc" | "lucroFelipeDesc" | "mensalSiteDesc";

export type FiltrosState = {
  busca: string;
  status: StatusFiltro;
  mesAno: string;
  vencimento: string;
  ordenacao: Ordenacao;
};

const selectClass =
  "rounded-lg border border-input bg-card px-2.5 py-1 font-semibold outline-none focus:ring-2 focus:ring-ring";

export function Filtros({
  state,
  onChange,
  mesesDisponiveis,
}: {
  state: FiltrosState;
  onChange: (next: Partial<FiltrosState>) => void;
  mesesDisponiveis: string[];
}) {
  const statusButtons: Array<{ value: StatusFiltro; label: string }> = [
    { value: "all", label: "Todos" },
    { value: "PAGO", label: "Pagos" },
    { value: "ABERTO", label: "Abertos" },
    { value: "RECORRENTE", label: "🔁 Assinaturas ativas" },
  ];

  return (
    <div className="card-panel space-y-3 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={state.busca}
            onChange={(event) => onChange({ busca: event.target.value })}
            placeholder="Buscar cliente, CNPJ, telefone ou situação..."
            className="h-9 pl-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
          {statusButtons.map((item) => (
            <Button
              key={item.value}
              type="button"
              size="sm"
              variant={state.status === item.value ? "default" : "secondary"}
              className="h-8 rounded-xl text-xs"
              onClick={() => onChange({ status: item.value })}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-2 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 font-bold text-muted-foreground">
              <CalendarDays className="size-3.5" />
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
            <span className="font-bold text-muted-foreground">Dia vencimento:</span>
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
          Ordenar por:
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
