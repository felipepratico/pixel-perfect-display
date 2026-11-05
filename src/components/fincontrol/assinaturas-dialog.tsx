import { CalendarDays, CalendarPlus, Maximize, Minimize, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  chaveClienteDoTitulo,
  chaveDoCliente,
  computeRow,
  formatCurrency,
  mesAnoRank,
  type Titulo,
} from "@/lib/fincontrol";
import { valorContrato, type Cliente } from "@/lib/clientes";

type Linha = {
  chave: string;
  cliente: string;
  valor: number;
  vencimento: number;
  ativa: boolean;
  rank: number;
  ids: string[];
  clienteId: string | null;
  virtual: boolean;
};

type FiltroLinha = "TODOS" | "COM_ASSINATURA" | "SEM_TITULO";

export function AssinaturasDialog({
  open,
  titulos,
  clientes,
  valoresVisiveis,
  mesAnoReferencia,
  gerando,
  onOpenChange,
  onAlternar,
  onNovaAssinatura,
  onGerarTitulo,
  onCriarAssinaturaParaCliente,
}: {
  open: boolean;
  titulos: Titulo[];
  clientes: Cliente[];
  valoresVisiveis: boolean;
  /** Mês de referência exibido no botão de geração rápida. */
  mesAnoReferencia?: string;
  gerando?: boolean;
  onOpenChange: (open: boolean) => void;
  onAlternar: (ids: string[], ativar: boolean, clienteId?: string) => void;
  onNovaAssinatura: () => void;
  /** Gera o título do mês para um cliente ainda sem título. */
  onGerarTitulo?: (clienteId: string) => void;
  /** Abre a pré-confirmação de nova assinatura para um cliente sem título. */
  onCriarAssinaturaParaCliente?: (clienteId: string) => void;
}) {
  const porCliente = new Map<string, Linha>();
  for (const titulo of titulos) {
    if (titulo.tipo_cobranca !== "RECORRENTE") continue;
    const chave = chaveClienteDoTitulo(titulo, clientes);
    const rank = mesAnoRank(titulo.mes_ano) ?? 0;
    const linha: Linha = porCliente.get(chave) ?? {
      chave,
      cliente: titulo.cliente,
      valor: computeRow(titulo).mensalSite,
      vencimento: titulo.vencimento,
      ativa: false,
      rank: -1,
      ids: [],
      clienteId: null,
      virtual: false,
    };
    // Valor e vencimento vêm do mês mais recente do cliente.
    if (rank >= linha.rank) {
      linha.rank = rank;
      linha.cliente = titulo.cliente;
      linha.valor = computeRow(titulo).mensalSite;
      linha.vencimento = titulo.vencimento;
    }
    linha.ativa = linha.ativa || titulo.status_assinatura === "ATIVO";
    linha.ids.push(titulo.id);
    porCliente.set(chave, linha);
  }

  // Sincronização automática: todo cliente ATIVO do cadastro sem nenhum título
  // recorrente entra como assinatura virtual ATIVA. Clientes com título cancelado
  // pela ação do usuário permanecem como CANCELADA (não ressuscitam como ATIVA).
  for (const cliente of clientes) {
    if (cliente.status !== "ATIVO") continue;
    const chave = chaveDoCliente(cliente);
    if (porCliente.has(chave)) continue;
    porCliente.set(chave, {
      chave,
      cliente: cliente.razao_social,
      valor: valorContrato(cliente),
      vencimento: cliente.vencimento,
      ativa: true,
      rank: -1,
      ids: [],
      clienteId: cliente.id,
      virtual: true,
    });
  }

  const linhas = [...porCliente.values()].sort((a, b) => a.cliente.localeCompare(b.cliente));
  const ativas = linhas.filter((linha) => linha.ativa);
  const mrr = ativas.reduce((sum, linha) => sum + linha.valor, 0);

  const [filtroLinha, setFiltroLinha] = useState<FiltroLinha>("TODOS");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [fullscreen, setFullscreen] = useState(false);

  // Aplica o filtro de exibição sobre as linhas já computadas.
  const linhasFiltradas = useMemo(() => {
    switch (filtroLinha) {
      case "COM_ASSINATURA":
        return linhas.filter((linha) => !linha.virtual);
      case "SEM_TITULO":
        return linhas.filter((linha) => linha.virtual);
      default:
        return linhas;
    }
  }, [linhas, filtroLinha]);

  const temSelecao = selecionados.size > 0;
  const selecionadosArray = [...selecionados];

  function toggleSelecao(clienteId: string | null) {
    if (!clienteId) return;
    setSelecionados((prev) => {
      const n = new Set(prev);
      if (n.has(clienteId)) n.delete(clienteId);
      else n.add(clienteId);
      return n;
    });
  }

  function limparSelecao() {
    setSelecionados(new Set());
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`flex flex-col ${
          fullscreen ? "w-[95vw] h-[92vh] max-h-none max-w-none p-4" : "max-w-7xl max-h-[90vh] p-0"
        } overflow-hidden`}
      >
        <DialogHeader className="flex flex-col gap-2 px-3 py-2.5 sm:px-4 border-b border-border/60">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <DialogTitle>Painel de assinaturas recorrentes</DialogTitle>
              <DialogDescription className="text-[11px] text-muted-foreground">
                Reflete diretamente os clientes ATIVOS do cadastro (Clientes e contratos), mesmo sem
                título gerado ainda. Cancelar só afeta títulos existentes; meses futuros são gerados
                via “Gerar meses”.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted"
                onClick={() => setFullscreen((prev) => !prev)}
                aria-label={fullscreen ? "Restaurar tamanho" : "Tela cheia"}
              >
                {fullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
              </Button>
            </div>
          </div>

          {/* Barra de filtros e contagem */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-partner-border bg-partner-soft p-3 text-xs">
            <div className="flex items-center gap-2">
              <Label
                htmlFor="filtroLinhas"
                className="text-[10px] font-bold uppercase text-muted-foreground"
              >
                Clientes
              </Label>
              <div className="inline-flex rounded-md border border-input bg-card">
                <Button
                  id="filtroTodos"
                  type="button"
                  size="sm"
                  variant={filtroLinha === "TODOS" ? "default" : "outline"}
                  className="rounded-l-md h-7 px-2 text-xs"
                  onClick={() => {
                    setFiltroLinha("TODOS");
                    limparSelecao();
                  }}
                >
                  Todos
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={filtroLinha === "COM_ASSINATURA" ? "default" : "outline"}
                  className="rounded-none h-7 px-2 text-xs"
                  onClick={() => {
                    setFiltroLinha("COM_ASSINATURA");
                    limparSelecao();
                  }}
                >
                  Com assinatura
                </Button>
                <Button
                  id="filtroSemTitulo"
                  type="button"
                  size="sm"
                  variant={filtroLinha === "SEM_TITULO" ? "default" : "outline"}
                  className="rounded-r-md h-7 px-2 text-xs"
                  onClick={() => {
                    setFiltroLinha("SEM_TITULO");
                    limparSelecao();
                  }}
                >
                  Sem título gerado
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-bold text-partner">
                MRR ativo estimado:{" "}
                <span className="font-extrabold">
                  {valoresVisiveis ? formatCurrency(mrr) : "R$ ••••••"} /mês
                </span>
              </span>
              {temSelecao ? (
                <div className="flex items-center gap-2 px-2 py-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 text-[11px] font-semibold">
                  {selecionadosArray.length} selecionado(s){" "}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="ml-1 h-6 gap-1 text-emerald-700 border-emerald-600/40"
                    onClick={limparSelecao}
                  >
                    Limpar
                  </Button>
                </div>
              ) : (
                <span className="rounded-full bg-partner px-2.5 py-0.5 font-bold text-partner-foreground">
                  {ativas.length} ativas
                </span>
              )}
              <Button
                type="button"
                size="sm"
                className="h-7 gap-1 text-xs"
                disabled={gerando}
                onClick={onNovaAssinatura}
              >
                <Plus className="size-3.5" />
                Adicionar assinatura
              </Button>
              {temSelecao && onCriarAssinaturaParaCliente ? (
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  className="h-7 gap-1 text-xs bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => {
                    const primeiro = selecionadosArray[0];
                    if (primeiro) onCriarAssinaturaParaCliente(primeiro);
                  }}
                >
                  <CalendarDays className="size-3.5" />
                  Criar assinatura
                </Button>
              ) : null}
            </div>
          </div>
        </DialogHeader>

        {/* Área da tabela: ocupa o espaço vertical disponível com rolagem interna nas linhas */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="scroll-slim h-full overflow-y-auto rounded-2xl border border-border">
            <table className="w-full whitespace-nowrap text-left text-xs">
              <thead className="bg-muted text-[10px] font-bold uppercase text-muted-foreground sticky top-0 z-10">
                <tr>
                  <th className="p-3 text-center">
                    {temSelecao ? (
                      <Checkbox
                        checked={
                          selecionadosArray.length === linhasFiltradas.length &&
                          linhasFiltradas.length > 0
                        }
                        onCheckedChange={(checked) => {
                          if (checked) {
                            linhasFiltradas
                              .filter((l) => l.clienteId)
                              .forEach((l) =>
                                setSelecionados((prev) => new Set([...prev, l.clienteId!])),
                              );
                          } else {
                            limparSelecao();
                          }
                        }}
                      />
                    ) : null}
                  </th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3 text-right">Valor mensal</th>
                  <th className="p-3 text-center">Dia vencimento</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {linhasFiltradas.map((linha) => {
                  const estaSelecionado = selecionados.has(linha.chave);
                  return (
                    <tr key={linha.chave} className={estaSelecionado ? "bg-emerald-50" : ""}>
                      <td className="p-3 text-center">
                        {temSelecao && linha.clienteId ? (
                          <Checkbox
                            checked={estaSelecionado}
                            onCheckedChange={() => toggleSelecao(linha.clienteId)}
                          />
                        ) : null}
                      </td>
                      <td className="p-3 font-bold">
                        {linha.cliente}
                        {linha.virtual ? (
                          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                            Sem título gerado
                          </span>
                        ) : null}
                      </td>
                      <td className="p-3 text-right">
                        {valoresVisiveis ? formatCurrency(linha.valor) : "R$ ••••••"}
                      </td>
                      <td className="p-3 text-center">Dia {linha.vencimento}</td>
                      <td className="p-3 text-center">
                        <span
                          className={
                            linha.ativa
                              ? "rounded-full bg-brand-soft px-2 py-1 font-bold text-brand"
                              : "rounded-full bg-danger-soft px-2 py-1 font-bold text-destructive"
                          }
                        >
                          {linha.ativa ? "ATIVA" : "CANCELADA"}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {linha.virtual ? (
                          linha.clienteId ? (
                            <div className="flex flex-col items-center gap-1">
                              <Button
                                type="button"
                                size="sm"
                                variant={estaSelecionado ? "default" : "outline"}
                                className="h-7 gap-1 text-xs bg-emerald-600 text-white hover:bg-emerald-700"
                                onClick={() => toggleSelecao(linha.clienteId as string)}
                              >
                                Selecionar
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 gap-1 text-xs"
                                disabled={gerando}
                                onClick={() => onGerarTitulo?.(linha.clienteId as string)}
                              >
                                <CalendarPlus className="size-3.5" />
                                Gerar título
                              </Button>
                              {mesAnoReferencia ? (
                                <span className="text-[10px] text-muted-foreground">
                                  {mesAnoReferencia}
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">
                              Use “Gerar meses” para criar títulos
                            </span>
                          )
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant={linha.ativa ? "outline" : "default"}
                            className="h-7 text-xs"
                            onClick={() =>
                              onAlternar(linha.ids, !linha.ativa, linha.clienteId ?? undefined)
                            }
                          >
                            {linha.ativa ? "Cancelar" : "Reativar"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {linhasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      {filtroLinha === "SEM_TITULO"
                        ? "Não há clientes ativos sem título gerado no mês de referência."
                        : "Nenhuma assinatura recorrente cadastrada ainda."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
