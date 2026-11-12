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
  type Titulo,
} from "@/lib/fincontrol";
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
  /** Lista de clientes cadastrados (usada para resolver o Cód. Site via cliente_id). */
  clientes?: Cliente[];
  /** Callback para alterar a mensagem do sistema de um cliente diretamente na tabela. */
  onAlterarMensagemSistema?: (clienteId: string, valor: string) => void;
}) {
  const todosMarcados = titulos.length > 0 && titulos.every((t) => selecionados.has(t.id));
  const moeda = (valor: number) => (valoresVisiveis ? formatCurrency(valor) : "R$ ••••••");

  const clientesPorId = new Map((clientes ?? []).map((c) => [c.id, c.codigo_site]));
  const mensagemPorId = new Map((clientes ?? []).map((c) => [c.id, c.mensagem_sistema ?? "Normal"]));

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
          <thead className="bg-card/90 border-b border-border/60 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-4 text-center w-10">
                <Checkbox
                  checked={todosMarcados}
                  onCheckedChange={(checked) => onToggleTodos(checked === true)}
                  aria-label="Selecionar todos"
                  className="rounded-full"
                />
              </th>
              <th className="px-4 py-4">CLIENTE / ASSINATURA</th>
              <th className="px-4 py-4 text-center">COD. SITE</th>
              <th className="px-4 py-4 text-center">MSG. SISTEMA</th>
              <th className="px-4 py-4 text-center">SITUAÇÃO</th>
              <th className="px-4 py-4 text-center">VENCIMENTO</th>
              <th className="px-4 py-4 text-center">AÇÕES</th>
              <th className="px-4 py-4">CNPJ / TELEFONE</th>
              <th className="px-4 py-4 text-right">MENSAL SITE</th>
              <th className="px-4 py-4 text-right">MENSAL REAL</th>
              <th className="px-4 py-4 text-right">CUSTO BOLETO</th>
              <th className="px-4 py-4 text-center">% FRANCISCO</th>
              <th className="px-4 py-4 text-right">LUCRO FRANCISCO</th>
              <th className="px-4 py-4 text-right">CUSTO (BLT X FRA)</th>
              <th className="px-4 py-4 text-right">LUCRO FELIPE</th>
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
              return (
                <tr
                  key={titulo.id}
                  className={`transition-colors ${
                    vencido
                      ? "bg-destructive/5 hover:bg-destructive/10 border-l-2 border-l-destructive"
                      : "hover:bg-muted/40"
                  }`}
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
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-foreground tracking-tight">{titulo.cliente}</p>
                      {titulo.cliente_id && (
                        <span
                          title="Vinculado ao cadastro de clientes"
                          className="inline-flex items-center gap-0.5 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand"
                        >
                          <Link2 className="size-3" />
                          Cliente
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      {titulo.tipo_cobranca === "RECORRENTE" ? (
                        <span
                          className={
                            ativa
                              ? "inline-flex items-center gap-1 rounded bg-indigo-50 border border-indigo-500/40 px-2 py-0.5 text-xs font-semibold text-indigo-700"
                              : "inline-flex items-center gap-1 rounded bg-destructive/20 border border-destructive/40 px-2 py-0.5 text-xs font-semibold text-destructive"
                          }
                        >
                          {ativa ? "■ assinatura ativa" : "🔴 cancelada"}
                        </span>
                      ) : (
                        <span className="rounded bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
                          avulso
                        </span>
                      )}
                      <span className="text-muted-foreground font-medium">{titulo.mes_ano}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {titulo.cliente_id ? (
                      codigoSiteLink(clientesPorId.get(titulo.cliente_id) ?? undefined) ?? (
                        <span className="text-xs text-muted-foreground">—</span>
                      )
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {titulo.cliente_id ? mensagemBadge(titulo.cliente_id, mensagemPorId.get(titulo.cliente_id)) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <button
                      type="button"
                      onClick={() => onAlternarSituacao(titulo)}
                      className={
                        titulo.situacao === "PAGO"
                          ? "inline-flex items-center gap-1.5 rounded-full border border-emerald-600/40 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
                          : vencido
                            ? "inline-flex items-center gap-1.5 rounded-full border border-rose-600/40 bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700 hover:bg-rose-100 transition-colors"
                            : "inline-flex items-center gap-1.5 rounded-full border border-amber-600/40 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100 transition-colors"
                      }
                    >
                      <span
                        className={`size-2 rounded-full ${
                          titulo.situacao === "PAGO"
                            ? "bg-emerald-600"
                            : vencido
                              ? "bg-rose-600 animate-pulse"
                              : "bg-amber-600"
                        }`}
                      />
                      {titulo.situacao === "PAGO"
                        ? "PAGO"
                        : vencido
                          ? `VENCIDO (${diasAtraso}d)`
                          : "ABERTO"}
                    </button>
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
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1.5 rounded-full border-emerald-600/40 bg-white px-3 text-xs font-bold text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                        title="Cobrar no WhatsApp"
                        onClick={() => onWhatsApp(titulo)}
                      >
                        <MessageCircle className="size-4 text-emerald-400" />
                        Cobrar
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8 text-muted-foreground/70 hover:text-foreground"
                        title="Relatório do cliente"
                        onClick={() => onRelatorio(titulo)}
                      >
                        <FileText className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8 text-muted-foreground/70 hover:text-foreground"
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
                    <p className="font-mono text-foreground text-sm">{titulo.cnpj || "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {titulo.telefone || "sem telefone"}
                    </p>
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold text-foreground">
                    {moeda(calc.mensalSite)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-muted-foreground font-medium">
                    {moeda(calc.mensalReal)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-muted-foreground">
                    {moeda(calc.custoBoleto)}
                  </td>
                  <td className="px-4 py-3.5 text-center text-muted-foreground">
                    {valoresVisiveis ? `${calc.franciscoPct}%` : "•••"}
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-purple-700">
                    {moeda(calc.lucroFrancisco)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-amber-700">
                    {moeda(calc.custoBltFra)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold text-emerald-700">
                    {moeda(calc.lucroFelipe)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {titulos.length > 0 ? (
            <tfoot className="border-t-2 border-border/80 bg-muted/40 text-sm font-bold">
              <tr>
                <td className="p-4" colSpan={4}>
                  TOTAIS (filtrados)
                </td>
                <td className="p-4 text-center text-muted-foreground">--</td>
                <td className="p-4 text-center text-muted-foreground">--</td>
                <td className="p-4 text-center text-muted-foreground">--</td>
                <td className="p-4 text-right text-sky-700">{moeda(totais.mensalSite)}</td>
                <td className="p-4 text-right">{moeda(totais.mensalReal)}</td>
                <td className="p-4 text-right">{moeda(totais.custoBoleto)}</td>
                <td className="p-4 text-center text-muted-foreground">--</td>
                <td className="p-4 text-right text-purple-700">{moeda(totais.lucroFrancisco)}</td>
                <td className="p-4 text-right text-amber-700">{moeda(totais.custoBltFra)}</td>
                <td className="p-4 text-right text-emerald-700">{moeda(totais.lucroFelipe)}</td>
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
