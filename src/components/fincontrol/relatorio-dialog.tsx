import { Download, Printer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { exportTitulos } from "@/lib/excel";
import { computeRow, formatCurrency, isActiveSubscription, type Titulo } from "@/lib/fincontrol";

export function RelatorioDialog({
  open,
  titulos,
  clienteInicial,
  onOpenChange,
  onImprimir,
  valoresVisiveis,
}: {
  open: boolean;
  titulos: Titulo[];
  clienteInicial?: string | null;
  onOpenChange: (open: boolean) => void;
  onImprimir: (titulos: Titulo[], subtitulo: string) => void;
  valoresVisiveis: boolean;
}) {
  const clientes = useMemo(
    () => [...new Set(titulos.map((t) => t.cliente).filter(Boolean))].sort(),
    [titulos],
  );
  const [cliente, setCliente] = useState("");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    if (!open) return;
    setBusca("");
    setCliente(clienteInicial || "");
  }, [open, clienteInicial, clientes]);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toUpperCase();
    return termo ? clientes.filter((c) => c.toUpperCase().includes(termo)) : [];
  }, [clientes, busca]);

  const lancamentos = useMemo(
    () =>
      titulos
        .filter((t) => t.cliente === cliente)
        .sort((a, b) => (a.mes_ano || "").localeCompare(b.mes_ano || "")),
    [titulos, cliente],
  );

  const resumo = useMemo(() => {
    let faturado = 0;
    let lucro = 0;
    let aberto = 0;
    let pago = 0;
    for (const item of lancamentos) {
      const calc = computeRow(item);
      faturado += calc.mensalSite;
      lucro += calc.lucroFelipe;
      if (item.situacao === "PAGO") pago += calc.mensalSite;
      else aberto += calc.mensalSite;
    }
    const base = lancamentos[0];
    return {
      faturado,
      lucro,
      aberto,
      pago,
      ativo: base ? isActiveSubscription(base) : false,
      cnpj: base?.cnpj || "—",
      telefone: base?.telefone || "—",
      vencimento: base?.vencimento ?? "—",
    };
  }, [lancamentos]);
  const moeda = (valor: number) =>
    valoresVisiveis ? formatCurrency(valor) : "R$ ••••••";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Relatório do cliente</DialogTitle>
          <DialogDescription>
            Veja o histórico completo, salve em Excel ou imprima.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="relBusca">Procurar cliente</Label>
            <Input
              id="relBusca"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Digite parte do nome"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Cliente</Label>
            <Select value={cliente} onValueChange={setCliente}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {visiveis.map((nome) => (
                  <SelectItem key={nome} value={nome}>
                    {nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {lancamentos.length > 0 ? (
          <>
            <div className="grid gap-2 text-xs sm:grid-cols-2">
              <p className="rounded-lg bg-muted p-2">
                CNPJ: <span className="font-semibold">{resumo.cnpj}</span>
              </p>
              <p className="rounded-lg bg-muted p-2">
                Telefone: <span className="font-semibold">{resumo.telefone}</span>
              </p>
              <p className="rounded-lg bg-muted p-2">
                Vencimento: <span className="font-semibold">dia {resumo.vencimento}</span>
              </p>
              <p className="rounded-lg bg-muted p-2">
                Assinatura:{" "}
                <span className="font-semibold">{resumo.ativo ? "ativa" : "cancelada/avulso"}</span>
              </p>
              <p className="rounded-lg bg-info-soft p-2 text-info">
                Total faturado: <span className="font-bold">{moeda(resumo.faturado)}</span>
              </p>
              <p className="rounded-lg bg-brand-soft p-2 text-brand">
                Lucro Felipe: <span className="font-bold">{moeda(resumo.lucro)}</span>
              </p>
              <p className="rounded-lg bg-warning-soft p-2 text-warning">
                Em aberto: <span className="font-bold">{moeda(resumo.aberto)}</span>
              </p>
              <p className="rounded-lg bg-brand-soft p-2 text-brand">
                Já pago: <span className="font-bold">{moeda(resumo.pago)}</span>
              </p>
            </div>

            <div className="scroll-slim max-h-64 overflow-y-auto rounded-xl border">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-muted text-[10px] font-bold uppercase">
                  <tr>
                    <th className="px-2 py-2">Mês/Ano</th>
                    <th className="px-2 py-2 text-right">Valor</th>
                    <th className="px-2 py-2 text-right">Lucro Felipe</th>
                    <th className="px-2 py-2 text-center">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lancamentos.map((item) => {
                    const calc = computeRow(item);
                    return (
                      <tr key={item.id}>
                        <td className="px-2 py-1.5">{item.mes_ano || "—"}</td>
                        <td className="px-2 py-1.5 text-right">
                          {moeda(calc.mensalSite)}
                        </td>
                        <td className="px-2 py-1.5 text-right text-brand">
                          {moeda(calc.lucroFelipe)}
                        </td>
                        <td className="px-2 py-1.5 text-center font-semibold">{item.situacao}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhum lançamento para este cliente.
          </p>
        )}

        <DialogFooter className="gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!lancamentos.length || !valoresVisiveis}
            onClick={() => exportTitulos(lancamentos)}
          >
            <Download className="size-4" />
            Salvar em Excel
          </Button>
          <Button
            type="button"
            disabled={!lancamentos.length || !valoresVisiveis}
            onClick={() => onImprimir(lancamentos, `Relatório do cliente: ${cliente}`)}
          >
            <Printer className="size-4" />
            Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
