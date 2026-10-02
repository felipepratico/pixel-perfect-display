import { ChartPie, EyeOff } from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { computeRow, formatCurrency, type Titulo } from "@/lib/fincontrol";
import type { Totais } from "@/lib/totais";

export function Graficos({
  titulos,
  totais,
  valoresVisiveis,
}: {
  titulos: Titulo[];
  totais: Totais;
  valoresVisiveis: boolean;
}) {
  const top = [...titulos]
    .map((titulo) => {
      const calc = computeRow(titulo);
      return {
        cliente: titulo.cliente.length > 14 ? `${titulo.cliente.slice(0, 14)}…` : titulo.cliente,
        "Mensal site": Number(calc.mensalSite.toFixed(2)),
        "Lucro Felipe": Number(calc.lucroFelipe.toFixed(2)),
        "Lucro Francisco": Number(calc.lucroFrancisco.toFixed(2)),
        "Custo boleto": Number(calc.custoBoleto.toFixed(2)),
      };
    })
    .sort((a, b) => b["Mensal site"] - a["Mensal site"])
    .slice(0, 10);

  const situacao = [
    { name: "PAGO", value: totais.pagos, color: "var(--brand)" },
    { name: "ABERTO", value: totais.abertos, color: "var(--warning)" },
  ].filter((item) => item.value > 0);

  if (!valoresVisiveis) {
    return (
      <div className="card-panel flex min-h-48 items-center justify-center p-6 text-center">
        <div className="space-y-2 text-muted-foreground">
          <EyeOff className="mx-auto size-6" />
          <p className="text-sm font-bold text-foreground">Gráficos financeiros ocultos</p>
          <p className="text-xs">Use “Mostrar valores” para visualizar os gráficos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="card-panel p-4 lg:col-span-2">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold">Distribuição financeira por cliente</h2>
            <p className="text-xs text-muted-foreground">
              Mensal site x lucro Felipe x Francisco x custo do boleto
            </p>
          </div>
          <span className="rounded-lg bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
            Top 10 clientes
          </span>
        </div>
        <div className="h-64">
          {top.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <XAxis
                  dataKey="cliente"
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={54}
                  stroke="var(--muted-foreground)"
                />
                <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ fontSize: 12, borderRadius: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Mensal site" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Lucro Felipe" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Lucro Francisco" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Custo boleto" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card-panel flex flex-col p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold">Situação das cobranças</h2>
          <ChartPie className="size-4 text-muted-foreground" />
        </div>
        <div className="h-48 flex-1">
          {situacao.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={situacao} dataKey="value" nameKey="name" innerRadius={44} outerRadius={70}>
                  {situacao.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="grid grid-cols-2 gap-1 border-t border-border pt-3 text-center text-xs">
          <div className="rounded bg-brand-soft p-1 font-bold text-brand">
            {totais.pagos} pagos
          </div>
          <div className="rounded bg-warning-soft p-1 font-bold text-warning">
            {totais.abertos} abertos
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
      Sem dados para exibir ainda.
    </div>
  );
}
