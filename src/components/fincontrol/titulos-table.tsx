import {
  AlertTriangle,
  CircleCheck,
  Clock,
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
  computeRow,
  formatCurrency,
  getDiasVencido,
  isActiveSubscription,
  isTituloVencido,
  type Titulo,
} from "@/lib/fincontrol";
import type { Totais } from "@/lib/totais";

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
}) {
  const todosMarcados = titulos.length > 0 && titulos.every((t) => selecionados.has(t.id));
  const moeda = (valor: number) => (valoresVisiveis ? formatCurrency(valor) : "R$ ••••••");

  return (
    <div className="card-panel overflow-hidden bg-card/70 border border-border/60">
      <div className="scroll-slim overflow-x-auto">
        <table className="w-full whitespace-nowrap text-left text-xs">
          <thead className="bg-card/90 border-b border-border/60 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3.5 py-3 text-center w-10">
                <Checkbox
                  checked={todosMarcados}
                  onCheckedChange={(checked) => onToggleTodos(checked === true)}
                  aria-label="Selecionar todos"
                  className="rounded-full"
                />
              </th>
              <th className="px-3.5 py-3">CLIENTE / ASSINATURA</th>
              <th className="px-3 py-3 text-center">SITUAÇÃO</th>
              <th className="px-3 py-3 text-center">AÇÕES</th>
              <th className="px-3.5 py-3">CNPJ / TELEFONE</th>
              <th className="px-3 py-3 text-right">MENSAL SITE</th>
              <th className="px-3 py-3 text-right">MENSAL REAL</th>
              <th className="px-3 py-3 text-right">CUSTO BOLETO</th>
              <th className="px-3 py-3 text-center">% FRANCISCO</th>
              <th className="px-3 py-3 text-right">LUCRO FRANCISCO</th>
              <th className="px-3 py-3 text-right">CUSTO (BLT X FRA)</th>
              <th className="px-3 py-3 text-right">LUCRO FELIPE</th>
              <th className="px-3 py-3 text-center">VENCIMENTO</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {titulos.map((titulo) => {
              const calc = computeRow(titulo);
              const ativa = isActiveSubscription(titulo);
              const vencido = isTituloVencido(titulo);
              const diasAtraso = vencido ? getDiasVencido(titulo) : 0;
              return (
                <tr
                  key={titulo.id}
                  className={`transition-colors ${
                    vencido
                      ? "bg-destructive/5 hover:bg-destructive/10 border-l-2 border-l-destructive"
                      : "hover:bg-muted/40"
                  }`}
                >
                  <td className="px-3.5 py-2.5 text-center">
                    <Checkbox
                      checked={selecionados.has(titulo.id)}
                      onCheckedChange={() => onToggle(titulo.id)}
                      aria-label={`Selecionar ${titulo.cliente}`}
                      className="rounded-full"
                    />
                  </td>
                  <td className="px-3.5 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-foreground tracking-tight">{titulo.cliente}</p>
                      {titulo.cliente_id && (
                        <span
                          title="Vinculado ao cadastro de clientes"
                          className="inline-flex items-center gap-0.5 rounded-full bg-brand-soft px-1.5 py-0.2 text-[9px] font-semibold text-brand"
                        >
                          <Link2 className="size-2.5" />
                          Cliente
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[10px]">
                      {titulo.tipo_cobranca === "RECORRENTE" ? (
                        <span
                          className={
                            ativa
                              ? "inline-flex items-center gap-1 rounded bg-indigo-950/70 border border-indigo-500/40 px-1.5 py-0.2 text-[9px] font-semibold text-indigo-300"
                              : "inline-flex items-center gap-1 rounded bg-destructive/20 border border-destructive/40 px-1.5 py-0.2 text-[9px] font-semibold text-destructive"
                          }
                        >
                          {ativa ? "■ assinatura ativa" : "🔴 cancelada"}
                        </span>
                      ) : (
                        <span className="rounded bg-muted/60 px-1.5 py-0.2 text-[9px] text-muted-foreground">
                          avulso
                        </span>
                      )}
                      <span className="text-muted-foreground/80 font-medium">{titulo.mes_ano}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => onAlternarSituacao(titulo)}
                      className={
                        titulo.situacao === "PAGO"
                          ? "inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-950/50 px-2.5 py-1 text-[10px] font-bold text-emerald-400 hover:bg-emerald-900/50 transition-colors"
                          : vencido
                          ? "inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-950/50 px-2.5 py-1 text-[10px] font-black text-rose-400 hover:bg-rose-900/50 transition-colors"
                          : "inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-950/50 px-2.5 py-1 text-[10px] font-bold text-amber-400 hover:bg-amber-900/50 transition-colors"
                      }
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          titulo.situacao === "PAGO"
                            ? "bg-emerald-400"
                            : vencido
                            ? "bg-rose-400 animate-pulse"
                            : "bg-amber-400"
                        }`}
                      />
                      {titulo.situacao === "PAGO"
                        ? "PAGO"
                        : vencido
                        ? `VENCIDO (${diasAtraso}d)`
                        : "ABERTO"}
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-6 gap-1 rounded-full border-emerald-500/40 bg-emerald-950/40 px-2.5 text-[10px] font-bold text-emerald-400 hover:bg-emerald-900/50 hover:text-emerald-300"
                        title="Cobrar no WhatsApp"
                        onClick={() => onWhatsApp(titulo)}
                      >
                        <MessageCircle className="size-3 text-emerald-400" />
                        Cobrar
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-6 text-muted-foreground/70 hover:text-foreground"
                        title="Relatório do cliente"
                        onClick={() => onRelatorio(titulo)}
                      >
                        <FileText className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-6 text-muted-foreground/70 hover:text-foreground"
                        title="Editar"
                        onClick={() => onEditar(titulo)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-6 text-destructive/70 hover:text-destructive"
                        title="Excluir"
                        onClick={() => onExcluir(titulo)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <p className="font-mono text-foreground text-[11px]">{titulo.cnpj || "—"}</p>
                    <p className="text-[10px] text-muted-foreground/70">{titulo.telefone || "sem telefone"}</p>
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-foreground">
                    {moeda(calc.mensalSite)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground/90 font-medium">
                    {moeda(calc.mensalReal)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground/90">
                    {moeda(calc.custoBoleto)}
                  </td>
                  <td className="px-3 py-2.5 text-center text-muted-foreground/90">
                    {valoresVisiveis ? `${calc.franciscoPct}%` : "•••"}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold text-purple-400">
                    {moeda(calc.lucroFrancisco)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold text-amber-400">
                    {moeda(calc.custoBltFra)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-emerald-400">
                    {moeda(calc.lucroFelipe)}
                  </td>
                  <td className="px-3 py-2.5 text-center text-muted-foreground/90 font-medium">
                    Dia {titulo.vencimento}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {titulos.length > 0 ? (
            <tfoot className="border-t-2 border-border/80 bg-muted/40 text-xs font-bold">
              <tr>
                <td className="p-3" colSpan={5}>
                  TOTAIS (filtrados)
                </td>
                <td className="p-3 text-right text-sky-400">{moeda(totais.mensalSite)}</td>
                <td className="p-3 text-right">{moeda(totais.mensalReal)}</td>
                <td className="p-3 text-right">{moeda(totais.custoBoleto)}</td>
                <td className="p-3 text-center text-muted-foreground">--</td>
                <td className="p-3 text-right text-purple-400">
                  {moeda(totais.lucroFrancisco)}
                </td>
                <td className="p-3 text-right text-amber-400">
                  {moeda(totais.custoBltFra)}
                </td>
                <td className="p-3 text-right text-emerald-400">
                  {moeda(totais.lucroFelipe)}
                </td>
                <td className="p-3 text-center">
                  --
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
