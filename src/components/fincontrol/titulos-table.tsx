import {
  AlertTriangle,
  CircleCheck,
  Clock,
  ExternalLink,
  FileText,
  FolderOpen,
  Link2,
  MessageCircle,
  Pencil,
  Trash2,
} from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  computeRow,
  formatCurrency,
  getDiasVencido,
  getVencimentoDate,
  isActiveSubscription,
  isTituloVencido,
  parseNumber,
  type Titulo,
} from "@/lib/fincontrol";
import { calcularEncargosTitulo } from "@/lib/configuracoes-financeiras";
import type { ConfiguracoesFinanceiras } from "@/lib/configuracoes-financeiras";
import type { Totais } from "@/lib/totais";
import type { Cliente } from "@/lib/clientes";

export function TitulosTable({
  titulos,
  totais,
  selecionados,
  onToggle,
  onToggleTodos,
  onEditar,
  onWhatsApp,
  onRelatorio,
  onAlternarSituacao,
  onExcluir,
  valoresVisiveis,
  config,
  clientes,
  onAlterarMensagemSistema,
}: {
  titulos: Titulo[];
  totais: Totais;
  selecionados: Set<string>;
  onToggle: (id: string) => void;
  onToggleTodos: (marcar: boolean) => void;
  onEditar: (titulo: Titulo) => void;
  onWhatsApp: (titulo: Titulo) => void;
  onRelatorio: (titulo: Titulo) => void;
  onAlternarSituacao: (titulo: Titulo) => void;
  onExcluir: (titulo: Titulo) => void;
  valoresVisiveis: boolean;
  /** Configuração financeira para calcular encargos (juros/multa) dinamicamente em títulos em aberto. */
  config?: ConfiguracoesFinanceiras | null;
  /** Lista de clientes cadastrados (usada para resolver o Cód. Site via cliente_id). */
  clientes?: Cliente[];
  /** Callback para alterar a mensagem do sistema de um cliente diretamente na tabela. */
  onAlterarMensagemSistema?: (clienteId: string, valor: string) => void;
}) {
  const todosMarcados = titulos.length > 0 && titulos.every((t) => selecionados.has(t.id));
  const moeda = (valor: number) => (valoresVisiveis ? formatCurrency(valor) : "R$ ••••••");

  const clientesPorId = new Map((clientes ?? []).map((c) => [c.id, c.codigo_site]));
  const mensagemPorId = new Map((clientes ?? []).map((c) => [c.id, c.mensagem_sistema ?? "Normal"]));
  const contatoPorId = new Map((clientes ?? []).map((c) => [c.id, c.nome_contato ?? null]));

  /** Retorna o valor total com juros e multa para exibição.
   * Se já houver valor_total salvo (reajuste aplicado), usa ele.
   * Senão, se o título está vencido em aberto e temos config, calcula dinamicamente.
   */
  function obterValorTotal(titulo: Titulo): number {
    const calc = computeRow(titulo);
    if (titulo.valor_total != null) return calc.valorTotal;
    if (titulo.situacao !== "PAGO" && isTituloVencido(titulo) && config) {
      const encargos = calcularEncargosTitulo({
        valorNominal: parseNumber(titulo.mensal_site),
        diasAtraso: getDiasVencido(titulo),
        config,
      });
      return encargos.valorTotal;
    }
    return calc.valorTotal;
  }

  type MensagemSistema = "Normal" | "Bloqueado" | "Atualização" | "Cobrança";

  const MSG_CONFIG: Record<MensagemSistema, { label: string; className: string }> = {
    Normal: { label: "Normal", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    Bloqueado: { label: "Bloqueado", className: "border-rose-200 bg-rose-50 text-rose-700" },
    Atualização: { label: "Atualização", className: "border-blue-200 bg-blue-50 text-blue-700" },
    Cobrança: { label: "Cobrança", className: "border-amber-200 bg-amber-50 text-amber-700" },
  };

  function codigoSiteLink(codigo: string | null | undefined) {
    if (!codigo) return null;
    return (
      <a
        href={`http://sistemaspratico.com.br/licenca/Cliente/Edit/${codigo}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded-md border border-transparent bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand hover:bg-brand hover:text-white transition-colors"
        title="Abrir no site do cliente"
      >
        {codigo}
        <ExternalLink className="size-3" />
      </a>
    );
  }

  function mensagemBadge(clienteId: string | undefined, valor: string | null | undefined) {
    const msg = (valor ?? "Normal") as MensagemSistema;
    const config = MSG_CONFIG[msg];
    const podeAlterar = Boolean(clienteId && onAlterarMensagemSistema);
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${config.className} hover:opacity-90 transition-colors ${!podeAlterar ? "opacity-60 cursor-default" : ""}`}
            disabled={!podeAlterar}
            title={podeAlterar ? `Alterar mensagem do sistema (atual: ${config.label})` : undefined}
          >
            {config.label}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="text-xs">
          {Object.entries(MSG_CONFIG).map(([chave, item]) => {
            const chaveMsg = chave as MensagemSistema;
            const ativo = chaveMsg === msg;
            const className = `border-b border-border/50 last:border-0 text-sm ${ativo ? "bg-accent text-accent-foreground" : ""}`;
            return (
              <DropdownMenuItem
                key={chave}
                className={className}
                onSelect={() => {
                  if (clienteId) onAlterarMensagemSistema?.(clienteId, chaveMsg);
                }}
              >
                {item.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="card-panel overflow-hidden bg-white border border-border">
      <div className="scroll-slim overflow-x-auto">
        <table className="w-full whitespace-nowrap text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3.5 text-center w-10">
                <Checkbox
                  checked={todosMarcados}
                  onCheckedChange={(checked) => onToggleTodos(checked === true)}
                  aria-label="Selecionar todos"
                  className="rounded-full"
                />
              </th>
              <th className="px-4 py-3.5">CLIENTE / ASSINATURA</th>
              <th className="px-4 py-3.5 text-center">COD. SITE</th>
              <th className="px-4 py-3.5 text-center">MSG. SISTEMA</th>
              <th className="px-4 py-3.5 text-center">SITUAÇÃO</th>
              <th className="px-4 py-3.5 text-center">VENCIMENTO</th>
              <th className="px-4 py-3.5 text-center">AÇÕES</th>
              <th className="px-4 py-3.5">CNPJ / TELEFONE</th>
              <th className="px-4 py-3.5 text-right">VALOR</th>
              <th className="px-4 py-3.5 text-right">REPASSE FRANCISCO</th>
              <th className="px-4 py-3.5 text-right">LUCRO FELIPE</th>
              <th className="px-4 py-3.5 text-right">VALOR COM JUROS E MULTA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {titulos.map((titulo) => {
              const calc = computeRow(titulo);
              const ativa = isActiveSubscription(titulo);
              const vencido = isTituloVencido(titulo);
              const diasAtraso = vencido ? getDiasVencido(titulo) : 0;
              const dataVencimento = getVencimentoDate(titulo);
              const dataVencimentoFmt = dataVencimento
                ? dataVencimento.toLocaleDateString("pt-BR")
                : "—";
              const clienteId = titulo.cliente_id;
              const msgSistema = mensagemPorId.get(clienteId ?? "") ?? "Normal";
              const nomeContato = contatoPorId.get(clienteId ?? "") ?? null;
              const isPagoBloqueado =
                titulo.situacao === "PAGO" && msgSistema === "Bloqueado";

              return (
                <tr
                  key={titulo.id}
                  className="transition-colors bg-white hover:bg-slate-50 border-b border-slate-50/50"
                >
                  <td className="px-4 py-3.5 text-center">
                    <Checkbox
                      checked={selecionados.has(titulo.id)}
                      onCheckedChange={() => onToggle(titulo.id)}
                      aria-label={`Selecionar ${titulo.cliente}`}
                      className="rounded-full"
                    />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col gap-1">
                      <p className="font-bold text-foreground tracking-tight">
                        {titulo.cliente}
                      </p>
                      {!ativa && (
                        <span
                          className={
                            titulo.tipo_cobranca === "RECORRENTE" && !ativa
                              ? "inline-flex items-center gap-1 rounded bg-destructive/20 border border-destructive/40 px-2 py-0.5 text-xs font-semibold text-destructive"
                              : "inline-flex items-center gap-1 rounded bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground"
                          }
                        >
                          {titulo.tipo_cobranca === "RECORRENTE" && !ativa
                            ? "🔴 cancelada"
                            : "avulso"}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {clienteId ? (
                      codigoSiteLink(clientesPorId.get(clienteId) ?? undefined) ?? (
                        <span className="text-xs text-muted-foreground">—</span>
                      )
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {clienteId ? mensagemBadge(clienteId, msgSistema) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <button
                      type="button"
                      onClick={() => onAlternarSituacao(titulo)}
                      className={
                        titulo.situacao === "PAGO"
                          ? "inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                          : vencido
                            ? "inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                            : "inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                      }
                    >
                      <span
                        className={`size-2 rounded-full ${
                          titulo.situacao === "PAGO"
                            ? "bg-emerald-600"
                            : vencido
                              ? "bg-rose-500 animate-pulse"
                              : "bg-slate-400"
                        }`}
                      />
                      {titulo.situacao === "PAGO"
                        ? "PAGO"
                        : vencido
                          ? `VENCIDO (${diasAtraso}d)`
                          : "ABERTO"}
                    </button>
                    {isPagoBloqueado && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-slate-700 font-semibold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                        <AlertTriangle className="size-3" />
                        Liberar acesso (MSG Bloqueado)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <p
                      className={`text-sm font-bold ${vencido ? "text-destructive" : "text-foreground"}`}
                    >
                      {dataVencimentoFmt}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Dia {titulo.vencimento}
                      {vencido && diasAtraso ? ` · ${diasAtraso}d atrás` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-center gap-1.5">
                      {(vencido || titulo.situacao === "ABERTO") ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1.5 rounded-full border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                          title="Cobrar no WhatsApp"
                          onClick={() => onWhatsApp(titulo)}
                        >
                          <MessageCircle className="size-4 text-slate-600" />
                          Cobrar
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1.5 rounded-full border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                          title="Enviar comprovante"
                          onClick={() => onWhatsApp(titulo)}
                        >
                          <MessageCircle className="size-4 text-slate-600" />
                          Enviar
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8 text-slate-600 hover:text-slate-900"
                        title="Relatório do cliente"
                        onClick={() => onRelatorio(titulo)}
                      >
                        <FileText className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8 text-slate-600 hover:text-slate-900"
                        title="Editar"
                        onClick={() => onEditar(titulo)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8 text-destructive/70 hover:text-destructive"
                        title="Excluir"
                        onClick={() => onExcluir(titulo)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-mono text-slate-900 text-sm tabular-nums">
                      {titulo.cnpj || "—"}
                    </p>
                    {nomeContato && (
                      <p className="text-xs text-slate-500 truncate" title={nomeContato}>
                        {nomeContato}
                      </p>
                    )}
                    <p className="text-xs text-slate-500">
                      {titulo.telefone || "sem telefone"}
                    </p>
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-slate-900 tabular-nums">
                    {moeda(calc.mensalReal)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-slate-500 font-medium tabular-nums">
                    {moeda(calc.lucroFrancisco)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-slate-900 tabular-nums">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-default">{moeda(calc.lucroFelipe)}</span>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <div className="space-x-1 text-left">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Mensal Site</span>
                            <span className="font-medium">{moeda(calc.mensalSite)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Custo Boleto</span>
                            <span className="font-medium">{moeda(calc.custoBoleto)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">% Francisco</span>
                            <span className="font-medium">{calc.franciscoPct}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Custo Total</span>
                            <span className="font-medium">{moeda(calc.custoBltFra)}</span>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-slate-900 tabular-nums">
                    {moeda(obterValorTotal(titulo))}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {titulos.length > 0 ? (
            <tfoot className="border-t border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <td className="p-3.5" colSpan={4}>
                  TOTAIS (filtrados)
                </td>
                <td className="p-3.5 text-center">--</td>
                <td className="p-3.5 text-center">--</td>
                <td className="p-3.5 text-center">--</td>
                <td className="p-3.5 text-center">--</td>
                <td className="p-3.5 text-right text-slate-900 tabular-nums font-bold">
                  {moeda(totais.mensalSite)}
                </td>
                <td className="p-3.5 text-right text-slate-500 tabular-nums font-medium">
                  {moeda(totais.lucroFrancisco)}
                </td>
                <td className="p-3.5 text-right text-slate-900 tabular-nums font-bold">
                  {moeda(totais.lucroFelipe)}
                </td>
                <td className="p-3.5 text-right text-slate-900 tabular-nums font-bold">
                  {moeda(totais.valorTotal)}
                </td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      {titulos.length === 0 ? (
        <div className="space-y-3 p-12 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <FolderOpen className="size-7" />
          </div>
          <p className="text-base font-bold">Nenhum cliente ou lançamento encontrado</p>
          <p className="mx-auto max-w-md text-xs text-muted-foreground">
            Use “Lançar cliente” para inserir manualmente ou importe a sua planilha de contas a
            receber.
          </p>
        </div>
      ) : null}
    </div>
  );
}
