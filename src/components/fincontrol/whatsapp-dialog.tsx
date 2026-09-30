import { useEffect, useState } from "react";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import { normalizePhone, whatsappMessage, type Titulo } from "@/lib/fincontrol";

export function WhatsAppDialog({
  open,
  titulo,
  onOpenChange,
}: {
  open: boolean;
  titulo: Titulo | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open || !titulo) return;
    setPhone(normalizePhone(titulo.telefone));
    setMessage(whatsappMessage(titulo));
  }, [open, titulo]);

  function enviar() {
    let numero = normalizePhone(phone);
    if (!numero) {
      toast.error("Digite um número de WhatsApp com DDD.");
      return;
    }
    if (!numero.startsWith("55") && numero.length <= 11) numero = `55${numero}`;
    window.open(
      `https://api.whatsapp.com/send?phone=${numero}&text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener",
    );
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar cobrança pelo WhatsApp</DialogTitle>
          <DialogDescription>
            Revise o número e a mensagem antes de abrir a conversa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="space-y-1.5">
            <Label htmlFor="wpPhone">Número com DDD</Label>
            <Input
              id="wpPhone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Ex: 11999998888"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wpMessage">Mensagem</Label>
            <Textarea
              id="wpMessage"
              rows={7}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={enviar}>
            Abrir conversa no WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
