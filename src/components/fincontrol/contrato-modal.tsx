import { Check, Copy, FileText, Printer, X } from "lucide-react";
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

export type ContratoModalProps = {
  cliente: Cliente | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ContratoModal({ cliente, open, onOpenChange }: ContratoModalProps) {
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
    const mesExtenso = meses[hoje.getMonth()];
    const ano = hoje.getFullYear();
    const dataAtualExtenso = `${dia} de ${mesExtenso} de ${ano}`;

    const valorTotal = valorContrato(cliente);
    const extenso = valorPorExtenso(valorTotal);

    // Data de instalação / início
    const dataInstalacao = cliente.created_at
      ? cliente.created_at.slice(0, 10).split("-").reverse().join("/")
      : `${dia}/${String(hoje.getMonth() + 1).padStart(2, "0")}/${ano}`;

    // Módulos mobile
    const modulosMobile = (cliente.modulos || []).filter((m) =>
      m.toUpperCase().includes("MOBILE"),
    );

    // Endereço formatado
    const partesEndereco = [
      cliente.endereco ? `${cliente.endereco}, ${cliente.numero_endereco || "S/N"}` : "",
      cliente.bairro ? `Bairro: ${cliente.bairro}` : "",
      cliente.cidade ? `${cliente.cidade}/${cliente.uf || "UF"}` : "",
      cliente.cep ? `CEP: ${cliente.cep}` : "",
    ].filter(Boolean);
    const enderecoFormatado = partesEndereco.join(" - ") || "Endereço cadastrado na sede";

    const cidadeContrato = cliente.cidade || "Goiânia";
    const ufContrato = cliente.uf || "GO";

    return {
      valorTotal,
      extenso,
      dataAtualExtenso,
      dataInstalacao,
      modulosMobile,
      enderecoFormatado,
      cidadeContrato,
      ufContrato,
      ano,
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
      toast.success("Texto do contrato copiado para a área de transferência.");
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl p-0 overflow-hidden bg-zinc-950 border-zinc-800 text-zinc-100"
        aria-describedby={undefined}
      >
        {/* Barra superior de ações (oculta na impressão) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/90 px-5 py-3.5 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-zinc-100">
                Contrato de Prestação de Serviços
              </DialogTitle>
              <p className="text-xs text-zinc-400">
                Prático Sistemas · {cliente.razao_social}
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
              {copiado ? "Copiado!" : "Copiar texto"}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={imprimir}
              className="gap-1.5 bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 shadow-sm"
            >
              <Printer className="size-3.5" />
              Imprimir / Salvar PDF
            </Button>
          </div>
        </div>

        {/* Informação para impressão */}
        <div className="bg-amber-950/40 border-b border-amber-900/40 px-5 py-2 text-xs text-amber-300 flex items-center justify-between print:hidden">
          <span>
            📄 Layout formatado para folha A4. Ao clicar em <strong>Imprimir</strong>, selecione &quot;Salvar como PDF&quot; para download.
          </span>
        </div>

        {/* Área rolável do documento em tela */}
        <div className="max-h-[78vh] overflow-y-auto bg-zinc-900/50 p-4 sm:p-8 print:p-0 print:m-0 print:max-h-none print:bg-transparent">
          {/* Folha estilo A4 */}
          <article
            id="area-impressao"
            className="mx-auto max-w-[800px] bg-white text-zinc-900 shadow-2xl rounded-sm p-8 sm:p-14 text-[13px] leading-relaxed border border-zinc-200 print:border-none print:shadow-none print:p-0 print:max-w-none print:text-[12px]"
          >
            {/* Cabeçalho do documento */}
            <header className="border-b-2 border-zinc-900 pb-4 mb-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-lg font-black tracking-tight text-zinc-950 uppercase">
                    Prático Sistemas
                  </h1>
                  <p className="text-xs font-semibold text-zinc-700 uppercase">
                    Automação Comercial &amp; Gestão Empresarial
                  </p>
                  <p className="text-[11px] text-zinc-600 font-mono mt-0.5">
                    CNPJ: 12.712.069/0001-27
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block rounded border border-zinc-800 bg-zinc-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-900">
                    Contrato Oficial
                  </span>
                  <p className="text-[11px] text-zinc-500 mt-1 font-mono">
                    Ref. #{cliente.id.slice(0, 8).toUpperCase()}/{dados.ano}
                  </p>
                </div>
              </div>
              <h2 className="mt-4 text-center text-sm font-bold uppercase tracking-wide text-zinc-900">
                Instrumento Particular de Licenciamento de Software e Prestação de Serviços
              </h2>
            </header>

            {/* Qualificação das Partes */}
            <section className="mb-5 space-y-2.5 text-justify">
              <p>
                <strong>CONTRATADA:</strong> <strong>PRATICO SISTEMAS</strong>, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº <strong>12.712.069/0001-27</strong>, com sede comercial estabelecida, doravante denominada simplesmente <strong>CONTRATADA</strong>.
              </p>
              <p>
                <strong>CONTRATANTE:</strong> <strong>{cliente.razao_social}</strong>
                {cliente.nome_fantasia ? ` (Nome Fantasia: ${cliente.nome_fantasia})` : ""}, inscrita no CNPJ/CPF sob o nº <strong>{cliente.cnpj || "Não informado"}</strong>, estabelecida no endereço: {dados.enderecoFormatado}, telefone: <strong>{cliente.telefone || "Não informado"}</strong>, e-mail: <strong>{cliente.email || "Não informado"}</strong>, doravante denominada simplesmente <strong>CONTRATANTE</strong>.
              </p>
              <p className="italic text-zinc-700">
                Têm, entre si, justo e acordado o presente Contrato de Prestação de Serviços de Informática e Licença de Uso de Software, que se regerá pelas seguintes cláusulas e condições:
              </p>
            </section>

            {/* Cláusula 1 */}
            <section className="mb-4 text-justify">
              <h3 className="font-bold text-zinc-950 uppercase text-xs mb-1">
                Cláusula 1ª — Do Objeto e da Instalação
              </h3>
              <p>
                1.1. O presente instrumento tem por objeto o licenciamento temporário de uso e a prestação continuada de serviços técnicos de implantação, suporte operacional, manutenção e atualização do sistema de automação e gestão empresarial <strong>PRÁTICO SISTEMAS</strong>, contratado na modalidade <strong>Plano {cliente.plano}</strong>.
              </p>
              <p className="mt-1">
                1.2. A data de início de vigência e ativação/instalação operacional do sistema no estabelecimento da CONTRATANTE é fixada a partir de <strong>{dados.dataInstalacao}</strong>.
              </p>
            </section>

            {/* Cláusula 2 */}
            <section className="mb-4 text-justify">
              <h3 className="font-bold text-zinc-950 uppercase text-xs mb-1">
                Cláusula 2ª — Dos Serviços e Recursos Inclusos
              </h3>
              <p>
                2.1. O licenciamento compreende os serviços de assistência técnica remota para resolução de dúvidas operacionais de rotina, correções de eventuais inconformidades de programação e disponibilização de atualizações de melhorias e adequações fiscais determinadas pela legislação tributária aplicável.
              </p>
            </section>

            {/* Cláusula 3 */}
            <section className="mb-4 text-justify">
              <h3 className="font-bold text-zinc-950 uppercase text-xs mb-1">
                Cláusula 3ª — Das Obrigações da Contratada
              </h3>
              <p>
                3.1. A CONTRATADA obriga-se a manter o sistema em pleno funcionamento dentro dos padrões técnicos contratados, prestar suporte em dias úteis e fornecer versões atualizadas compatíveis com a legislação fiscal em vigor.
              </p>
            </section>

            {/* Cláusula 4 */}
            <section className="mb-4 text-justify">
              <h3 className="font-bold text-zinc-950 uppercase text-xs mb-1">
                Cláusula 4ª — Das Obrigações da Contratante
              </h3>
              <p>
                4.1. A CONTRATANTE obriga-se a disponibilizar computadores e infraestrutura de rede compatíveis com as especificações mínimas exigidas pelo sistema, conexão estável com a internet e zelar pela realização rotineira de cópias de segurança (backup) do banco de dados para salvaguarda de seus dados comerciais e fiscais.
              </p>
            </section>

            {/* Cláusula 5 */}
            <section className="mb-4 text-justify">
              <h3 className="font-bold text-zinc-950 uppercase text-xs mb-1">
                Cláusula 5ª — Do Valor da Mensalidade e do Vencimento
              </h3>
              <p>
                5.1. Pela licença de uso do software e serviços continuados de suporte e manutenção, a CONTRATANTE pagará à CONTRATADA a mensalidade no valor de <strong>{formatCurrency(dados.valorTotal)}</strong> ({dados.extenso}).
              </p>
              <p className="mt-1">
                5.2. O vencimento da referida mensalidade dar-se-á impreterivelmente todo <strong>dia {cliente.vencimento}</strong> de cada mês subsequente, mediante boleto bancário, chave PIX registrada ou instrução de cobrança enviada pela CONTRATADA.
              </p>
              <p className="mt-1 text-xs text-zinc-700">
                5.3. Composição de cálculo: Valor base da licença contratada: {formatCurrency(cliente.valor_base)}
                {cliente.quantidade_computadores > 1
                  ? ` + adicional de ${cliente.quantidade_computadores - 1} terminal(is) computacional(is) a ${formatCurrency(cliente.valor_computador_adicional)}/mês cada.`
                  : " (referente a 1 terminal principal)."}
              </p>
            </section>

            {/* Cláusula 6 */}
            <section className="mb-4 text-justify">
              <h3 className="font-bold text-zinc-950 uppercase text-xs mb-1">
                Cláusula 6ª — Do Prazo e da Rescisão
              </h3>
              <p>
                6.1. O presente contrato vige por prazo indeterminado. Qualquer das partes poderá rescindi-lo mediante comunicação prévia e por escrito com antecedência mínima de 30 (trinta) dias, sem incidência de multa rescisória, estando quitadas todas as mensalidades devidas até a data da efetiva rescisão.
              </p>
            </section>

            {/* Cláusula 7 */}
            <section className="mb-4 text-justify">
              <h3 className="font-bold text-zinc-950 uppercase text-xs mb-1">
                Cláusula 7ª — Do Atendimento e Suporte Técnico
              </h3>
              <p>
                7.1. Os chamados técnicos serão atendidos pela CONTRATADA por meio de canais oficiais (WhatsApp, suporte telefônico ou conexão remota autorizada), no horário comercial vigente da empresa.
              </p>
            </section>

            {/* Cláusula 8 */}
            <section className="mb-5 text-justify">
              <h3 className="font-bold text-zinc-950 uppercase text-xs mb-1">
                Cláusula 8ª — Da Configuração do Sistema e Terminais Contratados
              </h3>
              <p>
                8.1. A estrutura licenciada e dimensionada para operação da CONTRATANTE é composta pelos seguintes parâmetros técnicos e quantitativos:
              </p>
              <ul className="mt-1.5 ml-4 list-disc space-y-1 text-xs">
                <li>
                  <strong>Quantidade de Caixas PDV / Computadores:</strong> {cliente.quantidade_computadores} computador(es) / terminal(is) autorizado(s) para operação de Frente de Caixa (PDV) e Retaguarda Administrativa.
                </li>
                <li>
                  <strong>Dispositivos Móveis / Celulares:</strong>{" "}
                  {dados.modulosMobile.length > 0
                    ? `${dados.modulosMobile.join(", ")} — Habilitado para emissão e controle via aparelhos móveis/smartphones para atendimento/comandas.`
                    : "Nenhum módulo de dispositivo móvel adicional contratado na configuração padrão."}
                </li>
                <li>
                  <strong>Módulos Habilitados:</strong>{" "}
                  {cliente.modulos && cliente.modulos.length > 0
                    ? cliente.modulos.join(" · ")
                    : "PRÁTICO (Módulo Base Comercial)"}
                </li>
                <li>
                  <strong>Conectividade / Rede VPN:</strong>{" "}
                  {cliente.rede_vpn || "Configuração padrão de rede local"}
                </li>
              </ul>
            </section>

            {/* Cláusula 9 */}
            <section className="mb-8 text-justify">
              <h3 className="font-bold text-zinc-950 uppercase text-xs mb-1">
                Cláusula 9ª — Do Foro
              </h3>
              <p>
                9.1. Para dirimir quaisquer litígios decorrentes do presente instrumento, as partes elegem o foro da Comarca de {dados.cidadeContrato}/{dados.ufContrato}, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
              </p>
            </section>

            {/* Local e data */}
            <div className="mb-12 text-center">
              <p className="font-semibold text-zinc-800">
                {dados.cidadeContrato} - {dados.ufContrato}, {dados.dataAtualExtenso}.
              </p>
            </div>

            {/* Bloco de assinaturas */}
            <footer className="grid grid-cols-2 gap-8 pt-4">
              <div className="text-center">
                <div className="mx-auto mb-2 w-4/5 border-t border-zinc-900" />
                <p className="font-bold text-xs uppercase text-zinc-950">{cliente.razao_social}</p>
                <p className="text-[11px] text-zinc-600 font-mono">CNPJ: {cliente.cnpj || "—"}</p>
                <p className="text-[11px] text-zinc-500 font-semibold uppercase mt-0.5">CONTRATANTE</p>
              </div>

              <div className="text-center">
                <div className="mx-auto mb-2 w-4/5 border-t border-zinc-900" />
                <p className="font-bold text-xs uppercase text-zinc-950">PRÁTICO SISTEMAS</p>
                <p className="text-[11px] text-zinc-600 font-mono">CNPJ: 12.712.069/0001-27</p>
                <p className="text-[11px] text-zinc-500 font-semibold uppercase mt-0.5">CONTRATADA</p>
              </div>
            </footer>
          </article>
        </div>
      </DialogContent>
    </Dialog>
  );
}
