import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { computeRow, formatCurrency, type Titulo } from "@/lib/fincontrol";

type Linha = {
  cliente: string;
  valor: number;
  vencimento: number;
  ativa: boolean;
  ids: string[];
};

export function AssinaturasDialog({
  open,
  titulos,
  onOpenChange,
  onAlternar,
}: {
  open: boolean;
  titulos: Titulo[];
  onOpenChange: (open: boolean) => void;
  onAlternar: (ids: string[], ativar: boolean) => void;
}) {
  const porCliente = new Map<string, Linha>();
  for (const titulo of titulos) {
    if (titulo.tipo_cobranca !== "RECORRENTE") continue;
    const atual = porCliente.get(titulo.cliente);
    const linha: Linha = atual ?? {
      cliente: titulo.cliente,
      valor: computeRow(titulo).mensalSite,
      vencimento: titulo.vencimento,
      ativa: titulo.status_assinatura === "ATIVO",
      ids: [],
    };
    linha.valor = computeRow(titulo).mensalSite;
    linha.vencimento = titulo.vencimento;
    linha.ativa = linha.ativa || titulo.status_assinatura === "ATIVO";
    linha.ids.push(titulo.id);
    porCliente.set(titulo.cliente, linha);
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
            Clientes com renovação automática mensal. Cancelar impede a geração de novos meses.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-2xl border border-partner-border bg-partner-soft p-3 text-xs">
          <p className="font-bold text-partner">
            MRR ativo estimado:{" "}
            <span className="font-extrabold">{formatCurrency(mrr)} /mês</span>
          </p>
          <span className="rounded-full bg-partner px-2.5 py-0.5 font-bold text-partner-foreground">
            {ativas.length} ativas
          </span>
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
                <tr key={linha.cliente}>
                  <td className="p-3 font-bold">{linha.cliente}</td>
                  <td className="p-3 text-right">{formatCurrency(linha.valor)}</td>
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
                    <Button
                      type="button"
                      size="sm"
                      variant={linha.ativa ? "outline" : "default"}
                      className="h-7 text-xs"
                      onClick={() => onAlternar(linha.ids, !linha.ativa)}
                    >
                      {linha.ativa ? "Cancelar" : "Reativar"}
                    </Button>
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
