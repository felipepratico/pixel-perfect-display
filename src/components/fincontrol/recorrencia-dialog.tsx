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
import {
  chaveClienteDoTitulo,
  chaveDoCliente,
  isActiveSubscription,
  nextMesAno,
  normalizeMesAno,
  type Titulo,
} from "@/lib/fincontrol";
import type { Cliente } from "@/lib/clientes";

export function RecorrenciaDialog({
  open,
  titulos,
  clientes,
  gerando,
  onOpenChange,
  onGerar,
}: {
  open: boolean;
  titulos: Titulo[];
  clientes: Cliente[];
  gerando: boolean;
  onOpenChange: (open: boolean) => void;
  onGerar: (mesAnoInicial: string, quantidade: number) => void;
}) {
  const [mesAno, setMesAno] = useState(nextMesAno());
  const [quantidade, setQuantidade] = useState(1);

  useEffect(() => {
    if (open) setMesAno(nextMesAno());
  }, [open]);

  // Mesma regra do painel de assinaturas: cliente ATIVO sem nenhum título
  // recorrente conta como ativo (ele será gerado no clique em gerar).
  const chavesComTitulo = new Set(
    titulos
      .filter((t) => t.tipo_cobranca === "RECORRENTE")
      .map((t) => chaveClienteDoTitulo(t, clientes)),
  );
  const ativas = new Set<string>([
    ...titulos
      .filter(isActiveSubscription)
      .map((t) => chaveClienteDoTitulo(t, clientes)),
    ...clientes
      .filter((c) => c.status === "ATIVO" && !chavesComTitulo.has(chaveDoCliente(c)))
      .map((c) => chaveDoCliente(c)),
  ]);
  const mesAnoNormalizado = normalizeMesAno(mesAno);
  const mesAnoInvalido = mesAno.trim().length > 0 && !mesAnoNormalizado;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gerar mensalidades em lote</DialogTitle>
          <DialogDescription>
            Cria as cobranças dos meses escolhidos para as assinaturas ativas. Assinaturas
            canceladas são ignoradas e meses já gerados não são duplicados. O status da assinatura
            é controlado no painel Assinaturas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="space-y-1.5">
            <Label htmlFor="mesAnoInicial">Mês/ano inicial</Label>
            <Input
              id="mesAnoInicial"
              value={mesAno}
              onChange={(event) => setMesAno(event.target.value)}
              onBlur={() => {
                const normalizado = normalizeMesAno(mesAno);
                if (normalizado) setMesAno(normalizado);
              }}
              placeholder="Ex: 11/2026"
              aria-invalid={mesAnoInvalido}
              aria-describedby="mesAnoInicial-ajuda"
              className={`font-bold ${
                mesAnoInvalido ? "border-destructive focus-visible:ring-destructive" : ""
              }`}
            />
            {mesAnoInvalido ? (
              <p
                id="mesAnoInicial-ajuda"
                role="alert"
                className="text-[11px] font-semibold text-destructive"
              >
                Formato inválido. Use MM/AAAA, por exemplo 11/2026.
              </p>
            ) : (
              <p id="mesAnoInicial-ajuda" className="text-[11px] text-muted-foreground">
                Formato MM/AAAA. O campo já vem preenchido com o próximo mês.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qtd">Quantidade de meses</Label>
            <select
              id="qtd"
              className="h-10 w-full rounded-xl border border-input bg-card px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring"
              value={quantidade}
              onChange={(event) => setQuantidade(Number(event.target.value))}
            >
              {Array.from({ length: 12 }, (_, index) => index + 1).map((meses) => (
                <option key={meses} value={meses}>
                  {meses === 1 ? "1 mês" : `${meses} meses`}
                </option>
              ))}
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
          <Button
            type="button"
            disabled={gerando || !mesAnoNormalizado}
            onClick={() => {
              if (mesAnoNormalizado) onGerar(mesAnoNormalizado, quantidade);
            }}
          >
            Gerar novas mensalidades
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
