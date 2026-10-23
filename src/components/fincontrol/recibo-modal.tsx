import { Check, Copy, Printer, Receipt, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type Cliente, valorContrato } from "@/lib/clientes";
import { valorPorExtenso } from "@/lib/extenso";
import { formatCurrency } from "@/lib/fincontrol";

export type ReciboModalProps = {
  cliente: Cliente | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type FormatoImpressao = "a4" | "termica";

export function ReciboModal({ cliente, open, onOpenChange }: ReciboModalProps) {
  const [formato, setFormato] = useState<FormatoImpressao>("a4");
  const [copiado, setCopiado] = useState(false);

  const dados = useMemo(() => {
    if (!cliente) return null;

    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, "0");
    const meses = [
      "janeiro",
      "fevereiro",
      "março",
      "abril",
      "maio",
      "junho",
      "julho",
      "agosto",
      "setembro",
      "outubro",
      "novembro",
      "dezembro",
    ];
    const mesesAbrev = [
      "Jan",
      "Fev",
      "Mar",
      "Abr",
      "Mai",
      "Jun",
      "Jul",
      "Ago",
      "Set",
      "Out",
      "Nov",
      "Dez",
    ];
    const mesExtenso = meses[hoje.getMonth()];
    const ano = hoje.getFullYear();
    const mesAnoReferencia = `${mesesAbrev[hoje.getMonth()]}/${ano}`;
    const dataAtualExtenso = `${dia} de ${mesExtenso} de ${ano}`;
    const dataHoraCurta = `${dia}/${String(hoje.getMonth() + 1).padStart(2, "0")}/${ano} ${String(hoje.getHours()).padStart(2, "0")}:${String(hoje.getMinutes()).padStart(2, "0")}`;

    const valorTotal = valorContrato(cliente);
    const extenso = valorPorExtenso(valorTotal);
    const numeroRecibo = `${ano}${String(hoje.getMonth() + 1).padStart(2, "0")}-${cliente.id.slice(0, 4).toUpperCase()}`;

    const cidade = cliente.cidade || "Goiânia";
    const uf = cliente.uf || "GO";

    return {
      valorTotal,
      extenso,
      numeroRecibo,
      mesAnoReferencia,
      dataAtualExtenso,
      dataHoraCurta,
      cidade,
      uf,
    };
  }, [cliente]);

  if (!cliente || !dados) return null;

  function imprimir() {
    window.print();
  }

  function copiarTexto() {
    const el = document.getElementById("area-impressao");
    if (!el) return;
    navigator.clipboard.writeText(el.innerText).then(() => {
      setCopiado(true);
      toast.success("Comprovante copiado para a área de transferência.");
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl p-0 overflow-hidden bg-zinc-950 border-zinc-800 text-zinc-100"
        aria-describedby={undefined}
      >
        {/* Barra superior com controles */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/90 px-5 py-3.5 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Receipt className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-zinc-100">
                Recibo de Pagamento
              </DialogTitle>
              <p className="text-xs text-zinc-400">
                {cliente.razao_social} · Recibo #{dados.numeroRecibo}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copiarTexto}
              className="gap-1.5 border-zinc-700 bg-zinc-800/80 text-xs text-zinc-200 hover:bg-zinc-700"
            >
              {copiado ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
              {copiado ? "Copiado!" : "Copiar"}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={imprimir}
              className="gap-1.5 bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 shadow-sm"
            >
              <Printer className="size-3.5" />
              Imprimir Recibo
            </Button>
          </div>
        </div>

        {/* Seletor de Formato: A4 vs Térmica */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/60 px-5 py-2 text-xs print:hidden">
          <span className="text-zinc-400">Formato de impressão:</span>
          <div className="flex rounded-lg border border-zinc-700 bg-zinc-800/80 p-0.5">
            <button
              type="button"
              onClick={() => setFormato("a4")}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                formato === "a4"
                  ? "bg-zinc-700 text-zinc-100 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              A4 / Folha Padrão
            </button>
            <button
              type="button"
              onClick={() => setFormato("termica")}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                formato === "termica"
                  ? "bg-zinc-700 text-zinc-100 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Térmica (80mm)
            </button>
          </div>
        </div>

        {/* Visualização do Recibo */}
        <div className="max-h-[75vh] overflow-y-auto bg-zinc-900/40 p-4 sm:p-8 print:p-0 print:m-0 print:max-h-none print:bg-transparent">
          {formato === "a4" ? (
            /* Recibo A4 / Padrão */
            <article
              id="area-impressao"
              className="mx-auto max-w-[620px] bg-white text-zinc-900 shadow-xl rounded-md p-6 sm:p-8 border-2 border-zinc-800 print:border-2 print:border-black print:shadow-none print:p-6 print:max-w-none text-xs leading-relaxed"
            >
              {/* Topo do Recibo */}
              <div className="flex items-start justify-between border-b-2 border-zinc-900 pb-4 mb-5">
                <div>
                  <h1 className="text-base font-black uppercase text-zinc-950 tracking-tight">
                    Prático Sistemas
                  </h1>
                  <p className="text-[11px] font-semibold text-zinc-700 uppercase">
                    Automação Comercial &amp; Gestão Empresarial
                  </p>
                  <p className="font-mono text-[10px] text-zinc-600">
                    CNPJ: 12.712.069/0001-27
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block rounded bg-zinc-950 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                    Recibo de Pagamento
                  </span>
                  <p className="mt-1 font-mono text-xs font-bold text-zinc-900">
                    Nº {dados.numeroRecibo}
                  </p>
                </div>
              </div>

              {/* Box de Valor em destaque */}
              <div className="mb-5 flex items-center justify-between rounded-lg border-2 border-zinc-900 bg-zinc-50 px-4 py-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                  Valor Pago:
                </span>
                <span className="font-mono text-xl font-black text-zinc-950">
                  {formatCurrency(dados.valorTotal)}
                </span>
              </div>

              {/* Texto do Recibo */}
              <div className="space-y-3 text-justify text-xs leading-relaxed text-zinc-800">
                <p>
                  Recebemos de <strong>{cliente.razao_social}</strong>
                  {cliente.nome_fantasia ? ` (${cliente.nome_fantasia})` : ""}, inscrita no CNPJ/CPF sob o nº <strong>{cliente.cnpj || "Não informado"}</strong>, a quantia líquida de <strong>{formatCurrency(dados.valorTotal)}</strong> ({dados.extenso}).
                </p>

                <p>
                  Referente à prestação de serviços continuados de suporte técnico, manutenção e licenciamento de uso do software <strong>PRÁTICO SISTEMAS</strong> (Plano <strong>{cliente.plano}</strong> com <strong>{cliente.quantidade_computadores}</strong> terminal(is) autorizado(s)), correspondente à competência <strong>{dados.mesAnoReferencia}</strong>, com vencimento em <strong>dia {cliente.vencimento}</strong>.
                </p>

                <p className="text-[11px] text-zinc-600 italic">
                  Pelo presente instrumento, damos plena, rasa, geral e irrevogável quitação da referida parcela mensal, nada mais havendo a reclamar quanto a este período de competência.
                </p>
              </div>

              {/* Local, Data e Assinatura */}
              <div className="mt-8 pt-4 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                  <p className="text-xs font-semibold text-zinc-800">
                    {dados.cidade} - {dados.uf}, {dados.dataAtualExtenso}.
                  </p>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                    Emitido digitalmente via UP FINCONTROL
                  </p>
                </div>

                <div className="text-center w-56">
                  <div className="border-t border-zinc-900 pt-1">
                    <p className="font-bold text-xs uppercase text-zinc-950">
                      PRÁTICO SISTEMAS
                    </p>
                    <p className="text-[10px] text-zinc-600 font-mono">
                      CNPJ: 12.712.069/0001-27
                    </p>
                  </div>
                </div>
              </div>
            </article>
          ) : (
            /* Recibo Térmica 80mm / Bobina */
            <article
              id="area-impressao"
              className="mx-auto w-[300px] bg-white text-zinc-950 shadow-xl rounded-sm p-4 font-mono text-[11px] leading-tight border border-zinc-300 print:border-none print:shadow-none print:p-2 print:w-[80mm]"
            >
              <div className="text-center border-b border-dashed border-zinc-600 pb-2 mb-2">
                <p className="font-bold text-sm tracking-wide">PRATICO SISTEMAS</p>
                <p className="text-[10px]">AUTOMACAO &amp; GESTAO</p>
                <p className="text-[10px]">CNPJ: 12.712.069/0001-27</p>
                <p className="font-bold text-xs mt-1">RECIBO DE PAGAMENTO</p>
                <p className="text-[10px]">No: {dados.numeroRecibo}</p>
              </div>

              <div className="space-y-1.5 py-1 text-[10px]">
                <div>
                  <p className="font-bold">CLIENTE:</p>
                  <p className="break-words">{cliente.razao_social}</p>
                  {cliente.nome_fantasia && (
                    <p className="text-zinc-600">({cliente.nome_fantasia})</p>
                  )}
                  <p>CNPJ: {cliente.cnpj || "Nao informado"}</p>
                </div>

                <div className="border-t border-dashed border-zinc-400 pt-1">
                  <p><strong>PLANO:</strong> {cliente.plano}</p>
                  <p><strong>TERMINAIS:</strong> {cliente.quantidade_computadores} PDV/Caixa</p>
                  <p><strong>COMPETENCIA:</strong> {dados.mesAnoReferencia}</p>
                  <p><strong>VENCIMENTO:</strong> DIA {cliente.vencimento}</p>
                </div>

                <div className="border-t border-dashed border-zinc-400 pt-1">
                  <p className="text-[10px] uppercase">Ref: Licenca software &amp; suporte tecnico Pratico Sistemas.</p>
                </div>

                <div className="border-t-2 border-zinc-800 my-1 py-1 text-center bg-zinc-100">
                  <p className="text-[10px] font-bold">VALOR QUITADO</p>
                  <p className="text-base font-black">{formatCurrency(dados.valorTotal)}</p>
                  <p className="text-[9px] italic break-words">({dados.extenso})</p>
                </div>

                <div className="border-t border-dashed border-zinc-400 pt-1 text-center">
                  <p className="font-bold text-emerald-800">*** QUITADO ***</p>
                  <p className="text-[9px]">{dados.dataHoraCurta}</p>
                  <p className="text-[9px] mt-1">{dados.cidade} - {dados.uf}</p>
                </div>

                <div className="pt-4 text-center">
                  <p className="border-t border-zinc-800 pt-1 text-[9px] font-bold">
                    PRATICO SISTEMAS
                  </p>
                  <p className="text-[8px]">12.712.069/0001-27</p>
                </div>
              </div>
            </article>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
