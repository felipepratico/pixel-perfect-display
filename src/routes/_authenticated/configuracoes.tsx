import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  calcularEncargosTitulo,
  buscarConfiguracaoFinanceira,
  salvarConfiguracaoFinanceira,
  type ConfiguracoesFinanceiras,
} from "@/lib/configuracoes-financeiras";
import { computeRow, isTituloVencido, type TituloInput } from "@/lib/fincontrol";
import { getDiasVencido } from "@/lib/fincontrol";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { useTituloMutations, useTitulos } from "@/lib/use-titulos";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — UPSYSTEM FINCONTROL" },
    ],
  }),
  component: Configuracoes,
});

function Configuracoes() {
  const { data: todos = [], isLoading } = useTitulos();
  const { patchMany } = useTituloMutations();

  const [config, setConfig] = useState<ConfiguracoesFinanceiras | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [mesReferencia, setMesReferencia] = useState("");
  const [aplicando, setAplicando] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    mes: string;
    count: number;
    todos: boolean;
  } | null>(null);

  useEffect(() => {
    carregarConfiguracao();
  }, []);

  async function carregarConfiguracao() {
    const c = await buscarConfiguracaoFinanceira();
    setConfig(c);
  }

  async function salvar() {
    if (!config) return;
    setIsSaving(true);
    const atualizado = await salvarConfiguracaoFinanceira({
      percentual_repasse_francisco: config.percentual_repasse_francisco,
      multa_atraso_percentual: config.multa_atraso_percentual,
      juros_diario_percentual: config.juros_diario_percentual,
      custo_boleto_padrao: config.custo_boleto_padrao,
    });
    setIsSaving(false);
    if (atualizado) {
      setConfig(atualizado);
      toast.success("Parâmetros salvos com sucesso.");
    } else {
      toast.error("Não foi possível salvar os parâmetros.");
    }
  }

  function campoNumerico(
    label: string,
    valor: number,
    onChange: (v: number) => void,
    sufixo = "",
    passo = 0.01,
  ) {
    return (
      <div className="space-y-1">
        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {label}
        </Label>
        <Input
          type="number"
          step={passo}
          value={valor}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="text-sm text-slate-900 tabular-nums"
          placeholder="0"
        />
        <span className="text-[10px] text-slate-400">{sufixo}</span>
      </div>
    );
  }

  async function aplicarReajuste() {
    if (!mesReferencia) {
      toast.error("Informe o mês/ano de referência.");
      return;
    }

    const titulosMes = todos.filter((t) => t.mes_ano === mesReferencia);
    const abertos = titulosMes.filter((t) => t.situacao === "ABERTO");

    if (!abertos.length) {
      toast.info("Nenhum lançamento aberto encontrado para este mês.");
      return;
    }

    setConfirmDialog({ mes: mesReferencia, count: abertos.length, todos: false });
  }

  async function aplicarReajusteTodos() {
    const abertos = todos.filter((t) => t.situacao === "ABERTO");

    if (!abertos.length) {
      toast.info("Nenhum lançamento aberto encontrado.");
      return;
    }

    setConfirmDialog({ mes: "todos", count: abertos.length, todos: true });
  }

  async function confirmarAplicar() {
    if (!confirmDialog || !config) return;

    const abertos = confirmDialog.todos
      ? todos.filter((t) => t.situacao === "ABERTO")
      : todos.filter((t) => t.mes_ano === confirmDialog.mes && t.situacao === "ABERTO");

    setAplicando(true);

    try {
      const atualizacoes = abertos.map((t) => {
        const calc = computeRow(t);
        const encargos = calcularEncargosTitulo({
          valorNominal: calc.mensalSite,
          diasAtraso: isTituloVencido(t) ? getDiasVencido(t) : 0,
          config,
        });

        return {
          id: t.id,
          values: {
            valor_nominal: encargos.valorNominal,
            valor_juros: encargos.valorJuros,
            valor_multa: encargos.valorMulta,
            valor_total: encargos.valorTotal,
            percentual_francisco_aplicado: encargos.percentualFranciscoAplicado,
            valor_repasse_francisco: encargos.valorRepasseFrancisco,
            lucro_liquido_felipe: encargos.lucroLiquidoFelipe,
          },
        };
      });

      for (const atualizacao of atualizacoes) {
        await patchMany.mutateAsync({
          ids: [atualizacao.id],
          values: atualizacao.values as Partial<TituloInput>,
        });
      }

      toast.success(
        `Reajuste aplicado em ${atualizacoes.length} lançamento(s)${
          confirmDialog.todos ? " (todos)" : ` de ${confirmDialog.mes}`
        }.`,
      );
      setConfirmDialog(null);
      setAplicando(false);
    } catch (error) {
      setAplicando(false);
      toast.error("Erro ao aplicar reajuste.");
      console.error(error);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="size-6 animate-spin rounded-full border-b-3 border-slate-800" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-sm font-semibold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <svg className="size-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Configurações
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Parâmetros globais de taxas, encargos e regras de cálculo para lançamentos e assinaturas.
            </p>
          </div>
          <Link to="/painel" className="text-sm text-slate-500 hover:text-slate-800">
            ← Voltar ao painel
          </Link>
        </div>

        {/* Bloco 1: Parâmetros Globais Vigentes */}
        <Card className="border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <svg className="size-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Parâmetros Globais Vigentes
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {campoNumerico(
                "Percentual Repasse Francisco (%)",
                config?.percentual_repasse_francisco ?? 5,
                (v) => setConfig({ ...config!, percentual_repasse_francisco: v }),
                "%",
                0.01,
              )}
              {campoNumerico(
                "Multa por Atraso (%)",
                config?.multa_atraso_percentual ?? 5,
                (v) => setConfig({ ...config!, multa_atraso_percentual: v }),
                "%",
                0.01,
              )}
              {campoNumerico(
                "Juros Mora Diário (%)",
                config?.juros_diario_percentual ?? 0.33,
                (v) => setConfig({ ...config!, juros_diario_percentual: v }),
                "% ao dia",
                0.01,
              )}
              {campoNumerico(
                "Custo Padrão Boleto (R$)",
                config?.custo_boleto_padrao ?? 3.45,
                (v) => setConfig({ ...config!, custo_boleto_padrao: v }),
                "R$",
                0.01,
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                onClick={salvar}
                disabled={isSaving || !config}
                className="bg-slate-800 text-white hover:bg-slate-900 shadow-sm"
              >
                Salvar Parâmetros
              </Button>
            </div>
          </div>
        </Card>

        <Separator className="my-8" />

        {/* Bloco 2: Ação em Lote (Virada de Mês / Reajuste) */}
        <Card className="border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <svg className="size-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Ação em Lote (Virada de Mês / Reajuste)
            </h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-500 mb-4">
              Aplique o percentual atual do Francisco a todos os lançamentos abertos de um mês
              específico. Meses anteriores já fechados ou pagos não são alterados.
            </p>
            <div className="flex items-center gap-3 mb-4">
              <Label htmlFor="mes-referencia" className="text-xs font-semibold text-slate-500 shrink-0">
                Mês de referência:
              </Label>
              <Input
                id="mes-referencia"
                type="text"
                maxLength={7}
                placeholder="MM/AAAA"
                value={mesReferencia}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9/]/g, "").substring(0, 7);
                  setMesReferencia(v);
                }}
                className="w-32 text-sm text-slate-900"
              />
              <Button
                onClick={aplicarReajuste}
                disabled={aplicando || !mesReferencia || !config}
                className="bg-slate-800 text-white hover:bg-slate-900 shadow-sm"
              >
                Aplicar percentual atual a lançamentos em aberto deste mês
              </Button>
              <Button
                onClick={aplicarReajusteTodos}
                disabled={aplicando || !config}
                className="bg-slate-700 text-white hover:bg-slate-600 shadow-sm"
              >
                Aplicar para todos os lançamentos em aberto
              </Button>
            </div>
            {config && todos.length > 0 && (
              <div className="bg-slate-50 rounded-lg border border-slate-100 p-4 text-sm">
                <p className="text-slate-500 text-xs mb-2">
                  Lançamentos do mês {mesReferencia || "—"}:{" "}
                  {todos.filter((t) => t.mes_ano === mesReferencia).length} total ·
                  {todos.filter((t) => t.mes_ano === mesReferencia && t.situacao === "ABERTO").length}
                  em aberto
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Dialog de confirmação do reajuste */}
        {confirmDialog && (
          <AlertDialog open={!!confirmDialog} onOpenChange={(o) => !o && setConfirmDialog(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar reajuste</AlertDialogTitle>
                <AlertDialogDescription>
                  {confirmDialog.todos ? (
                    <>
                      Aplicar o percentual atual do Francisco (
                      {config?.percentual_repasse_francisco ?? 5}%
                      ) a <b>{confirmDialog.count}</b> lançamento(s) em aberto de <b>todos os
                      meses</b>?
                    </>
                  ) : (
                    <>
                      Aplicar o percentual atual do Francisco (
                      {config?.percentual_repasse_francisco ?? 5}%
                      ) a <b>{confirmDialog.count}</b> lançamento(s) em aberto do mês{" "}
                      <b>{confirmDialog.mes}</b>?
                    </>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setConfirmDialog(null)}>
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction onClick={confirmarAplicar} disabled={aplicando}>
                  {aplicando ? "Aplicando..." : "Confirmar reajuste"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
