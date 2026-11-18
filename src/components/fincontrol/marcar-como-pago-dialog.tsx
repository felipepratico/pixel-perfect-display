import {
  Banknote,
  Calendar,
  CheckCircle2,
  CreditCard,
  RefreshCw,
  Smartphone,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { computeRow, formatCurrency, getVencimentoDate, parseNumber, type Titulo } from "@/lib/fincontrol";

type FormaPagamento = "pix" | "boleto" | "cartao" | "dinheiro" | "transferencia";

export type { FormaPagamento };

const FORMAS_PAGAMENTO: {
  value: FormaPagamento;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "pix", label: "PIX", icon: Smartphone },
  { value: "boleto", label: "Boleto", icon: Banknote },
  { value: "cartao", label: "Cartão de Crédito", icon: CreditCard },
  { value: "dinheiro", label: "Dinheiro", icon: TrendingUp },
  { value: "transferencia", label: "Transferência", icon: RefreshCw },
];

export function MarcarComoPagoDialog({
  open,
  titulos,
  saving,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  titulos: Titulo[];
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: {
    ids: string[];
    pagoEm: string;
    formaPagamento: FormaPagamento | null;
    diasAtraso: number;
    valorPago: number | null;
  }) => void | Promise<void>;
}) {
  const [pagoEm, setPagoEm] = useState("");
  const [horaPago, setHoraPago] = useState("");
  const [valorPagoTxt, setValorPagoTxt] = useState("");
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento | null>(null);

  const tituloUm = titulos[0];
  const muitos = titulos.length > 1;

  // Data de hoje no fuso local para o input type="date".
  const hoje = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  // Inicializa a data com hoje ao abrir o modal, para que o botão de confirmação
  // não fique desabilitado até o usuário interagir com o input.
  useEffect(() => {
    if (open) {
      setPagoEm(hoje);
      const d = new Date();
      setHoraPago(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
      const t = titulos[0];
      setValorPagoTxt(t && titulos.length === 1 ? computeRow(t).valorTotal.toFixed(2).replace(".", ",") : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hoje]);

  const vencimentoRef = tituloUm ? getVencimentoDate(tituloUm) : null;

  const preview = useMemo(() => {
    if (!vencimentoRef || !pagoEm) return null;
    const [y, m, dd] = pagoEm.split("-").map(Number);
    const dataPagamento = new Date(y ?? 2000, (m || 1) - 1, dd || 1);
    const diffMs = dataPagamento.getTime() - vencimentoRef.getTime();
    const diasAtraso = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    return { diasAtraso, pontual: diasAtraso === 0 };
  }, [vencimentoRef, pagoEm]);

  const modoUnico = titulos.length === 1;
  const calcUm = tituloUm ? computeRow(tituloUm) : null;
  const valorPago = valorPagoTxt.trim() ? parseNumber(valorPagoTxt) : null;
  const jurosRecebidos = calcUm && valorPago != null ? Math.max(0, valorPago - calcUm.mensalSite) : 0;
  const lucroFelipePrev = calcUm && valorPago != null ? valorPago - calcUm.lucroFrancisco - calcUm.custoBoleto : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="size-4 text-emerald-600" />
            {modoUnico ? "Marcar como pago" : "Baixar lançamentos"}
          </DialogTitle>
          <DialogDescription>
            {modoUnico ? (
              <p>
                O lançamento de{" "}
                <strong className="text-foreground font-semibold">{tituloUm?.cliente}</strong> será
                atualizado para <span className="font-semibold text-emerald-400">PAGO</span>.
              </p>
            ) : (
              <p>
                Os <strong>{titulos.length}</strong> lançamentos selecionados serão atualizados para{" "}
                <span className="font-semibold text-emerald-400">PAGO</span>.
              </p>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 p-4">
          {modoUnico && calcUm && (
            <div className="rounded-lg border p-2.5 text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Valor do título</span>
                <span className="font-semibold">{formatCurrency(calcUm.mensalSite)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Vencimento do boleto</span>
                <Badge variant="secondary">
                  {vencimentoRef ? vencimentoRef.toLocaleDateString("pt-BR") : `Dia ${tituloUm?.vencimento}`}
                </Badge>
              </div>
              <div className="space-y-1">
                <Label htmlFor="marcarPagoValor">Valor pago (com juros/multa)</Label>
                <Input
                  id="marcarPagoValor"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={valorPagoTxt}
                  onChange={(e) => setValorPagoTxt(e.target.value)}
                />
              </div>
              {valorPago != null && (
                <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                  <span>Juros/multa recebidos</span><span className="text-right">{formatCurrency(jurosRecebidos)}</span>
                  <span>Repasse Francisco (sem juros)</span><span className="text-right">{formatCurrency(calcUm.lucroFrancisco)}</span>
                  <span>Taxa do boleto</span><span className="text-right">{formatCurrency(calcUm.custoBoleto)}</span>
                  <span className="font-semibold text-foreground">Lucro Felipe</span><span className="text-right font-semibold text-foreground">{formatCurrency(lucroFelipePrev ?? 0)}</span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="marcarPagoData">Data do pagamento</Label>
            <Input
              id="marcarPagoData"
              type="date"
              value={pagoEm || hoje}
              onChange={(event) => setPagoEm(event.target.value)}
              defaultValue={hoje}
              className="w-full"
            />
            <Label htmlFor="marcarPagoHora" className="pt-1">Horário do pagamento</Label>
            <Input
              id="marcarPagoHora"
              type="time"
              value={horaPago}
              onChange={(event) => setHoraPago(event.target.value)}
              className="w-full"
            />
            <p className="text-[11px] text-muted-foreground">
              Preenchida com a data e o horário de agora. Altere para baixa retroativa.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="marcarPagoForma">Forma de recebimento</Label>
            <Select
              value={formaPagamento ?? ""}
              onValueChange={(value) => setFormaPagamento(value as FormaPagamento)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione a forma de pagamento" />
              </SelectTrigger>
              <SelectContent>
                {FORMAS_PAGAMENTO.map((forma) => (
                  <SelectItem key={forma.value} value={forma.value}>
                    <div className="flex items-center gap-2">
                      <forma.icon className="size-4" />
                      {forma.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {vencimentoRef && pagoEm && (
            <div className="rounded-lg border p-2.5 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">Vencimento</span>
                <Badge variant="secondary">
                  {vencimentoRef.getDate().toString().padStart(2, "0")}/
                  {String(vencimentoRef.getMonth() + 1).padStart(2, "0")}/
                  {vencimentoRef.getFullYear()}
                </Badge>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="font-medium">Pontualidade</span>
                <Badge
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                    preview?.pontual
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                      : (preview?.diasAtraso ?? 0 <= 5)
                        ? "bg-amber-100 text-amber-800 border-amber-200"
                        : "bg-destructive/10 text-destructive border-destructive/20"
                  }`}
                >
                  {preview?.pontual
                    ? "Em dia"
                    : preview?.diasAtraso === 1
                      ? "Atraso de 1 dia"
                      : `Atraso de ${preview?.diasAtraso} dias`}
                </Badge>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={saving || !pagoEm}
            onClick={() => {
              if (!pagoEm) return;
              onSave({
                ids: titulos.map((t) => t.id),
                pagoEm: (() => {
                  const [y, m, dd] = pagoEm.split("-").map(Number);
                  const [hh, mm] = (horaPago || "12:00").split(":").map(Number);
                  return new Date(y ?? 2000, (m || 1) - 1, dd || 1, hh || 0, mm || 0).toISOString();
                })(),
                formaPagamento,
                diasAtraso: preview?.diasAtraso ?? 0,
                valorPago: modoUnico ? valorPago : null,
              });
            }}
          >
            {saving ? (
              <div className="flex items-center gap-1">
                <RefreshCw className="size-3.5 animate-spin" />
                Baixando…
              </div>
            ) : modoUnico ? (
              <div className="flex items-center gap-1">
                <CheckCircle2 className="size-3.5" />
                Confirmar pagamento
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <CreditCard className="size-3.5" />
                Baixar {titulos.length} lançamento(s)
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
