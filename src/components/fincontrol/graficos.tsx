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
        // nome completo para tooltip; rótulo segue truncado no eixo
        nome: titulo.cliente,
        cliente: titulo.cliente.length > 18 ? `${titulo.cliente.slice(0, 18)}…` : titulo.cliente,
        cnpj: titulo.cnpj,
        "Mensal site": Number(calc.mensalSite.toFixed(2)),
        "Lucro Felipe": Number(calc.lucroFelipe.toFixed(2)),
        "Lucro Francisco": Number(calc.lucroFrancisco.toFixed(2)),
      };
    })
    .sort((a, b) => b["Mensal site"] - a["Mensal site"])
    .slice(0, 10);

  const valorPago = titulos
    .filter((t) => t.situacao === "PAGO")
    .reduce((acc, t) => acc + computeRow(t).mensalSite, 0);
  const valorAberto = titulos
    .filter((t) => t.situacao === "ABERTO")
    .reduce((acc, t) => acc + computeRow(t).mensalSite, 0);
  const totalValor = valorPago + valorAberto;
  const situacao = [
    { name: "PAGO", value: totais.pagos, valor: valorPago, color: "#059669" },
    { name: "ABERTO", value: totais.abertos, valor: valorAberto, color: "#64748b" },
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
      <div
        className="card-panel flex flex-col justify-between p-4 lg:col-span-2 bg-white animate-card-in transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-lg"
        style={{ animationDelay: "350ms" }}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-foreground">
              Distribuição financeira por cliente
            </h2>
            <p className="text-xs text-muted-foreground">
              Mensal site x lucro Felipe x Francisco x custo do boleto
            </p>
          </div>
          <span className="rounded-lg border border-border/60 bg-muted/30 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
            Top 10 clientes
          </span>
        </div>
        <p className="mb-2 text-[11px] text-muted-foreground">
          Passe o mouse sobre uma barra para ver cliente, CNPJ e composição — sem custo de boleto na
          barra principal.
        </p>
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
                  angle={-28}
                  textAnchor="end"
                  height={55}
                  stroke="var(--muted-foreground)"
                />
                <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                <Tooltip
                  formatter={(value: number, name: string) =>
                    name === "cliente" ? value : formatCurrency(Number(value))
                  }
                  labelFormatter={(_, payload) => {
                    const registro = payload?.[0]?.payload as
                      { nome?: string; cnpj?: string } | undefined;
                    return registro
                      ? `${registro.nome ?? ""}${registro.cnpj ? ` · ${registro.cnpj}` : ""}`
                      : "";
                  }}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    color: "#1e293b",
                    borderColor: "#d3dfee",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
                  iconType="circle"
                  iconSize={8}
                />
                <Bar
                  dataKey="Mensal site"
                  fill="#0f4c5c"
                  radius={[4, 4, 0, 0]}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
                <Bar
                  dataKey="Lucro Felipe"
                  fill="#059669"
                  radius={[4, 4, 0, 0]}
                  animationDuration={800}
                  animationBegin={80}
                  animationEasing="ease-out"
                />
                <Bar
                  dataKey="Lucro Francisco"
                  fill="#64748b"
                  radius={[4, 4, 0, 0]}
                  animationDuration={800}
                  animationBegin={160}
                  animationEasing="ease-out"
                />
                {/* Custo boleto: valores muito baixos. Aparece apenas no total dos cards e no tooltip. */}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Gráfico 2: Situação das Cobranças (1/3 da largura) */}
      <div
        className="card-panel flex flex-col justify-between p-4 bg-white animate-card-in transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-lg"
        style={{ animationDelay: "410ms" }}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">Situação das cobranças</h2>
          <Clock className="size-4 text-muted-foreground/80" />
        </div>
        <div className="relative h-48 flex-1">
          {situacao.length === 0 ? (
            <EmptyChart />
          ) : (
            <>
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
                    animationDuration={800}
                    animationEasing="ease-out"
                  >
                    {situacao.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      const item = situacao.find((s) => s.name === name);
                      return [`${value} faturas · ${formatCurrency(item?.valor ?? 0)}`, name];
                    }}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      color: "#1e293b",
                      borderColor: "#d3dfee",
                      borderRadius: 10,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Valor monetário no centro do donut */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-base font-black tracking-tight text-foreground">
                  {formatCurrency(totalValor)}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  total a receber
                </span>
              </div>
            </>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-3 text-center text-xs">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 py-1.5 font-semibold text-emerald-700 tabular-nums">
            {totais.pagos} pagos · {formatCurrency(valorPago)}
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 font-semibold text-slate-700 tabular-nums">
            {totais.abertos} abertos · {formatCurrency(valorAberto)}
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
