import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, MessageCircle, RotateCcw, SkipForward } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  computeRow,
  formatCurrency,
  isTituloVencido,
  normalizePhone,
  whatsappMessage,
  type Titulo,
} from "@/lib/fincontrol";

type EstadoEnvio = "enviado" | "pulado";

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
  const [estados, setEstados] = useState<Record<string, EstadoEnvio>>({});

  useEffect(() => {
    if (open) setEstados({});
  }, [open]);

  const comTelefone = useMemo(
    () => titulos.filter((t) => !!normalizePhone(t.telefone)),
    [titulos],
  );
  const proximo = comTelefone.find((t) => !estados[t.id]);
  const concluidos = comTelefone.filter((t) => estados[t.id]).length;
  const enviados = comTelefone.filter((t) => estados[t.id] === "enviado").length;
  const progresso = comTelefone.length ? Math.round((concluidos / comTelefone.length) * 100) : 0;
  const semTelefone = titulos.length - comTelefone.length;

  function enviar(titulo: Titulo) {
    if (abrirConversa(titulo)) setEstados((s) => ({ ...s, [titulo.id]: "enviado" }));
  }

  function pular(titulo: Titulo) {
    setEstados((s) => ({ ...s, [titulo.id]: "pulado" }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fila de cobrança no WhatsApp</DialogTitle>
          <DialogDescription>
            Clique em "Enviar próximo": a conversa abre com a mensagem pronta. Envie e volte aqui
            para o próximo cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-xl border bg-muted/30 p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">
              {concluidos} de {comTelefone.length} concluído(s)
            </span>
            <span className="text-xs text-muted-foreground">
              {enviados} enviado(s)
              {semTelefone > 0 ? ` · ${semTelefone} sem telefone` : ""}
            </span>
          </div>
          <Progress value={progresso} />
          {proximo ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="min-w-0 truncate">
                Próximo: <span className="font-semibold">{proximo.cliente}</span>
              </p>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={() => pular(proximo)}>
                  <SkipForward className="size-4" />
                  Pular
                </Button>
                <Button type="button" size="sm" onClick={() => enviar(proximo)}>
                  <MessageCircle className="size-4" />
                  Enviar próximo
                </Button>
              </div>
            </div>
          ) : comTelefone.length > 0 ? (
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 font-semibold text-primary">
                <CheckCircle2 className="size-4" />
                Fila concluída
              </p>
              <Button type="button" size="sm" variant="outline" onClick={() => setEstados({})}>
                <RotateCcw className="size-4" />
                Recomeçar
              </Button>
            </div>
          ) : null}
        </div>

        <div className="divide-y rounded-xl border text-sm">
          {titulos.map((titulo) => {
            const temTelefone = !!normalizePhone(titulo.telefone);
            const estado = estados[titulo.id];
            const vencido = isTituloVencido(titulo);
            return (
              <div
                key={titulo.id}
                className={`flex items-center justify-between gap-3 p-3 ${
                  proximo?.id === titulo.id ? "bg-primary/10" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate font-semibold">
                    <span className="truncate">{titulo.cliente}</span>
                    {vencido ? <Badge variant="destructive">Vencido</Badge> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {valoresVisiveis
                      ? formatCurrency(computeRow(titulo).mensalSite)
                      : "R$ ••••••"}{" "}
                    · dia {titulo.vencimento} · {titulo.situacao}
                  </p>
                  {!temTelefone ? (
                    <p className="text-xs font-semibold text-destructive">Sem telefone cadastrado</p>
                  ) : null}
                </div>
                {estado === "enviado" ? (
                  <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">
                    <CheckCircle2 className="size-4" />
                    Enviado
                  </span>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!temTelefone}
                    onClick={() => enviar(titulo)}
                  >
                    <MessageCircle className="size-4" />
                    {estado === "pulado" ? "Enviar agora" : "Abrir"}
                  </Button>
                )}
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
