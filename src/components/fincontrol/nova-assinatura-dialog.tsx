import { CalendarDays, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";

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
import { valorContrato, type Cliente } from "@/lib/clientes";
import { onlyDigits } from "@/lib/cnpj";
import { currentMesAno, normalizeMesAno } from "@/lib/fincontrol";

export type NovaAssinaturaValues = {
  clienteId: string | null;
  cliente: string;
  cnpj: string;
  telefone: string;
  valor: number;
  vencimento: number;
  mesAno: string;
  status: "ATIVO" | "CANCELADO";
};

const selectClass =
  "h-10 w-full rounded-xl border border-input bg-card px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring";

const formInicial = (): NovaAssinaturaValues => ({
  clienteId: null,
  cliente: "",
  cnpj: "",
  telefone: "",
  valor: 0,
  vencimento: 5,
  mesAno: currentMesAno(),
  status: "ATIVO",
});

export function NovaAssinaturaDialog({
  open,
  clientes,
  saving,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  clientes: Cliente[];
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: NovaAssinaturaValues) => void | Promise<void>;
}) {
  const [form, setForm] = useState<NovaAssinaturaValues>(formInicial);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(formInicial());
    setErro("");
  }, [open]);

  function update<K extends keyof NovaAssinaturaValues>(key: K, value: NovaAssinaturaValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function buscarClientePorNome(nome: string): Cliente | undefined {
    const normalizado = nome.trim().toUpperCase();
    if (!normalizado) return undefined;
    return clientes.find((cliente) => cliente.razao_social.trim().toUpperCase() === normalizado);
  }

  function buscarClientePorCnpj(cnpj: string): Cliente | undefined {
    const digitos = onlyDigits(cnpj);
    if (digitos.length < 11) return undefined;
    return clientes.find((cliente) => onlyDigits(cliente.cnpj) === digitos);
  }

  function atualizarIdentificacao(campo: "cliente" | "cnpj", valor: string) {
    setForm((prev) => {
      const proximo = { ...prev, [campo]: valor, clienteId: null };
      // Busca apenas pelo campo alterado para não desfazer uma edição manual
      // usando o outro identificador que ainda pertence ao cliente anterior.
      const encontrado =
        campo === "cliente" ? buscarClientePorNome(valor) : buscarClientePorCnpj(valor);

      if (!encontrado) {
        return campo === "cliente" ? { ...proximo, cnpj: "", telefone: "" } : proximo;
      }

      return {
        ...proximo,
        clienteId: encontrado.id,
        cliente: encontrado.razao_social,
        cnpj: encontrado.cnpj,
        telefone: encontrado.telefone,
        valor: valorContrato(encontrado),
        vencimento: encontrado.vencimento,
      };
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const cliente = form.cliente.trim();
    const mesAno = normalizeMesAno(form.mesAno);

    if (!cliente) {
      setErro("Informe o nome ou a razão social do cliente.");
      return;
    }
    if (!(Number(form.valor) > 0)) {
      setErro("Informe um valor mensal maior que zero.");
      return;
    }
    if (!mesAno) {
      setErro("Informe o mês/ano inicial no formato MM/AAAA.");
      return;
    }

    setErro("");
    void onSave({
      ...form,
      cliente: cliente.toUpperCase(),
      cnpj: form.cnpj.trim(),
      valor: Number(form.valor),
      vencimento: Math.min(31, Math.max(1, Number(form.vencimento) || 5)),
      mesAno,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5 text-brand" />
            Nova assinatura recorrente
          </DialogTitle>
          <DialogDescription>
            Cadastre um novo cliente ou vincule um cliente já existente ao fluxo de cobrança mensal.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 text-sm">
          <div className="grid grid-cols-1 gap-3 rounded-2xl border border-border bg-muted/40 p-3.5 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="novaAssinaturaCliente">Cliente (nome / razão social) *</Label>
              <Input
                id="novaAssinaturaCliente"
                list="nova-assinatura-clientes"
                required
                value={form.cliente}
                onChange={(event) => atualizarIdentificacao("cliente", event.target.value)}
                placeholder="Digite para buscar ou cadastrar um novo cliente"
              />
              <datalist id="nova-assinatura-clientes">
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.razao_social}>
                    {cliente.cnpj
                      ? `${cliente.razao_social} — ${cliente.cnpj}`
                      : cliente.razao_social}
                  </option>
                ))}
              </datalist>
              <p className="text-[11px] text-muted-foreground">
                Digite o nome ou o CNPJ para localizar um cliente já cadastrado. Se não encontrar,
                um novo cadastro será criado.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="novaAssinaturaCnpj">CNPJ / CPF</Label>
              <Input
                id="novaAssinaturaCnpj"
                inputMode="numeric"
                value={form.cnpj}
                onChange={(event) => atualizarIdentificacao("cnpj", event.target.value)}
                placeholder="Opcional"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="novaAssinaturaValor">Valor mensal (R$) *</Label>
              <Input
                id="novaAssinaturaValor"
                type="number"
                min="0.01"
                step="0.01"
                required
                value={form.valor}
                onChange={(event) => update("valor", Number(event.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="novaAssinaturaVencimento">Dia do vencimento *</Label>
              <Input
                id="novaAssinaturaVencimento"
                type="number"
                min={1}
                max={31}
                required
                value={form.vencimento}
                onChange={(event) => update("vencimento", Number(event.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="novaAssinaturaMesAno" className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5 text-muted-foreground" />
                Mês/ano de início *
              </Label>
              <Input
                id="novaAssinaturaMesAno"
                required
                value={form.mesAno}
                onChange={(event) => update("mesAno", event.target.value)}
                placeholder="MM/AAAA"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="novaAssinaturaStatus">Status inicial *</Label>
              <select
                id="novaAssinaturaStatus"
                className={selectClass}
                value={form.status}
                onChange={(event) =>
                  update("status", event.target.value as NovaAssinaturaValues["status"])
                }
              >
                <option value="ATIVO">Ativa</option>
                <option value="CANCELADO">Cancelada</option>
              </select>
            </div>
          </div>

          {erro ? <p className="text-xs font-semibold text-destructive">{erro}</p> : null}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Adicionar assinatura"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
