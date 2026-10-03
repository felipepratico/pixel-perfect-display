import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  computeRow,
  formatCurrency,
  normalizePhone,
  whatsappMessage,
  type Titulo,
} from "@/lib/fincontrol";

function abrirConversa(titulo: Titulo) {
  let numero = normalizePhone(titulo.telefone);
  if (!numero) return false;
  if (!numero.startsWith("55") && numero.length <= 11) numero = `55${numero}`;
  window.open(
    `https://api.whatsapp.com/send?phone=${numero}&text=${encodeURIComponent(whatsappMessage(titulo))}`,
    "_blank",
    "noopener",
  );
  return true;
}

export function CobrancaLoteDialog({
  open,
  titulos,
  valoresVisiveis,
  onOpenChange,
}: {
  open: boolean;
  titulos: Titulo[];
  valoresVisiveis: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cobrar no WhatsApp</DialogTitle>
          <DialogDescription>
            Abra a conversa de cada cliente selecionado. A mensagem já vem pronta.
          </DialogDescription>
        </DialogHeader>

        <div className="divide-y rounded-xl border text-sm">
          {titulos.map((titulo) => {
            const temTelefone = !!normalizePhone(titulo.telefone);
            return (
              <div key={titulo.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{titulo.cliente}</p>
                  <p className="text-xs text-muted-foreground">
                    {valoresVisiveis
                      ? formatCurrency(computeRow(titulo).mensalSite)
                      : "R$ ••••••"} · dia {titulo.vencimento} ·{" "}
                    {titulo.situacao}
                  </p>
                  {!temTelefone ? (
                    <p className="text-xs font-semibold text-destructive">Sem telefone cadastrado</p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!temTelefone}
                  onClick={() => abrirConversa(titulo)}
                >
                  <MessageCircle className="size-4" />
                  Abrir
                </Button>
              </div>
            );
          })}
          {titulos.length === 0 ? (
            <p className="p-4 text-center text-muted-foreground">Nenhum cliente selecionado.</p>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
