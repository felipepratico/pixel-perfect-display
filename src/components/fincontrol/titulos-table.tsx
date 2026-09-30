import { CircleCheck, Clock, FolderOpen, MessageCircle, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { computeRow, formatCurrency, isActiveSubscription, type Titulo } from "@/lib/fincontrol";
import type { Totais } from "@/lib/totais";

export function TitulosTable({
  titulos,
  totais,
  selecionados,
  onToggle,
  onToggleTodos,
  onEditar,
  onWhatsApp,
  onAlternarSituacao,
  onExcluir,
}: {
  titulos: Titulo[];
  totais: Totais;
  selecionados: Set<string>;
  onToggle: (id: string) => void;
  onToggleTodos: (marcar: boolean) => void;
  onEditar: (titulo: Titulo) => void;
  onWhatsApp: (titulo: Titulo) => void;
  onAlternarSituacao: (titulo: Titulo) => void;
  onExcluir: (titulo: Titulo) => void;
}) {
  const todosMarcados = titulos.length > 0 && titulos.every((t) => selecionados.has(t.id));

  return (
    <div className="card-panel overflow-hidden">
      <div className="scroll-slim overflow-x-auto">
        <table className="w-full whitespace-nowrap text-left text-xs">
          <thead className="bg-shell text-[10px] font-bold uppercase tracking-wider text-shell-foreground">
            <tr>
              <th className="px-3 py-3 text-center">
                <Checkbox
                  checked={todosMarcados}
                  onCheckedChange={(checked) => onToggleTodos(checked === true)}
                  aria-label="Selecionar todos"
                />
              </th>
              <th className="px-3 py-3">Cliente / assinatura</th>
              <th className="px-3 py-3">CNPJ / telefone</th>
              <th className="px-3 py-3 text-right">Mensal site</th>
              <th className="px-3 py-3 text-right">Mensal real</th>
              <th className="px-3 py-3 text-right">Custo boleto</th>
              <th className="px-3 py-3 text-center">% Francisco</th>
              <th className="px-3 py-3 text-right">Lucro Francisco</th>
              <th className="px-3 py-3 text-right">Custo (Blt x Fra)</th>
              <th className="px-3 py-3 text-right">Lucro Felipe</th>
              <th className="px-3 py-3 text-center">Vencimento</th>
              <th className="px-3 py-3 text-center">Situação</th>
              <th className="px-3 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {titulos.map((titulo) => {
              const calc = computeRow(titulo);
              const ativa = isActiveSubscription(titulo);
              return (
                <tr key={titulo.id} className="transition-colors hover:bg-muted/60">
                  <td className="px-3 py-2.5 text-center">
                    <Checkbox
                      checked={selecionados.has(titulo.id)}
                      onCheckedChange={() => onToggle(titulo.id)}
                      aria-label={`Selecionar ${titulo.cliente}`}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="font-bold">{titulo.cliente}</p>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-semibold">
                      {titulo.tipo_cobranca === "RECORRENTE" ? (
                        <span
                          className={
                            ativa
                              ? "rounded-full bg-partner-soft px-1.5 py-0.5 text-partner"
                              : "rounded-full bg-danger-soft px-1.5 py-0.5 text-destructive"
                          }
                        >
                          {ativa ? "🔁 assinatura ativa" : "🔴 cancelada"}
                        </span>
                      ) : (
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground">
                          avulso
                        </span>
                      )}
                      <span className="text-muted-foreground">{titulo.mes_ano}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    <p>{titulo.cnpj || "—"}</p>
                    <p>{titulo.telefone || "sem telefone"}</p>
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold">
                    {formatCurrency(calc.mensalSite)}
                  </td>
                  <td className="px-3 py-2.5 text-right">{formatCurrency(calc.mensalReal)}</td>
                  <td className="px-3 py-2.5 text-right">{formatCurrency(calc.custoBoleto)}</td>
                  <td className="px-3 py-2.5 text-center">{calc.franciscoPct}%</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-partner">
                    {formatCurrency(calc.lucroFrancisco)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold text-warning">
                    {formatCurrency(calc.custoBltFra)}
                  </td>
                  <td className="bg-brand-soft/40 px-3 py-2.5 text-right font-extrabold text-brand">
                    {formatCurrency(calc.lucroFelipe)}
                  </td>
                  <td className="px-3 py-2.5 text-center">Dia {titulo.vencimento}</td>
                  <td className="px-3 py-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => onAlternarSituacao(titulo)}
                      className={
                        titulo.situacao === "PAGO"
                          ? "inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-1 text-[10px] font-bold text-brand"
                          : "inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-1 text-[10px] font-bold text-warning"
                      }
                    >
                      {titulo.situacao === "PAGO" ? (
                        <CircleCheck className="size-3" />
                      ) : (
                        <Clock className="size-3" />
                      )}
                      {titulo.situacao}
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-7 text-brand"
                        title="Cobrar no WhatsApp"
                        onClick={() => onWhatsApp(titulo)}
                      >
                        <MessageCircle className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        title="Editar"
                        onClick={() => onEditar(titulo)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-7 text-destructive"
                        title="Excluir"
                        onClick={() => onExcluir(titulo)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {titulos.length > 0 ? (
            <tfoot className="border-t-2 border-border bg-muted text-xs font-bold">
              <tr>
                <td className="p-3" colSpan={3}>
                  TOTAIS (filtrados)
                </td>
                <td className="p-3 text-right text-info">{formatCurrency(totais.mensalSite)}</td>
                <td className="p-3 text-right">{formatCurrency(totais.mensalReal)}</td>
                <td className="p-3 text-right">{formatCurrency(totais.custoBoleto)}</td>
                <td className="p-3 text-center text-muted-foreground">--</td>
                <td className="p-3 text-right text-partner">
                  {formatCurrency(totais.lucroFrancisco)}
                </td>
                <td className="p-3 text-right text-warning">
                  {formatCurrency(totais.custoBltFra)}
                </td>
                <td className="bg-brand-soft/60 p-3 text-right text-brand">
                  {formatCurrency(totais.lucroFelipe)}
                </td>
                <td className="p-3 text-center" colSpan={3}>
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
