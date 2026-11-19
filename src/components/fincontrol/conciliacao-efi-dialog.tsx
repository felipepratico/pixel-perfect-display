import {
  AlertCircle,
  ArrowRight,
  BookmarkCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  FileCode,
  FileSpreadsheet,
  HelpCircle,
  Link2,
  RefreshCw,
  Search,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  calcularValoresBaixaTitulo,
  conciliarItensExtrato,
  parseItemExtratoEfi,
  salvarAliasBancario,
  type ClienteAliasBancario,
  type ItemExtratoEfi,
  type MatchConciliacao,
} from "@/lib/conciliacao-efi";
import type { ConfiguracoesFinanceiras } from "@/lib/configuracoes-financeiras";
import { formatCurrency, parseNumber, type ClienteRef, type Titulo } from "@/lib/fincontrol";
import { useTituloMutations } from "@/lib/use-titulos";

export function ConciliacaoEfiDialog({
  open,
  titulosAbertos,
  clientesCadastrados,
  aliasesBancarios,
  aliasesCnpj,
  configFinanceira,
  initialJsonData,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  titulosAbertos: Titulo[];
  clientesCadastrados: ClienteRef[];
  aliasesBancarios: ClienteAliasBancario[];
  aliasesCnpj?: any[];
  configFinanceira: ConfiguracoesFinanceiras | null;
  initialJsonData?: ItemExtratoEfi[] | null;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const { patchMany } = useTituloMutations();

  const [matches, setMatches] = useState<MatchConciliacao[]>([]);
  const [activeTab, setActiveTab] = useState<"encontrados" | "nao-encontrados">("encontrados");
  const [carregandoArquivo, setCarregandoArquivo] = useState(false);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const [salvandoBaixa, setSalvandoBaixa] = useState(false);
  const [filtroBusca, setFiltroBusca] = useState("");

  // Processa arquivo JSON carregado pelo usuário
  async function processarArquivoJson(file: File) {
    setCarregandoArquivo(true);
    setErroArquivo(null);

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      const arrayItens: ItemExtratoEfi[] = Array.isArray(json)
        ? json
        : Array.isArray(json.data)
          ? json.data
          : Array.isArray(json.items)
            ? json.items
            : [json];

      if (arrayItens.length === 0) {
        setErroArquivo("O arquivo JSON não contém lançamentos de extrato válidos.");
        setCarregandoArquivo(false);
        return;
      }

      const itensProcessados = arrayItens
        .map((it, idx) => parseItemExtratoEfi(it, idx))
        .filter((it): it is NonNullable<typeof it> => it !== null);

      if (itensProcessados.length === 0) {
        setErroArquivo("Nenhum item válido com campo 'Tipo' foi encontrado no JSON.");
        setCarregandoArquivo(false);
        return;
      }

      const resultado = conciliarItensExtrato({
        itens: itensProcessados,
        titulosAbertos,
        aliases: aliasesBancarios,
        aliasesCnpj: aliasesCnpj ?? [],
        clientesCadastrados,
      });

      setMatches(resultado);

      const encontradosCount = resultado.filter((m) => m.titulo !== null).length;
      const naoEncontradosCount = resultado.length - encontradosCount;

      toast.success(
        `Extrato lido com sucesso: ${encontradosCount} identificado(s) e ${naoEncontradosCount} pendente(s).`,
      );

      if (encontradosCount === 0 && naoEncontradosCount > 0) {
        setActiveTab("nao-encontrados");
      } else {
        setActiveTab("encontrados");
      }
    } catch (err) {
      console.error("Erro ao ler JSON da Efí:", err);
      setErroArquivo(
        "Não foi possível processar o arquivo. Verifique se o formato é um JSON válido da Efí.",
      );
    } finally {
      setCarregandoArquivo(false);
    }
  }

  // Se já veio com dados iniciais (ex: selecionado pelo dialog principal)
  useMemo(() => {
    if (initialJsonData && initialJsonData.length > 0 && matches.length === 0) {
      const itens = initialJsonData
        .map((it, idx) => parseItemExtratoEfi(it, idx))
        .filter((it): it is NonNullable<typeof it> => it !== null);

      const res = conciliarItensExtrato({
        itens,
        titulosAbertos,
        aliases: aliasesBancarios,
        aliasesCnpj: aliasesCnpj ?? [],
        clientesCadastrados,
      });
      setMatches(res);
    }
  }, [initialJsonData, titulosAbertos, aliasesBancarios, clientesCadastrados, matches.length]);

  const encontrados = useMemo(
    () => matches.filter((m) => m.titulo !== null),
    [matches],
  );

  const naoEncontrados = useMemo(
    () => matches.filter((m) => m.titulo === null),
    [matches],
  );

  const selecionadosBaixa = useMemo(
    () => encontrados.filter((m) => m.selecionadoParaBaixa),
    [encontrados],
  );

  const totalValorSelecionado = useMemo(
    () => selecionadosBaixa.reduce((acc, m) => acc + m.extrato.valor, 0),
    [selecionadosBaixa],
  );

  // Marcar/Desmarcar seleção de um encontrado
  function toggleSelecao(idExtrato: string) {
    setMatches((prev) =>
      prev.map((m) =>
        m.extrato.id === idExtrato
          ? { ...m, selecionadoParaBaixa: !m.selecionadoParaBaixa }
          : m,
      ),
    );
  }

  // Marcar/Desmarcar todos os encontrados
  function toggleTodosEncontrados(marcar: boolean) {
    setMatches((prev) =>
      prev.map((m) =>
        m.titulo !== null ? { ...m, selecionadoParaBaixa: marcar } : m,
      ),
    );
  }

  // Vincular manualmente um item da aba "Não Encontrados" com um lançamento aberto
  function vincularManualmente(idExtrato: string, tituloId: string, salvarAlias: boolean) {
    const tituloAlvo = titulosAbertos.find((t) => t.id === tituloId);
    if (!tituloAlvo) return;

    setMatches((prev) =>
      prev.map((m) => {
        if (m.extrato.id !== idExtrato) return m;
        return {
          ...m,
          titulo: tituloAlvo,
          clienteNome: tituloAlvo.cliente,
          metodo: "manual",
          confianca: "alta",
          salvarVinculo: salvarAlias,
          selecionadoParaBaixa: true,
        };
      }),
    );

    toast.info(`Lançamento de "${tituloAlvo.cliente}" vinculado.`);
  }

  // Alterar checkbox de salvar vínculo
  function toggleSalvarVinculo(idExtrato: string) {
    setMatches((prev) =>
      prev.map((m) =>
        m.extrato.id === idExtrato
          ? { ...m, salvarVinculo: !m.salvarVinculo }
          : m,
      ),
    );
  }

  // Desvincular um item e devolver para "Não Encontrados"
  function desvincular(idExtrato: string) {
    setMatches((prev) =>
      prev.map((m) =>
        m.extrato.id === idExtrato
          ? {
              ...m,
              titulo: null,
              clienteNome: "",
              metodo: null,
              confianca: "nenhuma",
              selecionadoParaBaixa: false,
            }
          : m,
      ),
    );
  }

  // Executar a baixa em lote de todos os selecionados
  async function executarBaixaLote() {
    if (selecionadosBaixa.length === 0) {
      toast.error("Nenhum lançamento selecionado para confirmação de baixa.");
      return;
    }

    setSalvandoBaixa(true);
    let baixadosCount = 0;
    let aliasesSalvosCount = 0;

    try {
      for (const match of selecionadosBaixa) {
        if (!match.titulo) continue;

        const valoresAtualizados = calcularValoresBaixaTitulo({
          titulo: match.titulo,
          valorPago: match.extrato.valor,
          dataPagamentoIso: match.extrato.dataIso,
          config: configFinanceira,
        });

        // Atualiza o título no Supabase
        await patchMany.mutateAsync({
          ids: [match.titulo.id],
          values: valoresAtualizados,
        });
        baixadosCount++;

        // Se o usuário optou por salvar o vínculo para o futuro
        if (match.salvarVinculo && match.extrato.nomePagador) {
          const clienteId =
            match.titulo.cliente_id ||
            clientesCadastrados.find((c) => c.razao_social === match.titulo?.cliente)?.id;

          if (clienteId) {
            const aliasSalvo = await salvarAliasBancario(clienteId, match.extrato.nomePagador);
            if (aliasSalvo) aliasesSalvosCount++;
          }
        }
      }

      toast.success(
        `${baixadosCount} lançamento(s) baixado(s) como PAGO com sucesso!${
          aliasesSalvosCount > 0 ? ` (${aliasesSalvosCount} novo(s) vínculo(s) salvo(s))` : ""
        }`,
      );

      // Remove os baixados da lista
      const idsBaixados = new Set(selecionadosBaixa.map((m) => m.extrato.id));
      setMatches((prev) => prev.filter((m) => !idsBaixados.has(m.extrato.id)));

      if (onSuccess) onSuccess();

      if (matches.length === selecionadosBaixa.length) {
        onOpenChange(false);
      }
    } catch (err) {
      console.error("Erro ao processar baixa em lote:", err);
      toast.error("Ocorreu um erro ao baixar os lançamentos. Verifique o console.");
    } finally {
      setSalvandoBaixa(false);
    }
  }

  function badgeMetodo(metodo: MatchConciliacao["metodo"]) {
    switch (metodo) {
      case "alias":
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-200 gap-1 text-[10px]">
            <BookmarkCheck className="size-3" />
            Vínculo Salvo
          </Badge>
        );
      case "nome_exato":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1 text-[10px]">
            <CheckCircle2 className="size-3" />
            Nome Exato
          </Badge>
        );
      case "nome_similar":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 gap-1 text-[10px]">
            <Sparkles className="size-3" />
            Similaridade
          </Badge>
        );
      case "manual":
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 gap-1 text-[10px]">
            <Link2 className="size-3" />
            Manual
          </Badge>
        );
      default:
        return null;
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-orange-500/10 text-orange-600">
                <FileCode className="size-5" />
              </span>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Conciliação de Extrato Efí (JSON)
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Importe o relatório de cobranças recebidas e dê baixa automática com cálculo de
                  encargos e repasse.
                </DialogDescription>
              </div>
            </div>
            {matches.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMatches([])}
                className="text-xs text-slate-500 hover:text-slate-900"
              >
                Trocar arquivo
              </Button>
            )}
          </div>
        </DialogHeader>

        {matches.length === 0 ? (
          /* Área de Upload / Dropzone para o arquivo JSON */
          <div className="p-8 space-y-4">
            <label className="group flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-10 text-center transition hover:border-orange-500 hover:bg-orange-50/20">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 group-hover:scale-105 transition-transform">
                <UploadCloud className="size-7" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  Selecione ou arraste seu extrato JSON da Efí
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Formatos aceitos: arquivos <strong>.json</strong> exportados da Efí Bank (extrato
                  ou recebimentos de cobrança).
                </p>
              </div>
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                disabled={carregandoArquivo}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void processarArquivoJson(file);
                }}
              />
            </label>

            {carregandoArquivo && (
              <div className="flex items-center justify-center gap-2 py-4 text-xs font-semibold text-slate-600">
                <RefreshCw className="size-4 animate-spin text-orange-600" />
                Processando e conciliando lançamentos...
              </div>
            )}

            {erroArquivo && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                <AlertCircle className="size-4 shrink-0 text-red-600" />
                <span>{erroArquivo}</span>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 text-xs text-slate-600">
              <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-orange-500" />
                Como a conciliação inteligente funciona:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-500">
                <li>
                  Lê pagamentos como:{" "}
                  <code className="text-slate-800 font-mono text-[11px] bg-slate-100 px-1 rounded">
                    Recebimento de cobrança • 1080800445 de MINI MERCADO
                  </code>
                </li>
                <li>
                  Localiza lançamentos em aberto prioritariamente por vínculos bancários salvos e
                  depois por similaridade de nome e valor.
                </li>
                <li>
                  Ao confirmar, os juros/multas ficam 100% com você e o repasse é calculado apenas
                  sobre o valor nominal.
                </li>
              </ul>
            </div>
          </div>
        ) : (
          /* Visualizador de Conciliação em 2 Abas */
          <div className="flex-1 overflow-hidden flex flex-col p-6 space-y-4">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as any)}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between pb-2 border-b">
                <TabsList className="grid grid-cols-2 w-72">
                  <TabsTrigger value="encontrados" className="text-xs font-semibold">
                    Encontrados ({encontrados.length})
                  </TabsTrigger>
                  <TabsTrigger value="nao-encontrados" className="text-xs font-semibold">
                    Não Encontrados ({naoEncontrados.length})
                  </TabsTrigger>
                </TabsList>

                {activeTab === "encontrados" && encontrados.length > 0 && (
                  <div className="flex items-center gap-3 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-600 select-none">
                      <Checkbox
                        checked={
                          selecionadosBaixa.length === encontrados.length &&
                          encontrados.length > 0
                        }
                        onCheckedChange={(checked) => toggleTodosEncontrados(checked === true)}
                      />
                      <span>Selecionar todos ({encontrados.length})</span>
                    </label>
                  </div>
                )}
              </div>

              {/* ABA 1: ENCONTRADOS */}
              <TabsContent
                value="encontrados"
                className="flex-1 overflow-y-auto scroll-slim space-y-2.5 mt-3 pr-1"
              >
                {encontrados.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 space-y-2">
                    <HelpCircle className="size-8 mx-auto text-slate-400 stroke-1" />
                    <p className="text-sm font-semibold">Nenhum lançamento foi conciliado automaticamente.</p>
                    <p className="text-xs text-slate-400">
                      Acesse a aba <strong>Não Encontrados</strong> para vincular manualmente os
                      clientes com os lançamentos em aberto.
                    </p>
                  </div>
                ) : (
                  encontrados.map((m) => {
                    const t = m.titulo!;
                    const mesmoValor = Math.abs(parseNumber(t.mensal_site) - m.extrato.valor) < 0.05;

                    return (
                      <div
                        key={m.extrato.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all ${
                          m.selecionadoParaBaixa
                            ? "bg-slate-50/80 border-slate-300"
                            : "bg-white border-slate-200 opacity-60"
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <Checkbox
                            checked={m.selecionadoParaBaixa}
                            onCheckedChange={() => toggleSelecao(m.extrato.id)}
                            className="mt-1"
                          />
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-sm text-slate-900 truncate">
                                {m.extrato.nomePagador}
                              </span>
                              {badgeMetodo(m.metodo)}
                              {m.extrato.cobrancaId && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  ID: {m.extrato.cobrancaId}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                              <span className="text-slate-400">Título no sistema:</span>
                              <strong className="text-slate-800 font-semibold">{t.cliente}</strong>
                              <span>• Mês {t.mes_ano}</span>
                              <span>• Vencimento dia {t.vencimento}</span>
                            </div>

                            {m.salvarVinculo && (
                              <label className="flex items-center gap-1.5 text-[11px] text-purple-700 font-medium cursor-pointer pt-0.5 select-none">
                                <Checkbox
                                  checked={m.salvarVinculo}
                                  onCheckedChange={() => toggleSalvarVinculo(m.extrato.id)}
                                  className="size-3.5"
                                />
                                <span>Salvar vínculo para próximas importações</span>
                              </label>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0">
                          <div className="text-right">
                            <div className="text-sm font-extrabold text-emerald-600 tabular-nums">
                              {formatCurrency(m.extrato.valor)}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Pago em {m.extrato.dataOriginal}
                            </div>
                            {!mesmoValor && (
                              <div className="text-[10px] text-amber-600 font-medium">
                                Nominal: {formatCurrency(parseNumber(t.mensal_site))}
                              </div>
                            )}
                          </div>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => desvincular(m.extrato.id)}
                            title="Desvincular e mover para Não Encontrados"
                            className="size-8 text-slate-400 hover:text-red-600"
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </TabsContent>

              {/* ABA 2: NÃO ENCONTRADOS */}
              <TabsContent
                value="nao-encontrados"
                className="flex-1 overflow-y-auto scroll-slim space-y-3 mt-3 pr-1"
              >
                {naoEncontrados.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 space-y-2">
                    <CheckCircle2 className="size-8 mx-auto text-emerald-500" />
                    <p className="text-sm font-semibold">
                      Todos os pagamentos do extrato foram conciliados!
                    </p>
                    <p className="text-xs text-slate-400">
                      Volte para a aba <strong>Encontrados</strong> para confirmar a baixa em lote.
                    </p>
                  </div>
                ) : (
                  naoEncontrados.map((m) => {
                    // Ordena títulos abertos destacando os que possuem o mesmo valor do extrato
                    const titulosOrdenados = [...titulosAbertos].sort((a, b) => {
                      const diffA = Math.abs(parseNumber(a.mensal_site) - m.extrato.valor);
                      const diffB = Math.abs(parseNumber(b.mensal_site) - m.extrato.valor);
                      return diffA - diffB;
                    });

                    return (
                      <div
                        key={m.extrato.id}
                        className="p-4 rounded-xl border border-slate-200 bg-white space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900">
                                {m.extrato.nomePagador}
                              </span>
                              <Badge variant="outline" className="text-[10px] text-amber-700 bg-amber-50 border-amber-200">
                                Não Identificado
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {m.extrato.cobrancaId ? `Cobrança • ${m.extrato.cobrancaId} · ` : ""}
                              Protocolo: {m.extrato.protocolo}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-extrabold text-emerald-600 tabular-nums">
                              {formatCurrency(m.extrato.valor)}
                            </span>
                            <span className="block text-[11px] text-slate-400">
                              Data: {m.extrato.dataOriginal}
                            </span>
                          </div>
                        </div>

                        {/* Combobox de Lançamentos em Aberto com destaque de mesmo valor */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                            <span>Vincular ao lançamento em aberto:</span>
                            <span className="text-[11px] font-normal text-slate-400">
                              {titulosAbertos.length} lançamentos abertos disponíveis
                            </span>
                          </label>

                          <Select
                            onValueChange={(tituloId) => {
                              vincularManualmente(m.extrato.id, tituloId, m.salvarVinculo);
                            }}
                          >
                            <SelectTrigger className="w-full text-xs h-9 bg-slate-50 border-slate-200 font-medium">
                              <SelectValue placeholder="Selecione o lançamento correspondente..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {titulosOrdenados.map((t) => {
                                const mesmoValor =
                                  Math.abs(parseNumber(t.mensal_site) - m.extrato.valor) < 0.05;

                                return (
                                  <SelectItem key={t.id} value={t.id} className="text-xs py-2">
                                    <div className="flex items-center justify-between gap-4 w-full">
                                      <span className="font-semibold text-slate-800">
                                        {t.cliente}{" "}
                                        <span className="text-slate-400 font-normal">
                                          ({t.mes_ano})
                                        </span>
                                      </span>
                                      <div className="flex items-center gap-1.5">
                                        {mesmoValor ? (
                                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] py-0 px-1.5">
                                            ⭐ Mesmo valor ({formatCurrency(parseNumber(t.mensal_site))})
                                          </Badge>
                                        ) : (
                                          <span className="text-slate-500 tabular-nums font-mono text-[11px]">
                                            {formatCurrency(parseNumber(t.mensal_site))}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>

                        <label className="flex items-center gap-2 text-xs text-purple-800 font-medium cursor-pointer pt-1 select-none">
                          <Checkbox
                            checked={m.salvarVinculo}
                            onCheckedChange={() => toggleSalvarVinculo(m.extrato.id)}
                          />
                          <span>
                            Salvar vínculo para próximas importações (gravar na tabela de aliases)
                          </span>
                        </label>
                      </div>
                    );
                  })
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        <DialogFooter className="p-4 border-t bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            {matches.length > 0 && (
              <>
                <span className="font-semibold text-slate-800">
                  {selecionadosBaixa.length} de {encontrados.length} selecionado(s)
                </span>
                <span>•</span>
                <span>Total: {formatCurrency(totalValorSelecionado)}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto text-xs"
            >
              Fechar
            </Button>

            {matches.length > 0 && (
              <Button
                type="button"
                disabled={salvandoBaixa || selecionadosBaixa.length === 0}
                onClick={executarBaixaLote}
                className="w-full sm:w-auto text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-sm"
              >
                {salvandoBaixa ? (
                  <>
                    <RefreshCw className="size-3.5 animate-spin" />
                    Processando baixa...
                  </>
                ) : (
                  <>
                    <CreditCard className="size-3.5" />
                    Confirmar baixa ({selecionadosBaixa.length})
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

