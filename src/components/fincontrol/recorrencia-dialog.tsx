import { RotateCw } from "lucide-react";
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
import { isActiveSubscription, nextMesAno, type Titulo } from "@/lib/fincontrol";

export function RecorrenciaDialog({
  open,
  titulos,
  gerando,
  onOpenChange,
  onGerar,
}: {
  open: boolean;
  titulos: Titulo[];
  gerando: boolean;
  onOpenChange: (open: boolean) => void;
  onGerar: (mesAnoInicial: string, quantidade: number) => void;
}) {
  const [mesAno, setMesAno] = useState(nextMesAno());
  const [quantidade, setQuantidade] = useState(1);

  useEffect(() => {
    if (open) setMesAno(nextMesAno());
  }, [open]);

  const ativas = new Set(titulos.filter(isActiveSubscription).map((t) => t.cliente));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gerar mensalidades em lote</DialogTitle>
          <DialogDescription>
            Cria as cobranças pendentes das assinaturas ativas. Assinaturas canceladas são
            ignoradas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="space-y-1.5">
            <Label htmlFor="mesAnoInicial">Mês/ano inicial</Label>
            <Input
              id="mesAnoInicial"
              value={mesAno}
              onChange={(event) => setMesAno(event.target.value)}
              placeholder="Ex: 11/2026"
              className="font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qtd">Quantidade de meses</Label>
            <select
              id="qtd"
              className="h-10 w-full rounded-xl border border-input bg-card px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring"
              value={quantidade}
              onChange={(event) => setQuantidade(Number(event.target.value))}
            >
              <option value={1}>1 mês</option>
              <option value={3}>3 meses consecutivos</option>
              <option value={6}>6 meses (semestre)</option>
              <option value={12}>12 meses (ano completo)</option>
            </select>
          </div>

          <p className="flex items-start gap-2 rounded-xl border border-partner-border bg-partner-soft p-3 text-[11px] text-partner">
            <RotateCw className="mt-0.5 size-3.5 shrink-0" />
            Foram encontradas <strong>{ativas.size} assinaturas ativas</strong> prontas para
            renovação contínua.
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" disabled={gerando} onClick={() => onGerar(mesAno, quantidade)}>
            Gerar novas mensalidades
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
