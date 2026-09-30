import { Coins } from "lucide-react";
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
import {
  computeRow,
  emptyTitulo,
  formatCurrency,
  parseNumber,
  type Titulo,
  type TituloInput,
} from "@/lib/fincontrol";

const selectClass =
  "h-10 w-full rounded-xl border border-input bg-card px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring";

export function TituloDialog({
  open,
  titulo,
  saving,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  titulo: Titulo | null;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: TituloInput, id?: string) => void;
}) {
  const [form, setForm] = useState<TituloInput>(emptyTitulo());

  useEffect(() => {
    if (!open) return;
    if (titulo) {
      const { id: _id, ...rest } = titulo;
      setForm(rest);
    } else {
      setForm(emptyTitulo());
    }
  }, [open, titulo]);

  const calc = computeRow(form);

  function update<K extends keyof TituloInput>(key: K, value: TituloInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSave(
      {
        ...form,
        cliente: form.cliente.toUpperCase().trim(),
        telefone: form.telefone.replace(/\D/g, ""),
        mensal_site: parseNumber(form.mensal_site),
        mensal_real: parseNumber(form.mensal_real),
        custo_boleto: parseNumber(form.custo_boleto),
        francisco_pct: parseNumber(form.francisco_pct),
        vencimento: Math.min(31, Math.max(1, Number(form.vencimento) || 5)),
      },
      titulo?.id,
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titulo ? "Editar lançamento" : "Lançar cliente / assinatura"}</DialogTitle>
          <DialogDescription>
            Os lucros são calculados automaticamente conforme você digita.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div className="grid grid-cols-1 gap-3 rounded-2xl border border-border bg-muted/50 p-3.5 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="cliente">Nome do cliente / razão social *</Label>
              <Input
                id="cliente"
                required
                value={form.cliente}
                onChange={(event) => update("cliente", event.target.value)}
                placeholder="Ex: DISTRIBUIDORA FORTES"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cnpj">CNPJ / CPF</Label>
              <Input
                id="cnpj"
                value={form.cnpj}
                onChange={(event) => update("cnpj", event.target.value)}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telefone">WhatsApp / telefone</Label>
              <Input
                id="telefone"
                value={form.telefone}
                onChange={(event) => update("telefone", event.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vencimento">Dia do vencimento *</Label>
              <Input
                id="vencimento"
                type="number"
                min={1}
                max={31}
                required
                value={form.vencimento}
                onChange={(event) => update("vencimento", Number(event.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mesAno">Mês/ano de referência</Label>
              <Input
                id="mesAno"
                value={form.mes_ano}
                onChange={(event) => update("mes_ano", event.target.value)}
                placeholder="Ex: 10/2026"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tipo">Tipo de cobrança *</Label>
              <select
                id="tipo"
                className={selectClass}
                value={form.tipo_cobranca}
                onChange={(event) =>
                  update("tipo_cobranca", event.target.value as TituloInput["tipo_cobranca"])
                }
              >
                <option value="RECORRENTE">🔁 Assinatura recorrente (mensal)</option>
                <option value="AVULSO">1️⃣ Cobrança única / avulsa</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="statusAssinatura">Status da assinatura *</Label>
              <select
                id="statusAssinatura"
                className={selectClass}
                value={form.status_assinatura}
                onChange={(event) =>
                  update(
                    "status_assinatura",
                    event.target.value as TituloInput["status_assinatura"],
                  )
                }
              >
                <option value="ATIVO">🟢 Ativa (gera cobrança todo mês)</option>
                <option value="CANCELADO">🔴 Cancelada (não gera novos meses)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="situacao">Situação do pagamento *</Label>
              <select
                id="situacao"
                className={selectClass}
                value={form.situacao}
                onChange={(event) => update("situacao", event.target.value as TituloInput["situacao"])}
              >
                <option value="ABERTO">Aberto / pendente</option>
                <option value="PAGO">Pago / quitado</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-border bg-muted/50 p-3.5">
            <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
              <Coins className="size-4 text-warning" />
              Valores & divisão de lucros
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="mensalSite">Mensal site (R$) *</Label>
                <Input
                  id="mensalSite"
                  type="number"
                  step="0.01"
                  required
                  value={form.mensal_site}
                  onChange={(event) => update("mensal_site", Number(event.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mensalReal">Mensal real (R$)</Label>
                <Input
                  id="mensalReal"
                  type="number"
                  step="0.01"
                  value={form.mensal_real}
                  onChange={(event) => update("mensal_real", Number(event.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="custoBoleto">Custo boleto (R$)</Label>
                <Input
                  id="custoBoleto"
                  type="number"
                  step="0.01"
                  value={form.custo_boleto}
                  onChange={(event) => update("custo_boleto", Number(event.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pct">% Francisco</Label>
                <Input
                  id="pct"
                  type="number"
                  step="0.1"
                  value={form.francisco_pct}
                  onChange={(event) => update("francisco_pct", Number(event.target.value))}
                />
              </div>
              <ReadOnly
                label="Lucro Francisco (calculado)"
                value={formatCurrency(calc.lucroFrancisco)}
                className="border-partner-border bg-partner-soft text-partner"
              />
              <ReadOnly
                label="Custo (Blt x Fra)"
                value={formatCurrency(calc.custoBltFra)}
                className="border-warning-border bg-warning-soft text-warning"
              />
              <ReadOnly
                label="Lucro Felipe (resultado final)"
                value={formatCurrency(calc.lucroFelipe)}
                className="border-brand-border bg-brand-soft text-brand"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              Salvar lançamento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReadOnly({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className={`rounded-xl border px-3 py-2.5 text-sm font-extrabold ${className}`}>
        {value}
      </div>
    </div>
  );
}
