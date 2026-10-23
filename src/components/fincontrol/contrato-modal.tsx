import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
  Image as ImageIcon,
  Pencil,
  Printer,
  RotateCcw,
  X,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
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

type Clausula = {
  titulo: string;
  conteudo: string;
};

// Gera as cláusulas padrão a partir dos dados do cliente
function clausulasPadrao(
  cliente: Cliente,
  dados: ReturnType<typeof calcularDados>,
): Clausula[] {
  const composicao =
    cliente.valor_base > 0
      ? `Valor base: ${formatCurrency(cliente.valor_base)}${
          cliente.quantidade_computadores > 1
            ? ` + ${cliente.quantidade_computadores - 1} terminal(is) adicional(is) a ${formatCurrency(cliente.valor_computador_adicional)}/mês cada`
            : " (1 terminal principal)"
        }.`
      : "";

  const modulosMobileTexto =
    dados.modulosMobile.length > 0
      ? `${dados.modulosMobile.join(", ")} — habilitado para emissão e controle via dispositivos móveis/smartphones.`
      : "Nenhum módulo de dispositivo móvel adicional contratado.";

  const modulosTexto =
    cliente.modulos && cliente.modulos.length > 0
      ? cliente.modulos.join(" · ")
      : "PRÁTICO (Módulo Base Comercial)";

  return [
    {
      titulo: "Cláusula 1ª — Do Objeto e da Instalação",
      conteudo: `1.1. O presente instrumento tem por objeto o licenciamento temporário de uso e a prestação continuada de serviços técnicos de implantação, suporte operacional, manutenção e atualização do sistema de automação e gestão empresarial PRÁTICO SISTEMAS, contratado na modalidade Plano ${cliente.plano}.\n\n1.2. A data de início de vigência e ativação/instalação operacional do sistema no estabelecimento da CONTRATANTE é fixada a partir de ${dados.dataInstalacao}.`,
    },
    {
      titulo: "Cláusula 2ª — Dos Serviços e Recursos Inclusos",
      conteudo:
        "2.1. O licenciamento compreende os serviços de assistência técnica remota para resolução de dúvidas operacionais de rotina, correções de eventuais inconformidades de programação e disponibilização de atualizações de melhorias e adequações fiscais determinadas pela legislação tributária aplicável.",
    },
    {
      titulo: "Cláusula 3ª — Das Obrigações da Contratada",
      conteudo:
        "3.1. A CONTRATADA obriga-se a manter o sistema em pleno funcionamento dentro dos padrões técnicos contratados, prestar suporte em dias úteis e fornecer versões atualizadas compatíveis com a legislação fiscal em vigor.",
    },
    {
      titulo: "Cláusula 4ª — Das Obrigações da Contratante",
      conteudo:
        "4.1. A CONTRATANTE obriga-se a disponibilizar computadores e infraestrutura de rede compatíveis com as especificações mínimas exigidas pelo sistema, conexão estável com a internet e zelar pela realização rotineira de cópias de segurança (backup) do banco de dados para salvaguarda de seus dados comerciais e fiscais.",
    },
    {
      titulo: "Cláusula 5ª — Do Valor da Mensalidade e do Vencimento",
      conteudo: `5.1. Pela licença de uso do software e serviços continuados de suporte e manutenção, a CONTRATANTE pagará à CONTRATADA a mensalidade no valor de ${formatCurrency(dados.valorTotal)} (${dados.extenso}).\n\n5.2. O vencimento da referida mensalidade dar-se-á impreterivelmente todo dia ${cliente.vencimento} de cada mês subsequente, mediante boleto bancário, chave PIX registrada ou instrução de cobrança enviada pela CONTRATADA.\n\n5.3. ${composicao}`,
    },
    {
      titulo: "Cláusula 6ª — Do Prazo e da Rescisão",
      conteudo:
        "6.1. O presente contrato vige por prazo indeterminado. Qualquer das partes poderá rescindi-lo mediante comunicação prévia e por escrito com antecedência mínima de 30 (trinta) dias, sem incidência de multa rescisória, estando quitadas todas as mensalidades devidas até a data da efetiva rescisão.",
    },
    {
      titulo: "Cláusula 7ª — Do Atendimento e Suporte Técnico",
      conteudo:
        "7.1. Os chamados técnicos serão atendidos pela CONTRATADA por meio de canais oficiais (WhatsApp, suporte telefônico ou conexão remota autorizada), no horário comercial vigente da empresa.",
    },
    {
      titulo: "Cláusula 8ª — Da Configuração do Sistema e Terminais Contratados",
      conteudo: `8.1. A estrutura licenciada e dimensionada para operação da CONTRATANTE é composta pelos seguintes parâmetros:\n\n• Caixas PDV / Computadores: ${cliente.quantidade_computadores} terminal(is) autorizado(s).\n• Dispositivos Móveis: ${modulosMobileTexto}\n• Módulos Habilitados: ${modulosTexto}\n• Rede/VPN: ${cliente.rede_vpn || "Configuração padrão de rede local"}.`,
    },
    {
      titulo: "Cláusula 9ª — Do Foro",
      conteudo: `9.1. Para dirimir quaisquer litígios decorrentes do presente instrumento, as partes elegem o foro da Comarca de ${dados.cidadeContrato}/${dados.ufContrato}, com renúncia expressa a qualquer outro, por mais privilegiado que seja.`,
    },
  ];
}

