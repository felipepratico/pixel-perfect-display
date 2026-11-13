import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Calendar, Download, Eye, EyeOff, FileText, Printer, Receipt, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useClientes } from "@/lib/use-clientes";
import { useTitulos } from "@/lib/use-titulos";
import { computeRow, formatCurrency, getVencimentoDate, type Titulo } from "@/lib/fincontrol";

export const Route = createFileRoute("/_authenticated/recebimentos-assinatura")({
  head: () => ({
    meta: [
      { title: "Recebimentos de Assinatura — UPSYSTEM FINCONTROL" },
      {
        name: "description",
        content: "Relatório de recebimentos de assinatura em regime de caixa.",
      },
      { property: "og:title", content: "Recebimentos de Assinatura — UPSYSTEM FINCONTROL" },
      {
        property: "og:description",
        content: "Relatório de recebimentos de assinatura em regime de caixa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RecebimentosAssinaturaPage,
});

const FORMAS_LABEL: Record<string, string> = {
  pix: "Pix",
  boleto: "Boleto",
  cartao: "Cartão",
  dinheiro: "Dinheiro",
  transferencia: "Transferência",
};

function toInputDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function parseInputDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function formatBR(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

function formatBRDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("pt-BR");
}

function valorRecebido(t: Titulo): number {
  if (t.valor_total != null) return Number(t.valor_total) || 0;
  return computeRow(t).valorTotal;
}

function repasseFrancisco(t: Titulo): number {
  if (t.valor_repasse_francisco != null) return Number(t.valor_repasse_francisco) || 0;
  return computeRow(t).lucroFrancisco;
}

function lucroFelipe(t: Titulo): number {
  if (t.lucro_liquido_felipe != null) return Number(t.lucro_liquido_felipe) || 0;
  return computeRow(t).lucroFelipe;
}

function diasAtraso(t: Titulo): number {
  if (t.dias_atraso != null) return Number(t.dias_atraso) || 0;
  const venc = getVencimentoDate(t);
  if (!venc || !t.pago_em) return 0;
  const diff = new Date(t.pago_em).getTime() - venc.getTime();
  return diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
}

function pontualidadeLabel(t: Titulo): string {
  const d = diasAtraso(t);
  return d === 0 ? "Em dia" : `Atraso de ${d} dia${d === 1 ? "" : "s"}`;
}

function formaLabel(v: string | null): string {
  if (!v) return "—";
  return FORMAS_LABEL[v.toLowerCase()] ?? v;
}

function RecebimentosAssinaturaPage() {
  const navigate = useNavigate();
  const { data: todos = [], isLoading } = useTitulos();
  const { data: clientesCadastrados = [] } = useClientes();

  const hoje = new Date();
  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  const [dataInicial, setDataInicial] = useState(toInputDate(primeiroDiaMes));
  const [dataFinal, setDataFinal] = useState(toInputDate(hoje));
  const [formaRecebimento, setFormaRecebimento] = useState("all");
  const [busca, setBusca] = useState("");
  const [valoresVisiveis, setValoresVisiveis] = useState(true);

  const codigoSitePorCliente = useMemo(
    () => new Map(clientesCadastrados.map((c) => [c.id, c.codigo_site])),
    [clientesCadastrados],
  );

  const filtrados = useMemo(() => {
    const inicio = parseInputDate(dataInicial);
    const fim = parseInputDate(dataFinal);
    fim.setHours(23, 59, 59, 999);
    const termo = busca.trim().toUpperCase();

    const lista = todos.filter((t) => {
      if (t.situacao !== "PAGO") return false;
      if (!t.pago_em) return false;
      const pagoEm = new Date(t.pago_em);
      if (Number.isNaN(pagoEm.getTime())) return false;
      if (pagoEm < inicio || pagoEm > fim) return false;

      if (formaRecebimento !== "all") {
        if ((t.forma_pagamento ?? "").toLowerCase() !== formaRecebimento) return false;
      }

      if (termo) {
        const codigo = (t.cliente_id ? codigoSitePorCliente.get(t.cliente_id) : "") ?? "";
        if (!t.cliente.toUpperCase().includes(termo) && !codigo.toUpperCase().includes(termo))
          return false;
      }
      return true;
    });

    return lista.sort(
      (a, b) => new Date(a.pago_em as string).getTime() - new Date(b.pago_em as string).getTime(),
    );
  }, [todos, dataInicial, dataFinal, formaRecebimento, busca, codigoSitePorCliente]);

  const totalRecebido = useMemo(
    () => filtrados.reduce((acc, t) => acc + valorRecebido(t), 0),
    [filtrados],
  );
  const totalRepasse = useMemo(
    () => filtrados.reduce((acc, t) => acc + repasseFrancisco(t), 0),
    [filtrados],
  );
  const totalLucro = useMemo(
    () => filtrados.reduce((acc, t) => acc + lucroFelipe(t), 0),
    [filtrados],
  );

  const moeda = (v: number) => (valoresVisiveis ? formatCurrency(v) : "R$ ••••••");

  function setHoje() {
    const t = new Date();
    setDataInicial(toInputDate(t));
    setDataFinal(toInputDate(t));
  }
  function setEstaSemana() {
    const t = new Date();
    const diffToMonday = (t.getDay() + 6) % 7;
    const monday = new Date(t);
    monday.setDate(t.getDate() - diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    setDataInicial(toInputDate(monday));
    setDataFinal(toInputDate(sunday));
  }
  function setEsteMes() {
    const t = new Date();
    const first = new Date(t.getFullYear(), t.getMonth(), 1);
    const last = new Date(t.getFullYear(), t.getMonth() + 1, 0);
    setDataInicial(toInputDate(first));
    setDataFinal(toInputDate(last));
  }
  function setMesPassado() {
    const t = new Date();
    const first = new Date(t.getFullYear(), t.getMonth() - 1, 1);
    const last = new Date(t.getFullYear(), t.getMonth(), 0);
    setDataInicial(toInputDate(first));
    setDataFinal(toInputDate(last));
  }

  function exportarExcel() {
    if (!filtrados.length) {
      toast.info("Nada para exportar com os filtros atuais.");
      return;
    }
    const rows = filtrados.map((t) => ({
      "Data Pagamento": formatBR(t.pago_em),
      "Cliente / Assinatura": t.cliente,
      "Cód. Site": t.cliente_id ? (codigoSitePorCliente.get(t.cliente_id) ?? "") : "",
      Vencimento: formatBRDate(getVencimentoDate(t)),
      Pontualidade: pontualidadeLabel(t),
      "Forma de Recebimento": formaLabel(t.forma_pagamento),
      Valor: valorRecebido(t),
      "Repasse Francisco": repasseFrancisco(t),
      "Lucro Felipe": lucroFelipe(t),
    }));
    rows.push({
      "Data Pagamento": "",
      "Cliente / Assinatura": "TOTAL",
      "Cód. Site": "",
      Vencimento: "",
      Pontualidade: "",
      "Forma de Recebimento": "",
      Valor: totalRecebido,
      "Repasse Francisco": totalRepasse,
      "Lucro Felipe": totalLucro,
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Recebimentos");
    XLSX.writeFile(wb, `recebimentos-assinatura-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function exportarCSV() {
    if (!filtrados.length) {
      toast.info("Nada para exportar com os filtros atuais.");
      return;
    }
    const header = [
      "Data Pagamento",
      "Cliente / Assinatura",
      "Cód. Site",
      "Vencimento",
      "Pontualidade",
      "Forma de Recebimento",
      "Valor",
      "Repasse Francisco",
      "Lucro Felipe",
    ];
    const linhas: string[] = [header.join(";")];
    for (const t of filtrados) {
      linhas.push(
        [
          formatBR(t.pago_em),
          `"${t.cliente.replace(/"/g, '""')}"`,
          t.cliente_id ? (codigoSitePorCliente.get(t.cliente_id) ?? "") : "",
          formatBR(getVencimentoDate(t)?.toISOString() ?? null),
          pontualidadeLabel(t),
          formaLabel(t.forma_pagamento),
          valorRecebido(t).toFixed(2).replace(".", ","),
          repasseFrancisco(t).toFixed(2).replace(".", ","),
          lucroFelipe(t).toFixed(2).replace(".", ","),
        ].join(";"),
      );
    }
    linhas.push(
      [
        "",
        "TOTAL",
        "",
        "",
        "",
        "",
        totalRecebido.toFixed(2).replace(".", ","),
        totalRepasse.toFixed(2).replace(".", ","),
        totalLucro.toFixed(2).replace(".", ","),
      ].join(";"),
    );
    const blob = new Blob(["\ufeff" + linhas.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recebimentos-assinatura-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function imprimir() {
    if (!filtrados.length) {
      toast.info("Nada para imprimir com os filtros atuais.");
      return;
    }
    window.print();
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-slate-200 bg-white print:hidden">
        <div className="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/painel" className="text-sm text-slate-500 hover:text-slate-800">
              ← Painel
            </Link>
            <h1 className="text-sm font-bold text-slate-900">Recebimentos de Assinatura</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => setValoresVisiveis((v) => !v)}
              aria-pressed={valoresVisiveis}
              className="gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:text-slate-900"
            >
              {valoresVisiveis ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              {valoresVisiveis ? "Ocultar valores" : "Mostrar valores"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!filtrados.length}
              onClick={exportarExcel}
              className="gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:text-slate-900"
            >
              <Download className="size-3.5" />
              Exportar Excel
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!filtrados.length}
              onClick={exportarCSV}
              className="gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:text-slate-900"
            >
              <Download className="size-3.5" />
              Exportar CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!filtrados.length}
              onClick={imprimir}
              className="gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:text-slate-900"
            >
              <Printer className="size-3.5" />
              Imprimir / PDF
            </Button>
          </div>
        </div>
      </div>

      <main className="w-full space-y-4 px-3 py-4 sm:px-4">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="size-6 animate-spin rounded-full border-b-2 border-slate-800" />
          </div>
        ) : (
          <>
            {/* Cards totalizadores */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="card-panel flex flex-col justify-between p-3.5 bg-white">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Total Recebido
                </p>
                <h3 className="my-1.5 text-lg font-black tracking-tight text-slate-900 tabular-nums">
                  {moeda(totalRecebido)}
                </h3>
                <p className="text-[11px] text-slate-500/75">{filtrados.length} lançamento(s)</p>
              </div>
              <div className="card-panel flex flex-col justify-between p-3.5 bg-white">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Repasse Francisco
                </p>
                <h3 className="my-1.5 text-lg font-black tracking-tight text-slate-900 tabular-nums">
                  {moeda(totalRepasse)}
                </h3>
                <p className="text-[11px] text-slate-500/75">Soma de Repasse Francisco</p>
              </div>
              <div className="card-panel flex flex-col justify-between p-3.5 bg-white">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Lucro Felipe (Líquido)
                </p>
                <h3 className="my-1.5 text-lg font-black tracking-tight text-slate-900 tabular-nums">
                  {moeda(totalLucro)}
                </h3>
                <p className="text-[11px] text-slate-500/75">Soma de Lucro Felipe</p>
              </div>
            </div>

            {/* Filtros */}
            <div className="card-panel bg-white p-3.5 space-y-3">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500">Data Inicial</Label>
                  <Input
                    type="date"
                    value={dataInicial}
                    onChange={(e) => setDataInicial(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500">Data Final</Label>
                  <Input
                    type="date"
                    value={dataFinal}
                    onChange={(e) => setDataFinal(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500">
                    Forma de Recebimento
                  </Label>
                  <Select value={formaRecebimento} onValueChange={setFormaRecebimento}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                      <SelectItem value="pix">Pix</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="cartao">Cartão</SelectItem>
                      <SelectItem value="transferencia">Transferência</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative flex-1 min-w-[200px] space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500">
                    Cliente / Cód. Site
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      placeholder="Buscar cliente ou cód. site"
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={setHoje} className="text-xs">
                  Hoje
                </Button>
                <Button size="sm" variant="outline" onClick={setEstaSemana} className="text-xs">
                  Esta Semana
                </Button>
                <Button size="sm" variant="outline" onClick={setEsteMes} className="text-xs">
                  Este Mês
                </Button>
                <Button size="sm" variant="outline" onClick={setMesPassado} className="text-xs">
                  Mês Passado
                </Button>
              </div>
            </div>

            {/* Tabela */}
            <div className="card-panel overflow-hidden bg-white border border-border">
              <div className="scroll-slim overflow-x-auto">
                <table className="w-full whitespace-nowrap text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3.5">Data Pagamento</th>
                      <th className="px-4 py-3.5">Cliente / Assinatura</th>
                      <th className="px-4 py-3.5 text-center">Cód. Site</th>
                      <th className="px-4 py-3.5 text-center">Vencimento</th>
                      <th className="px-4 py-3.5 text-center">Pontualidade</th>
                      <th className="px-4 py-3.5">Forma de Recebimento</th>
                      <th className="px-4 py-3.5 text-right">Valor</th>
                      <th className="px-4 py-3.5 text-right">Repasse Francisco</th>
                      <th className="px-4 py-3.5 text-right">Lucro Felipe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filtrados.map((t) => (
                      <tr
                        key={t.id}
                        className="bg-white hover:bg-slate-50 border-b border-slate-50/50"
                      >
                        <td className="px-4 py-3.5 text-slate-700">{formatBR(t.pago_em)}</td>
                        <td className="px-4 py-3.5 font-bold text-foreground">{t.cliente}</td>
                        <td className="px-4 py-3.5 text-center text-xs text-muted-foreground">
                          {t.cliente_id ? (codigoSitePorCliente.get(t.cliente_id) ?? "—") : "—"}
                        </td>
                        <td className="px-4 py-3.5 text-center text-slate-700">
                          {formatBRDate(getVencimentoDate(t))}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={
                              diasAtraso(t) === 0
                                ? "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700"
                                : "inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800"
                            }
                          >
                            {pontualidadeLabel(t)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-700">
                          {formaLabel(t.forma_pagamento)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold text-slate-900 tabular-nums">
                          {moeda(valorRecebido(t))}
                        </td>
                        <td className="px-4 py-3.5 text-right text-slate-500 font-medium tabular-nums">
                          {moeda(repasseFrancisco(t))}
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold text-slate-900 tabular-nums">
                          {moeda(lucroFelipe(t))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {filtrados.length > 0 ? (
                    <tfoot className="border-t border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <td className="p-3.5" colSpan={6}>
                          TOTAIS (filtrados)
                        </td>
                        <td className="p-3.5 text-right text-slate-900 tabular-nums font-bold">
                          {moeda(totalRecebido)}
                        </td>
                        <td className="p-3.5 text-right text-slate-500 tabular-nums font-medium">
                          {moeda(totalRepasse)}
                        </td>
                        <td className="p-3.5 text-right text-slate-900 tabular-nums font-bold">
                          {moeda(totalLucro)}
                        </td>
                      </tr>
                    </tfoot>
                  ) : null}
                </table>
              </div>
              {filtrados.length === 0 ? (
                <div className="space-y-3 p-12 text-center">
                  <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Receipt className="size-7" />
                  </div>
                  <p className="text-base font-bold">Nenhum recebimento encontrado</p>
                  <p className="mx-auto max-w-md text-xs text-muted-foreground">
                    Ajuste os filtros ou o período selecionado.
                  </p>
                </div>
              ) : null}
            </div>
          </>
        )}
      </main>

      {/* Área de impressão */}
      <div id="area-impressao" className="hidden bg-white p-6 text-black print:block">
        <div className="mb-4 border-b-2 border-black pb-2">
          <h1 className="text-xl font-extrabold">Recebimentos de Assinatura</h1>
          <p className="text-xs">
            Período: {formatBRDate(parseInputDate(dataInicial))} a{" "}
            {formatBRDate(parseInputDate(dataFinal))} · {filtrados.length} lançamento(s)
          </p>
          <p className="text-xs">Emitido em {new Date().toLocaleString("pt-BR")}</p>
        </div>
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-black text-left">
              <th className="py-1">Data Pag.</th>
              <th className="py-1">Cliente</th>
              <th className="py-1">Cód. Site</th>
              <th className="py-1">Vencimento</th>
              <th className="py-1">Pontualidade</th>
              <th className="py-1">Forma</th>
              <th className="py-1 text-right">Valor</th>
              <th className="py-1 text-right">Repasse Francisco</th>
              <th className="py-1 text-right">Lucro Felipe</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((t) => (
              <tr key={t.id} className="border-b border-neutral-300">
                <td className="py-1">{formatBR(t.pago_em)}</td>
                <td className="py-1 font-semibold">{t.cliente}</td>
                <td className="py-1">
                  {t.cliente_id ? (codigoSitePorCliente.get(t.cliente_id) ?? "—") : "—"}
                </td>
                <td className="py-1">{formatBRDate(getVencimentoDate(t))}</td>
                <td className="py-1">{pontualidadeLabel(t)}</td>
                <td className="py-1">{formaLabel(t.forma_pagamento)}</td>
                <td className="py-1 text-right">{formatCurrency(valorRecebido(t))}</td>
                <td className="py-1 text-right">{formatCurrency(repasseFrancisco(t))}</td>
                <td className="py-1 text-right">{formatCurrency(lucroFelipe(t))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 border-t-2 border-black pt-2 text-sm font-extrabold">
          Total recebido: {formatCurrency(totalRecebido)} · Repasse Francisco:{" "}
          {formatCurrency(totalRepasse)} · Lucro Felipe: {formatCurrency(totalLucro)}
        </div>
      </div>
    </div>
  );
}
