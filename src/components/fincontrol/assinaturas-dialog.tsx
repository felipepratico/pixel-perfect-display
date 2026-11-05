import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export function AssinaturasDialog({
  open,
  titulos,
  clientes,
  valoresVisiveis,
  onOpenChange,
  onAlternar,
  onNovaAssinatura,
}: {
  open: boolean;
  titulos: Titulo[];
  clientes: Cliente[];
  valoresVisiveis: boolean;
  onOpenChange: (open: boolean) => void;
  onAlternar: (ids: string[], ativar: boolean, clienteId?: string) => void;
  onNovaAssinatura: () => void;
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
  // Pegadinha: o título pode estar vinculado antes por CNPJ/nome (sem cliente_id),
  // então o chaveClienteDoTitulo acima já resolve para o id do cadastro; se um
  // título antigo não resolver, tentamos localizar o cadastro por CNPJ/nome
  // para não duplicar a linha.
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Painel de assinaturas recorrentes</DialogTitle>
          <DialogDescription>
            Reflete diretamente os clientes ATIVOS do cadastro (Clientes e contratos), mesmo sem
            título gerado ainda. Cancelar só afeta títulos existentes; meses futuros são gerados
            via “Gerar meses”.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-partner-border bg-partner-soft p-3 text-xs">
          <p className="font-bold text-partner">
            MRR ativo estimado:{" "}
            <span className="font-extrabold">
              {valoresVisiveis ? formatCurrency(mrr) : "R$ ••••••"} /mês
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-partner px-2.5 py-0.5 font-bold text-partner-foreground">
              {ativas.length} ativas
            </span>
            <Button
              type="button"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={onNovaAssinatura}
            >
              <Plus className="size-3.5" />
              Adicionar assinatura
            </Button>
          </div>
        </div>

        <div className="scroll-slim max-h-80 overflow-auto rounded-2xl border border-border">
          <table className="w-full whitespace-nowrap text-left text-xs">
            <thead className="bg-muted text-[10px] font-bold uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Cliente</th>
                <th className="p-3 text-right">Valor mensal</th>
                <th className="p-3 text-center">Dia vencimento</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {linhas.map((linha) => (
                <tr key={linha.chave}>
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
                      <span className="text-[11px] text-muted-foreground">
                        Use “Gerar meses” para criar títulos
                      </span>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant={linha.ativa ? "outline" : "default"}
                        className="h-7 text-xs"
                        onClick={() => onAlternar(linha.ids, !linha.ativa, linha.clienteId ?? undefined)}
                      >
                        {linha.ativa ? "Cancelar" : "Reativar"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {linhas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    Nenhuma assinatura recorrente cadastrada ainda.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