function calcularDados(cliente: Cliente) {
  const hoje = new Date();
  const dia = String(hoje.getDate()).padStart(2, "0");
  const meses = [
    "janeiro","fevereiro","março","abril","maio","junho",
    "julho","agosto","setembro","outubro","novembro","dezembro",
  ];
  const ano = hoje.getFullYear();
  const dataAtualExtenso = `${dia} de ${meses[hoje.getMonth()]} de ${ano}`;
  const valorTotal = valorContrato(cliente);
  const extenso = valorPorExtenso(valorTotal);
  const dataInstalacao = cliente.created_at
    ? cliente.created_at.slice(0, 10).split("-").reverse().join("/")
    : `${dia}/${String(hoje.getMonth() + 1).padStart(2, "0")}/${ano}`;
  const modulosMobile = (cliente.modulos || []).filter((m) =>
    m.toUpperCase().includes("MOBILE"),
  );
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
}

// Converte o texto com \n em parágrafos HTML
function textoParaHtml(texto: string): string {
  return texto
    .split("\n")
    .map((linha) => `<p style="margin:0 0 4px 0;text-align:justify;">${linha || "&nbsp;"}</p>`)
    .join("");
}

export function ContratoModal({ cliente, open, onOpenChange }: ContratoModalProps) {
  const [copiado, setCopiado] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [editandoClausula, setEditandoClausula] = useState<number | null>(null);
  const [clausulasEditadas, setClausulasEditadas] = useState<Clausula[] | null>(null);
  const [tituloEditado, setTituloEditado] = useState("");
  const [conteudoEditado, setConteudoEditado] = useState("");
  const [secaoExpandida, setSecaoExpandida] = useState<"clausulas" | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const dados = useMemo(() => (cliente ? calcularDados(cliente) : null), [cliente]);

  const clausulasBase = useMemo(
    () => (cliente && dados ? clausulasPadrao(cliente, dados) : []),
    [cliente, dados],
  );

  const clausulas = clausulasEditadas ?? clausulasBase;

  const resetarEdicao = useCallback(() => {
    setClausulasEditadas(null);
    setEditandoClausula(null);
  }, []);

  if (!cliente || !dados) return null;

  // Upload de logo
  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_000_000) {
      toast.error("Imagem muito grande. Use uma imagem de até 1 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  // Salvar edição de uma cláusula
  function salvarEdicaoClausula() {
    if (editandoClausula === null) return;
    const novas = clausulas.map((c, i) =>
      i === editandoClausula
        ? { titulo: tituloEditado, conteudo: conteudoEditado }
        : c,
    );
    setClausulasEditadas(novas);
    setEditandoClausula(null);
  }

  // Abrir edição
  function abrirEdicao(idx: number) {
    setTituloEditado(clausulas[idx].titulo);
    setConteudoEditado(clausulas[idx].conteudo);
    setEditandoClausula(idx);
  }

  // Copia texto do contrato
  function copiarTexto() {
    const texto = clausulas
      .map((c) => `${c.titulo}\n${c.conteudo}`)
      .join("\n\n");
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true);
      toast.success("Texto do contrato copiado.");
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  // Impressão via iframe isolado (garante que os dados apareçam corretamente)
  function imprimir() {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.top = "-9999px";
    iframe.style.left = "-9999px";
    iframe.style.width = "210mm";
    iframe.style.height = "297mm";
    document.body.appendChild(iframe);

    const logoHtml = logoUrl
      ? `<img src="${logoUrl}" style="max-height:60px;max-width:180px;object-fit:contain;" alt="Logo" />`
      : `<div style="font-size:18px;font-weight:900;text-transform:uppercase;letter-spacing:1px;">Prático Sistemas</div>`;

    const clausulasHtml = clausulas
      .map(
        (c) => `
        <div style="margin-bottom:14px;">
          <div style="font-weight:700;font-size:11px;text-transform:uppercase;margin-bottom:4px;color:#111;">${c.titulo}</div>
          ${textoParaHtml(c.conteudo)}
        </div>`,
      )
      .join("");

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Contrato — ${cliente.razao_social}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12px;
      color: #111;
      background: #fff;
      padding: 20mm 18mm;
    }
    header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      border-bottom: 2px solid #111;
      padding-bottom: 10px;
      margin-bottom: 16px;
    }
    .header-left { display: flex; flex-direction: column; gap: 2px; }
    .header-right { text-align: right; }
    .badge {
      display: inline-block;
      border: 1px solid #111;
      padding: 2px 8px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    h2 {
      text-align: center;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 16px;
    }
    .partes { margin-bottom: 14px; }
    .partes p { margin-bottom: 6px; text-align: justify; line-height: 1.6; }
    .clausula { margin-bottom: 14px; }
    .clausula-titulo { font-weight: 700; font-size: 11px; text-transform: uppercase; margin-bottom: 4px; }
    .clausula p { text-align: justify; line-height: 1.6; margin-bottom: 4px; }
    .data { text-align: center; font-weight: 600; margin: 24px 0; }
    .assinaturas { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 16px; }
    .ass-bloco { text-align: center; }
    .ass-linha { border-top: 1px solid #111; margin-bottom: 4px; width: 80%; margin-left: auto; margin-right: auto; }
    .ass-nome { font-weight: 700; font-size: 11px; text-transform: uppercase; }
    .ass-cnpj { font-size: 10px; color: #555; font-family: monospace; }
    .ass-tipo { font-size: 10px; font-weight: 700; text-transform: uppercase; }
    @page { margin: 0; size: A4; }
  </style>
</head>
<body>
  <header>
    <div class="header-left">
      ${logoHtml}
      <div style="font-size:10px;color:#555;font-weight:600;text-transform:uppercase;margin-top:2px;">Automação Comercial &amp; Gestão Empresarial</div>
      <div style="font-size:10px;color:#666;font-family:monospace;">CNPJ: 12.712.069/0001-27</div>
    </div>
    <div class="header-right">
      <span class="badge">Contrato Oficial</span>
      <div style="font-size:10px;color:#888;margin-top:4px;font-family:monospace;">Ref. #${cliente.id.slice(0, 8).toUpperCase()}/${dados.ano}</div>
    </div>
  </header>

  <h2>Instrumento Particular de Licenciamento de Software e Prestação de Serviços</h2>

  <div class="partes">
    <p><strong>CONTRATADA:</strong> <strong>PRATICO SISTEMAS</strong>, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº <strong>12.712.069/0001-27</strong>, com sede comercial estabelecida, doravante denominada simplesmente <strong>CONTRATADA</strong>.</p>
    <p><strong>CONTRATANTE:</strong> <strong>${cliente.razao_social}</strong>${cliente.nome_fantasia ? ` (Nome Fantasia: ${cliente.nome_fantasia})` : ""}, inscrita no CNPJ/CPF sob o nº <strong>${cliente.cnpj || "Não informado"}</strong>, estabelecida no endereço: ${dados.enderecoFormatado}, telefone: <strong>${cliente.telefone || "Não informado"}</strong>, e-mail: <strong>${cliente.email || "Não informado"}</strong>, doravante denominada simplesmente <strong>CONTRATANTE</strong>.</p>
    <p style="font-style:italic;color:#444;">Têm, entre si, justo e acordado o presente Contrato de Prestação de Serviços de Informática e Licença de Uso de Software, que se regerá pelas seguintes cláusulas e condições:</p>
  </div>

  ${clausulasHtml}

  <div class="data">${dados.cidadeContrato} — ${dados.ufContrato}, ${dados.dataAtualExtenso}.</div>

  <div class="assinaturas">
    <div class="ass-bloco">
      <div class="ass-linha"></div>
      <div class="ass-nome">${cliente.razao_social}</div>
      <div class="ass-cnpj">CNPJ: ${cliente.cnpj || "—"}</div>
      <div class="ass-tipo">CONTRATANTE</div>
    </div>
    <div class="ass-bloco">
      <div class="ass-linha"></div>
      <div class="ass-nome">PRÁTICO SISTEMAS</div>
      <div class="ass-cnpj">CNPJ: 12.712.069/0001-27</div>
      <div class="ass-tipo">CONTRATADA</div>
    </div>
  </div>
</body>
</html>`;

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) { document.body.removeChild(iframe); return; }
    doc.open();
    doc.write(html);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1500);
    }, 400);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-5xl w-full p-0 overflow-hidden bg-zinc-950 border-zinc-800 text-zinc-100 flex flex-col"
        style={{ maxHeight: "95vh" }}
        aria-describedby={undefined}
      >
        {/* ─── Barra superior ─────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/90 px-5 py-3 shrink-0">
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
          <div className="flex flex-wrap items-center gap-2">
            {/* Logo */}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onLogoChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => logoInputRef.current?.click()}
              className="gap-1.5 border-zinc-700 bg-zinc-800/80 text-xs text-zinc-300 hover:bg-zinc-700"
              title="Adicionar logo da empresa"
            >
              <ImageIcon className="size-3.5" />
              {logoUrl ? "Trocar logo" : "Adicionar logo"}
            </Button>
            {logoUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setLogoUrl(null)}
                className="gap-1 border-zinc-700 text-xs text-zinc-400 hover:text-zinc-200 px-2"
                title="Remover logo"
              >
                <X className="size-3" /> Logo
              </Button>
            )}
            {clausulasEditadas && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetarEdicao}
                className="gap-1.5 border-zinc-700 bg-zinc-800/80 text-xs text-amber-400 hover:bg-zinc-700"
                title="Restaurar cláusulas originais"
              >
                <RotateCcw className="size-3.5" /> Restaurar
              </Button>
            )}
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
              className="gap-1.5 bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 shadow-sm"
            >
              <Printer className="size-3.5" />
              Imprimir / Salvar PDF
            </Button>
          </div>
        </div>

        {/* ─── Info impressão ─────────────────────────────────────────── */}
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-b border-amber-900/40 bg-amber-950/30 px-5 py-1.5 text-xs text-amber-300">
          <span>📄 A impressão abre uma janela limpa com todos os dados atualizados.</span>
          <button
            type="button"
            onClick={() => setSecaoExpandida(v => v === "clausulas" ? null : "clausulas")}
            className="flex items-center gap-1 text-amber-400 hover:text-amber-200 font-semibold"
          >
            {secaoExpandida === "clausulas" ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            {secaoExpandida === "clausulas" ? "Ocultar editor" : "Editar cláusulas"}
          </button>
        </div>

        {/* ─── Editor de cláusulas (expansível) ───────────────────────── */}
        {secaoExpandida === "clausulas" && (
          <div className="shrink-0 border-b border-zinc-800 bg-zinc-900/80 px-5 py-3 max-h-72 overflow-y-auto">
            {editandoClausula !== null ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-zinc-300">
                  Editando cláusula {editandoClausula + 1}:
                </p>
                <input
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-primary"
                  value={tituloEditado}
                  onChange={(e) => setTituloEditado(e.target.value)}
                  placeholder="Título da cláusula"
                />
                <textarea
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-primary leading-relaxed"
                  rows={6}
                  value={conteudoEditado}
                  onChange={(e) => setConteudoEditado(e.target.value)}
                  placeholder="Conteúdo da cláusula (use Enter para novas linhas)"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={salvarEdicaoClausula} className="text-xs gap-1">
                    <Check className="size-3.5" /> Salvar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditandoClausula(null)}
                    className="text-xs border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700">
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                {clausulas.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 hover:border-zinc-600"
                  >
                    <span className="text-xs text-zinc-300 truncate">{c.titulo}</span>
                    <button
                      type="button"
                      onClick={() => abrirEdicao(i)}
                      className="shrink-0 flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 font-semibold"
                    >
                      <Pencil className="size-3" /> Editar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Prévia do documento ────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto bg-zinc-900/40 p-4 sm:p-8">
          <article className="mx-auto max-w-[800px] bg-white text-zinc-900 shadow-2xl rounded-sm border border-zinc-200"
            style={{ padding: "36px 48px", fontSize: "12px", lineHeight: "1.7" }}>
            {/* Cabeçalho com logo */}
            <header style={{ borderBottom: "2px solid #111", paddingBottom: "12px", marginBottom: "18px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
                <div>
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Logo"
                      style={{ maxHeight: "60px", maxWidth: "180px", objectFit: "contain", marginBottom: "4px" }}
                    />
                  ) : (
                    <div style={{ fontSize: "18px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px", color: "#111" }}>
                      Prático Sistemas
                    </div>
                  )}
                  <div style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", color: "#555", marginTop: "2px" }}>
                    Automação Comercial &amp; Gestão Empresarial
                  </div>
                  <div style={{ fontSize: "10px", color: "#666", fontFamily: "monospace" }}>
                    CNPJ: 12.712.069/0001-27
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ display: "inline-block", border: "1px solid #111", padding: "2px 8px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>
                    Contrato Oficial
                  </span>
                  <div style={{ fontSize: "10px", color: "#888", marginTop: "4px", fontFamily: "monospace" }}>
                    Ref. #{cliente.id.slice(0, 8).toUpperCase()}/{dados.ano}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "center", fontWeight: 700, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: "14px" }}>
                Instrumento Particular de Licenciamento de Software e Prestação de Serviços
              </div>
            </header>

            {/* Qualificação das partes */}
            <section style={{ marginBottom: "16px" }}>
              <p style={{ marginBottom: "6px", textAlign: "justify" }}>
                <strong>CONTRATADA:</strong> <strong>PRATICO SISTEMAS</strong>, pessoa jurídica de direito privado,
                inscrita no CNPJ sob o nº <strong>12.712.069/0001-27</strong>, com sede comercial estabelecida,
                doravante denominada simplesmente <strong>CONTRATADA</strong>.
              </p>
              <p style={{ marginBottom: "6px", textAlign: "justify" }}>
                <strong>CONTRATANTE:</strong> <strong>{cliente.razao_social}</strong>
                {cliente.nome_fantasia ? ` (Nome Fantasia: ${cliente.nome_fantasia})` : ""},
                inscrita no CNPJ/CPF sob o nº <strong>{cliente.cnpj || "Não informado"}</strong>,
                estabelecida no endereço: {dados.enderecoFormatado},
                telefone: <strong>{cliente.telefone || "Não informado"}</strong>,
                e-mail: <strong>{cliente.email || "Não informado"}</strong>,
                doravante denominada simplesmente <strong>CONTRATANTE</strong>.
              </p>
              <p style={{ fontStyle: "italic", color: "#555", textAlign: "justify" }}>
                Têm, entre si, justo e acordado o presente Contrato de Prestação de Serviços de Informática
                e Licença de Uso de Software, que se regerá pelas seguintes cláusulas e condições:
              </p>
            </section>

            {/* Cláusulas editáveis */}
            {clausulas.map((c, i) => (
              <section key={i} style={{ marginBottom: "14px", position: "relative" }}>
                {/* Botão editar na prévia */}
                <button
                  type="button"
                  onClick={() => {
                    setSecaoExpandida("clausulas");
                    abrirEdicao(i);
                  }}
                  title="Editar esta cláusula"
                  style={{
                    position: "absolute", top: 0, right: 0,
                    background: "none", border: "none", cursor: "pointer",
                    opacity: 0.4, padding: "2px 4px",
                    display: "flex", alignItems: "center", gap: "2px",
                    fontSize: "10px", color: "#2563eb",
                  }}
                  className="hover:opacity-100 transition-opacity"
                >
                  <Pencil size={11} /> editar
                </button>
                <div style={{ fontWeight: 700, fontSize: "11px", textTransform: "uppercase", marginBottom: "4px", color: "#111" }}>
                  {c.titulo}
                </div>
                {c.conteudo.split("\n").map((linha, j) => (
                  <p key={j} style={{ marginBottom: "3px", textAlign: "justify" }}>{linha || "\u00A0"}</p>
                ))}
              </section>
            ))}

            {/* Data */}
            <div style={{ textAlign: "center", fontWeight: 600, margin: "24px 0 16px" }}>
              {dados.cidadeContrato} — {dados.ufContrato}, {dados.dataAtualExtenso}.
            </div>

            {/* Assinaturas */}
            <footer style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ borderTop: "1px solid #111", width: "80%", margin: "0 auto 4px" }} />
                <div style={{ fontWeight: 700, fontSize: "11px", textTransform: "uppercase" }}>
                  {cliente.razao_social}
                </div>
                <div style={{ fontSize: "10px", color: "#666", fontFamily: "monospace" }}>
                  CNPJ: {cliente.cnpj || "—"}
                </div>
                <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "#777" }}>
                  CONTRATANTE
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ borderTop: "1px solid #111", width: "80%", margin: "0 auto 4px" }} />
                <div style={{ fontWeight: 700, fontSize: "11px", textTransform: "uppercase" }}>
                  PRÁTICO SISTEMAS
                </div>
                <div style={{ fontSize: "10px", color: "#666", fontFamily: "monospace" }}>
                  CNPJ: 12.712.069/0001-27
                </div>
                <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "#777" }}>
                  CONTRATADA
                </div>
              </div>
            </footer>
          </article>
        </div>
      </DialogContent>
    </Dialog>
  );
}
