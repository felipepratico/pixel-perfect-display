import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  conciliarCobrancasPdf,
  dataBrParaIso,
  type PdfCobrancaEfi,
  type PdfMatch,
} from "@/lib/conciliacao-pdf";

export function ConciliacaoPdfDialog({
  open,
  titulosAbertos,
  clientesCadastrados,
  initialCobrancas,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  titulosAbertos: any[];
  clientesCadastrados: any[];
  initialCobrancas?: PdfCobrancaEfi[] | null;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const { patchMany } = useTituloMutations();
  const [matches, setMatches] = useState<PdfMatch[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  useMemo(() => {
    if (open && initialCobrancas && initialCobrancas.length > 0 && matches.length === 0) {
      const res = conciliarCobrancasPdf({
        cobrancas: initialCobrancas,
        titulosAbertos,
        clientesCadastrados,
      });
      setMatches(res);
      const conc = res.filter((m) => m.status === "conciliado").map((m) => m.cobranca.numero_cobranca);
      setSelecionados(new Set(conc));
    }
    if (!open) {
      setMatches([]);
      setSelecionados(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialCobrancas, titulosAbertos, clientesCadastrados]);

  const conciliados = matches.filter((m) => m.status === "conciliado");
  const jaPagos = matches.filter((m) => m.status === "ja_pago");
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

  async function confirmar() {
    const selecionadosList = conciliados.filter((m) =>
      selecionados.has(m.cobranca.numero_cobranca),
    );
    if (selecionadosList.length === 0) {
      toast.error("Nenhuma cobrança selecionada.");
      return;
    }
    setSalvando(true);
    let count = 0;
    try {
      for (const m of selecionadosList) {
        if (!m.titulo) continue;
        const cob = m.cobranca;
        const extra = Math.max(0, cob.valor_pago - cob.valor_original);
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
          },
        });
        count++;
      }
      toast.success(`${count} lançamento(s) baixado(s) como PAGO.`);
      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao baixar lançamentos do PDF.");
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="card-panel p-3 bg-white border border-border/60">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Lidas</p>
              <p className="text-lg font-black">{matches.length}</p>
            </div>
            <div className="card-panel p-3 bg-white border border-border/60">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Conciliadas</p>
              <p className="text-lg font-black text-emerald-600">{conciliados.length}</p>
            </div>
            <div className="card-panel p-3 bg-white border border-border/60">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Já pagas</p>
              <p className="text-lg font-black text-slate-500">{jaPagos.length}</p>
            </div>
            <div className="card-panel p-3 bg-white border border-border/60">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Não encontradas</p>
              <p className="text-lg font-black text-amber-600">{naoEncontrados.length}</p>
            </div>
          </div>

          {ignorados.length > 0 && (
            <p className="text-xs text-slate-500">
              {ignorados.length} cobrança(s) ignorada(s) por status não pago.
            </p>
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
                return (
                  <div key={cob.numero_cobranca} className="p-3 rounded-xl border bg-amber-50/40">
                    <p className="text-xs font-bold text-slate-800">
                      {cob.nome_cliente} • Doc {cob.documento}
                    </p>
                    <p className="text-xs text-slate-500">
                      Venc. {cob.data_vencimento} • Original {formatCurrency(cob.valor_original)} •
                      Pago {formatCurrency(cob.valor_pago)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {jaPagos.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500">Já pagas (ignoradas):</p>
              {jaPagos.map((m) => {
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
            {selecionados.size} de {conciliados.length} selecionada(s)
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
