import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, parseNumber } from "@/lib/fincontrol";
import { useTituloMutations } from "@/lib/use-titulos";
import type { TituloInput } from "@/lib/fincontrol";
import {
  conciliarCobrancasPdf,
  dataBrParaIso,
  somenteDigitos,
  type PdfCobrancaEfi,
  type PdfMatch,
} from "@/lib/conciliacao-pdf";

export function ConciliacaoPdfDialog({
  open,
  titulos,
  titulosAbertos,
  clientesCadastrados,
  aliasesCnpj,
  configFinanceira,
  initialCobrancas,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  titulos: any[];
  titulosAbertos: any[];
  clientesCadastrados: any[];
  aliasesCnpj?: any[];
  configFinanceira?: any;
  initialCobrancas?: PdfCobrancaEfi[] | null;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const { patchMany, insertMany } = useTituloMutations();
  const [matches, setMatches] = useState<PdfMatch[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  useMemo(() => {
    if (open && initialCobrancas && initialCobrancas.length > 0 && matches.length === 0) {
      const res = conciliarCobrancasPdf({
        cobrancas: initialCobrancas,
        titulos,
        clientesCadastrados,
        aliasesCnpj: aliasesCnpj ?? [],
      });
      setMatches(res);
      const selecionar = res
        .filter((m) => m.status === "conciliado" || m.status === "corrigir" || m.status === "novo_retroativo")
        .map((m) => m.cobranca.numero_cobranca);
      setSelecionados(new Set(selecionar));
    }
    if (!open) {
      setMatches([]);
      setSelecionados(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialCobrancas, titulosAbertos, clientesCadastrados]);

  const conciliados = matches.filter((m) => m.status === "conciliado");
  const corrigir = matches.filter((m) => m.status === "corrigir");
  const novoRetroativo = matches.filter((m) => m.status === "novo_retroativo");
  const jaConciliados = matches.filter((m) => m.status === "ja_conciliado");
  const naoEncontrados = matches.filter((m) => m.status === "nao_encontrado");
  const ignorados = matches.filter((m) => m.status === "ignorado");

  function toggle(id: string) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function vincularManualmente(idCobranca: string, tituloId: string) {
    const tituloAlvo = titulosAbertos.find((t: any) => t.id === tituloId);
    if (!tituloAlvo) return;
    const novoStatus =
      tituloAlvo.situacao === "PAGO" ? "corrigir" : "conciliado";
    setMatches((prev) =>
      prev.map((m) =>
        m.cobranca.numero_cobranca === idCobranca
          ? { ...m, titulo: tituloAlvo, status: novoStatus }
          : m,
      ),
    );
    setSelecionados((prev) => {
      const next = new Set(prev);
      next.add(idCobranca);
      return next;
    });
  }

  function desvincular(idCobranca: string) {
    setMatches((prev) =>
      prev.map((m) =>
        m.cobranca.numero_cobranca === idCobranca
          ? { ...m, titulo: null, status: "nao_encontrado" }
          : m,
      ),
    );
    setSelecionados((prev) => {
      const next = new Set(prev);
      next.delete(idCobranca);
      return next;
    });
  }

  async function confirmar() {
    const selecionadosList = matches.filter(
      (m) =>
        selecionados.has(m.cobranca.numero_cobranca) &&
        (m.status === "conciliado" ||
          m.status === "corrigir" ||
          m.status === "novo_retroativo"),
    );
    if (selecionadosList.length === 0) {
      toast.error("Nenhuma cobrança selecionada.");
      return;
    }
    setSalvando(true);
    let count = 0;
    try {
      const novos: any[] = [];
      for (const m of selecionadosList) {
        const cob = m.cobranca;
        const extra = Math.max(0, cob.valor_pago - cob.valor_original);
        const franciscoPct =
          m.titulo?.francisco_pct ??
          m.cliente?.percentual_repasse_francisco ??
          configFinanceira?.percentual_repasse_francisco ??
          5;
        const custoBoleto =
          m.titulo?.custo_boleto ??
          configFinanceira?.custo_boleto_padrao ??
          3.45;
        const repasse = (cob.valor_original * franciscoPct) / 100;
        const lucro = cob.valor_pago - repasse - custoBoleto;

        if (m.status === "novo_retroativo") {
          const cliente = m.cliente;
          // template de título existente do mesmo cliente
          const template = titulos.find(
            (t: any) =>
              t.cliente_id === cliente?.id || somenteDigitos(t.cnpj) === cob.documento_digits,
          );
          const diaVenc = parseInt(cob.data_vencimento.split("/")[0] || "1", 10);
          const mesAno = cob.data_vencimento.split("/").slice(1).reverse().join("/");
          // mesAno formato MM/AAAA
          const partes = cob.data_vencimento.split("/");
          const mesAnoFmt = partes.length === 3 ? `${partes[1]}/${partes[2]}` : "";
          novos.push({
            cliente_id: cliente?.id ?? null,
            cliente: cliente?.razao_social ?? cob.nome_cliente,
            cnpj: cliente?.cnpj ?? cob.documento,
            telefone: cliente?.telefone ? String(cliente.telefone).replace(/\D/g, "") : "",
            mensal_site: cob.valor_original,
            mensal_real: cob.valor_original,
            custo_boleto: custoBoleto,
            francisco_pct: franciscoPct,
            vencimento: diaVenc,
            mes_ano: mesAnoFmt,
            tipo_cobranca: template?.tipo_cobranca ?? "Boleto Efí Bank",
            status_assinatura: template?.status_assinatura ?? "ATIVO",
            situacao: "PAGO",
            pago_em: dataBrParaIso(cob.data_pagamento),
            forma_pagamento: "boleto",
            dias_atraso: 0,
            valor_nominal: cob.valor_original,
            valor_total: cob.valor_pago,
            valor_juros: extra,
            valor_multa: 0,
            percentual_francisco_aplicado: franciscoPct,
            valor_repasse_francisco: repasse,
            lucro_liquido_felipe: lucro,
            efi_status: "",
            efi_link_pagamento: "",
            efi_linha_digitavel: "",
          });
        } else if (m.titulo) {
          await patchMany.mutateAsync({
            ids: [m.titulo.id],
            values: {
              situacao: "PAGO",
              pago_em: dataBrParaIso(cob.data_pagamento),
              forma_pagamento: "boleto",
              dias_atraso: 0,
              valor_nominal: cob.valor_original,
              valor_total: cob.valor_pago,
              valor_juros: extra,
              valor_multa: 0,
              percentual_francisco_aplicado: franciscoPct,
              valor_repasse_francisco: repasse,
              lucro_liquido_felipe: lucro,
            },
          });
        }
        count++;
      }

      if (novos.length > 0) {
        await insertMany.mutateAsync(novos as any);
      }

      toast.success(`${count} lançamento(s) processado(s) com sucesso.`);
      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao processar lançamentos do PDF.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b bg-slate-50/50">
          <DialogTitle className="text-base font-bold text-slate-900">
            Conciliação de Relatório Expresso (PDF) - Efí
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Prévia da conciliação antes de gravar no banco.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            <div className="card-panel p-3 bg-white border border-border/60">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Lidas</p>
              <p className="text-lg font-black">{matches.length}</p>
            </div>
            <div className="card-panel p-3 bg-white border border-border/60">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Baixar</p>
              <p className="text-lg font-black text-emerald-600">{conciliados.length}</p>
            </div>
            <div className="card-panel p-3 bg-white border border-border/60">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Corrigir</p>
              <p className="text-lg font-black text-amber-600">{corrigir.length}</p>
            </div>
            <div className="card-panel p-3 bg-white border border-border/60">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Novo retroativo</p>
              <p className="text-lg font-black text-blue-600">{novoRetroativo.length}</p>
            </div>
            <div className="card-panel p-3 bg-white border border-border/60">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Já conciliados</p>
              <p className="text-lg font-black text-slate-500">{jaConciliados.length}</p>
            </div>
            <div className="card-panel p-3 bg-white border border-border/60">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Não encontrados</p>
              <p className="text-lg font-black text-amber-600">{naoEncontrados.length}</p>
            </div>
          </div>

          {ignorados.length > 0 && (
            <p className="text-xs text-slate-500">
              {ignorados.length} cobrança(s) ignorada(s) por status não pago.
            </p>
          )}

          {corrigir.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-amber-700">Corrigir Pago (Divergência):</p>
              {corrigir.map((m) => {
                const cob = m.cobranca;
                const extra = Math.max(0, cob.valor_pago - cob.valor_original);
                const checked = selecionados.has(cob.numero_cobranca);
                return (
                  <div key={cob.numero_cobranca} className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-amber-50/40">
                    <div className="flex items-start gap-3 min-w-0">
                      <Checkbox checked={checked} onCheckedChange={() => toggle(cob.numero_cobranca)} className="mt-1" />
                      <div className="min-w-0 space-y-1">
                        <p className="font-bold text-sm text-slate-900 truncate">
                          {cob.nome_cliente || m.titulo?.cliente}
                          <span className="ml-2 text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                            Corrigir Pago (Divergência)
                          </span>
                        </p>
                        <p className="text-xs text-slate-500">{m.divergencia}</p>
                        <p className="text-xs text-slate-500">
                          PDF: Venc. {cob.data_vencimento} • Original {formatCurrency(cob.valor_original)} •
                          Pago {formatCurrency(cob.valor_pago)} • Juros/Multa {formatCurrency(extra)} •
                          Pagamento {cob.data_pagamento}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {novoRetroativo.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-blue-700">Novo Lançamento Retroativo (Pago):</p>
              {novoRetroativo.map((m) => {
                const cob = m.cobranca;
                const extra = Math.max(0, cob.valor_pago - cob.valor_original);
                const checked = selecionados.has(cob.numero_cobranca);
                return (
                  <div key={cob.numero_cobranca} className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-blue-50/40">
                    <div className="flex items-start gap-3 min-w-0">
                      <Checkbox checked={checked} onCheckedChange={() => toggle(cob.numero_cobranca)} className="mt-1" />
                      <div className="min-w-0 space-y-1">
                        <p className="font-bold text-sm text-slate-900 truncate">
                          {cob.nome_cliente}
                          <span className="ml-2 text-[10px] font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                            Novo Lançamento Retroativo (Pago)
                          </span>
                        </p>
                        <p className="text-xs text-slate-500">
                          Cliente: {m.cliente?.razao_social ?? "—"} • Venc. {cob.data_vencimento} •
                          Original {formatCurrency(cob.valor_original)} • Pago {formatCurrency(cob.valor_pago)} •
                          Juros/Multa {formatCurrency(extra)} • Pagamento {cob.data_pagamento}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {conciliados.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-700">Conciliadas (serão baixadas):</p>
              {conciliados.map((m) => {
                const cob = m.cobranca;
                const extra = Math.max(0, cob.valor_pago - cob.valor_original);
                const checked = selecionados.has(cob.numero_cobranca);
                return (
                  <div
                    key={cob.numero_cobranca}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-white"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggle(cob.numero_cobranca)}
                        className="mt-1"
                      />
                      <div className="min-w-0 space-y-1">
                        <p className="font-bold text-sm text-slate-900 truncate">
                          {cob.nome_cliente || m.titulo?.cliente}
                        </p>
                        <p className="text-xs text-slate-500">
                          Venc. {cob.data_vencimento} • Original {formatCurrency(cob.valor_original)} •
                          Pago {formatCurrency(cob.valor_pago)} • Juros/Multa {formatCurrency(extra)} •
                          Pagamento {cob.data_pagamento}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {naoEncontrados.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-amber-700">Não encontradas (conferência manual):</p>
              {naoEncontrados.map((m) => {
                const cob = m.cobranca;
                const titulosOrdenados = [...titulosAbertos].sort((a: any, b: any) => {
                  const diffA = Math.abs(parseNumber(a.mensal_site) - cob.valor_original);
                  const diffB = Math.abs(parseNumber(b.mensal_site) - cob.valor_original);
                  return diffA - diffB;
                });
                return (
                  <div key={cob.numero_cobranca} className="p-3 rounded-xl border bg-amber-50/40 space-y-2">
                    <p className="text-xs font-bold text-slate-800">
                      {cob.nome_cliente} • Doc {cob.documento}
                    </p>
                    <p className="text-xs text-slate-500">
                      Venc. {cob.data_vencimento} • Original {formatCurrency(cob.valor_original)} •
                      Pago {formatCurrency(cob.valor_pago)}
                    </p>
                    <Select
                      onValueChange={(tituloId) => vincularManualmente(cob.numero_cobranca, tituloId)}
                    >
                      <SelectTrigger className="w-full text-xs h-9 bg-white border-slate-200 font-medium">
                        <SelectValue placeholder="Vincular manualmente a um lançamento em aberto..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {titulosOrdenados.map((t: any) => (
                          <SelectItem key={t.id} value={t.id} className="text-xs py-2">
                            {t.cliente} ({t.mes_ano}) - {formatCurrency(parseNumber(t.mensal_site))}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          )}

          {jaConciliados.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500">Já pagas (ignoradas):</p>
              {jaConciliados.map((m) => {
                const cob = m.cobranca;
                return (
                  <div key={cob.numero_cobranca} className="p-3 rounded-xl border bg-slate-50">
                    <p className="text-xs text-slate-600">
                      {cob.nome_cliente} • Venc. {cob.data_vencimento} • {formatCurrency(cob.valor_pago)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t bg-slate-50/50 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            {selecionados.size} de {conciliados.length + corrigir.length + novoRetroativo.length} selecionada(s)
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="text-xs">
              Fechar
            </Button>
            <Button
              type="button"
              disabled={salvando || selecionados.size === 0}
              onClick={confirmar}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
            >
              {salvando ? "Processando..." : `Confirmar baixa (${selecionados.size})`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
