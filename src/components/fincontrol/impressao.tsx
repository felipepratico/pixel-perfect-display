import { computeRow, formatCurrency, type Titulo } from "@/lib/fincontrol";

export type GrupoVencimento = { dia: number; itens: Titulo[]; total: number };

export function agruparPorVencimento(titulos: Titulo[]): GrupoVencimento[] {
  const mapa = new Map<number, Titulo[]>();
  for (const t of titulos) {
    const dia = Number(t.vencimento) || 0;
    const lista = mapa.get(dia) ?? [];
    lista.push(t);
    mapa.set(dia, lista);
  }
  return [...mapa.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([dia, itens]) => ({
      dia,
      itens: [...itens].sort((a, b) => a.cliente.localeCompare(b.cliente)),
      total: itens.reduce((soma, item) => soma + computeRow(item).mensalSite, 0),
    }));
}

/**
 * Printable sheet. Hidden on screen; the print stylesheet in styles.css
 * reveals only this block when the browser prints or saves as PDF.
 */
export function AreaImpressao({
  titulos,
  subtitulo,
}: {
  titulos: Titulo[];
  subtitulo: string;
}) {
  const grupos = agruparPorVencimento(titulos);
  const total = grupos.reduce((soma, g) => soma + g.total, 0);
  const abertos = titulos.filter((t) => t.situacao === "ABERTO").length;
  const hoje = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());

  return (
    <div id="area-impressao" className="hidden bg-white p-6 text-black print:block">
      <div className="mb-4 border-b-2 border-black pb-2">
        <h1 className="text-xl font-extrabold">FinControl — Contas a receber</h1>
        <p className="text-xs">{subtitulo}</p>
        <p className="text-xs">
          Emitido em {hoje} · {titulos.length} lançamento(s) · {abertos} em aberto
        </p>
      </div>

      {grupos.map((grupo) => (
        <div key={grupo.dia} className="mb-5 break-inside-avoid">
          <h2 className="mb-1 bg-neutral-200 px-2 py-1 text-sm font-bold">
            Vencimento dia {grupo.dia} — {grupo.itens.length} cliente(s) ·{" "}
            {formatCurrency(grupo.total)}
          </h2>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-black text-left">
                <th className="py-1">Cliente</th>
                <th className="py-1">CNPJ</th>
                <th className="py-1">Telefone</th>
                <th className="py-1">Mês/Ano</th>
                <th className="py-1 text-right">Valor</th>
                <th className="py-1 text-center">Situação</th>
                <th className="py-1 text-center">Pago em</th>
              </tr>
            </thead>
            <tbody>
              {grupo.itens.map((item) => (
                <tr key={item.id} className="border-b border-neutral-300">
                  <td className="py-1 font-semibold">{item.cliente}</td>
                  <td className="py-1">{item.cnpj || "—"}</td>
                  <td className="py-1">{item.telefone || "—"}</td>
                  <td className="py-1">{item.mes_ano || "—"}</td>
                  <td className="py-1 text-right">
                    {formatCurrency(computeRow(item).mensalSite)}
                  </td>
                  <td className="py-1 text-center">{item.situacao}</td>
                  <td className="py-1 text-center">
                    {item.situacao === "PAGO" ? "✓" : "____/____"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <div className="mt-4 border-t-2 border-black pt-2 text-sm font-extrabold">
        Total geral a receber: {formatCurrency(total)}
      </div>
    </div>
  );
}
