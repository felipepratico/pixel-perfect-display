import { Clock, EyeOff } from "lucide-react";
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
    { name: "PAGO", value: totais.pagos, color: "#10b981" },
    { name: "ABERTO", value: totais.abertos, color: "#f59e0b" },
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
    <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
      {/* Gráfico 1: Distribuição Financeira por Cliente (2/3 da largura) */}
      <div className="card-panel flex flex-col justify-between p-4 lg:col-span-2 bg-card/70">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-foreground">Distribuição financeira por cliente</h2>
            <p className="text-xs text-muted-foreground">
              Mensal site x lucro Felipe x Francisco x custo do boleto
            </p>
          </div>
          <span className="rounded-lg border border-border/60 bg-muted/30 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
            Top 10 clientes
          </span>
        </div>
        <div className="h-64">
          {top.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                <XAxis
                  dataKey="cliente"
                  tick={{ fontSize: 9 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={50}
                  stroke="var(--muted-foreground)"
                />
                <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: "oklch(0.18 0.025 260)",
                    borderColor: "oklch(0.3 0.028 260)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
                  iconType="circle"
                  iconSize={8}
                />
                <Bar dataKey="Mensal site" fill="#0284c7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Lucro Felipe" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Lucro Francisco" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Custo boleto" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Gráfico 2: Situação das Cobranças (1/3 da largura) */}
      <div className="card-panel flex flex-col justify-between p-4 bg-card/70">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">Situação das cobranças</h2>
          <Clock className="size-4 text-muted-foreground/80" />
        </div>
        <div className="h-48 flex-1">
          {situacao.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={situacao}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={46}
                  outerRadius={72}
                  paddingAngle={3}
                  stroke="none"
                >
                  {situacao.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "oklch(0.18 0.025 260)",
                    borderColor: "oklch(0.3 0.028 260)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-border/50 pt-3 text-center text-xs">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/40 py-1.5 font-bold text-emerald-400">
            {totais.pagos} pagos
          </div>
          <div className="rounded-lg border border-amber-500/30 bg-amber-950/40 py-1.5 font-bold text-amber-400">
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
