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
  itens: string[];          // cada string é um parágrafo ou item de lista (prefixar com "• " para bullet)
};

function calcularDados(cliente: Cliente) {
  const hoje = new Date();
  const dia = String(hoje.getDate()).padStart(2, "0");
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const ano = hoje.getFullYear();
  const meses = [
    "janeiro","fevereiro","março","abril","maio","junho",
    "julho","agosto","setembro","outubro","novembro","dezembro",
  ];
  const dataAtualExtenso = `${dia} de ${meses[hoje.getMonth()]} de ${ano}`;
  const dataAtual = `${dia}/${mes}/${ano}`;
  const valorTotal = valorContrato(cliente);
  const extenso = valorPorExtenso(valorTotal);
  const dataInstalacao = cliente.created_at
    ? cliente.created_at.slice(0, 10).split("-").reverse().join("/")
    : dataAtual;
  const qtdMobile = (cliente.modulos || []).filter((m) =>
    m.toUpperCase().includes("MOBILE"),
  ).length;
  const cidadeContrato = cliente.cidade || "Goiânia";
  const ufContrato = cliente.uf || "GO";

  return {
    valorTotal,
    extenso,
    dataAtualExtenso,
    dataAtual,
    dataInstalacao,
    qtdMobile,
    cidadeContrato,
    ufContrato,
    ano,
    dia,
  };
}

// Gera as cláusulas padrão seguindo exatamente o modelo Prático Sistemas
function clausulasPadrao(
  cliente: Cliente,
  dados: ReturnType<typeof calcularDados>,
): Clausula[] {
  const qtdPDV = cliente.quantidade_computadores || 1;
  const qtdMobile = dados.qtdMobile;

  return [
    {
      titulo: "1. OBJETO",
      itens: [
        "O presente contrato tem como objeto a instalação, uso e suporte do software Prático Sistemas, destinado à automação comercial.",
        `A instalação do sistema foi realizada em ${dados.dataInstalacao}.`,
      ],
    },
    {
      titulo: "2. SUPORTE E ATENDIMENTO",
      itens: [
        "O suporte ao sistema será realizado nos seguintes horários:",
        "• Segunda a sexta-feira: 08:00 às 17:00",
        "• Sábado: 08:00 às 12:00",
        "O atendimento será realizado remotamente por meio de acesso via AnyDesk.",
      ],
    },
    {
      titulo: "3. LIMITAÇÃO DO SUPORTE",
      itens: [
        "O suporte prestado refere-se exclusivamente ao software Prático Sistemas.",
        "Não estão incluídos:",
        "• Manutenção de computadores",
        "• Problemas de hardware",
        "• Configuração ou manutenção de rede",
        "• Problemas de internet",
        "• Instalação ou manutenção de programas de terceiros",
        "• Problemas relacionados ao sistema operacional",
      ],
    },
    {
      titulo: "4. RESPONSABILIDADE SOBRE DADOS",
      itens: [
        "A segurança e guarda do banco de dados são de inteira responsabilidade do CONTRATANTE.",
        "O CONTRATANTE deverá realizar backup periódico em:",
        "• Pen drive",
        "• HD externo",
        "• Nuvem",
        "• Ou qualquer outro dispositivo de armazenamento",
        "A PRÁTICO SISTEMAS não se responsabiliza por perda de dados decorrente da ausência de backup.",
      ],
    },
    {
      titulo: "5. MENSALIDADE",
      itens: [
        `O valor do serviço será de ${formatCurrency(dados.valorTotal)} (${dados.extenso}) mensais, em forma de assinatura recorrente.`,
        `• Vencimento: todo dia ${cliente.vencimento} de cada mês`,
        "• A cobrança será enviada por e-mail com antecedência de 10 dias",
      ],
    },
    {
      titulo: "6. MULTA POR ATRASO",
      itens: [
        "Em caso de atraso no pagamento da mensalidade, será aplicada multa conforme condições a serem definidas entre as partes.",
      ],
    },
    {
      titulo: "7. SUSPENSÃO DO SISTEMA",
      itens: [
        "Em caso de inadimplência de 10 dias, a CONTRATADA poderá suspender o acesso ao sistema até a regularização do pagamento.",
        "Após a quitação dos valores pendentes, o sistema será reativado normalmente.",
      ],
    },
    {
      titulo: "8. CONFIGURAÇÃO DO SISTEMA",
      itens: [
        "O sistema foi configurado para uso em:",
        `• ${String(qtdPDV).padStart(2, "0")} caixa(s) PDV`,
        `• ${String(qtdMobile).padStart(2, "0")} dispositivo(s) móvel(is) (celulares)`,
        "Caso o CONTRATANTE deseje:",
        "• Adicionar mais caixas PDV",
        "• Configurar mais dispositivos",
        "Poderá ocorrer reajuste no valor da mensalidade.",
      ],
    },
    {
      titulo: "9. DISPOSIÇÕES FINAIS",
      itens: [
        "Este contrato passa a valer a partir da data de instalação.",
      ],
    },
  ];
}

// Renderiza itens: bullet points vs parágrafos normais
function renderItensHtmlStr(itens: string[]): string {
  return itens
    .map((item) => {
      if (item.startsWith("• ")) {
        return `<div style="padding-left:16px;margin-bottom:3px;">${item}</div>`;
      }
      return `<p style="margin:0 0 5px 0;text-align:justify;">${item}</p>`;
    })
    .join("");
}

export function ContratoModal({ cliente, open, onOpenChange }: ContratoModalProps) {
  const [copiado, setCopiado] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [editandoIdx, setEditandoIdx] = useState<number | null>(null);
  const [clausulasEditadas, setClausulasEditadas] = useState<Clausula[] | null>(null);
  const [tituloEd, setTituloEd] = useState("");
  const [itensEd, setItensEd] = useState("");       // texto livre separado por \n
  const [panelAberto, setPanelAberto] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const dados = useMemo(() => (cliente ? calcularDados(cliente) : null), [cliente]);
  const clausulasBase = useMemo(
    () => (cliente && dados ? clausulasPadrao(cliente, dados) : []),
    [cliente, dados],
  );
  const clausulas = clausulasEditadas ?? clausulasBase;

  const resetarEdicao = useCallback(() => {
    setClausulasEditadas(null);
    setEditandoIdx(null);
  }, []);

  if (!cliente || !dados) return null;

  /* ── Handlers ──────────────────────────────────────────────────── */
  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) { toast.error("Imagem muito grande. Use até 1,5 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => setLogoUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  function abrirEdicao(idx: number) {
    setTituloEd(clausulas[idx].titulo);
    setItensEd(clausulas[idx].itens.join("\n"));
    setEditandoIdx(idx);
  }

  function salvarEdicao() {
    if (editandoIdx === null) return;
    const novas = clausulas.map((c, i) =>
      i === editandoIdx
        ? { titulo: tituloEd, itens: itensEd.split("\n").filter(Boolean) }
        : c,
    );
    setClausulasEditadas(novas);
    setEditandoIdx(null);
  }

  function copiarTexto() {
    const txt = clausulas.map((c) => `${c.titulo}\n${c.itens.join("\n")}`).join("\n\n");
    navigator.clipboard.writeText(txt).then(() => {
      setCopiado(true);
      toast.success("Texto copiado!");
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  /* ── Impressão via iframe isolado ─────────────────────────────── */
  function imprimir() {
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;";
    document.body.appendChild(iframe);

    const logoHtml = logoUrl
      ? `<img src="${logoUrl}" style="max-height:64px;max-width:200px;object-fit:contain;display:block;margin-bottom:4px;" alt="Logo" />`
      : `<div style="font-size:20px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#111;margin-bottom:2px;">Prático Sistemas</div>`;

    const clausulasHtml = clausulas
      .map(
        (c) => `
        <div class="clausula">
          <div class="cl-titulo">${c.titulo}</div>
          ${renderItensHtmlStr(c.itens)}
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
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
      color: #111;
      background: #fff;
      padding: 18mm 20mm;
      line-height: 1.65;
    }
    /* ── Cabeçalho ── */
    .header {
      text-align: center;
      border-bottom: 3px solid #111;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .header .empresa-nome {
      font-size: 22px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 3px;
      color: #111;
    }
    .header .titulo-doc {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #555;
      margin-top: 2px;
    }
    /* ── Partes ── */
    .partes {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 12px 16px;
      margin-bottom: 18px;
      background: #fafafa;
    }
    .parte-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #888;
      margin-bottom: 3px;
    }
    .parte-nome { font-weight: 700; font-size: 12px; }
    .parte-sub  { font-size: 11px; color: #444; }
    /* ── Separador ── */
    .sep {
      border: none;
      border-top: 1px solid #ccc;
      margin: 14px 0;
    }
    /* ── Cláusulas ── */
    .clausula { margin-bottom: 16px; }
    .cl-titulo {
      font-weight: 700;
      font-size: 12px;
      text-transform: uppercase;
      border-bottom: 1px solid #ddd;
      padding-bottom: 3px;
      margin-bottom: 6px;
      letter-spacing: 0.3px;
    }
    .clausula p { text-align: justify; margin-bottom: 4px; }
    .clausula div { line-height: 1.65; }
    /* ── Assinaturas ── */
    .assinaturas {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 30px;
    }
    .ass-bloco { text-align: center; }
    .ass-linha { border-top: 1px solid #111; width: 85%; margin: 0 auto 5px; }
    .ass-nome  { font-weight: 700; font-size: 11px; text-transform: uppercase; }
    .ass-sub   { font-size: 10px; color: #555; font-family: monospace; }
    .ass-tipo  { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #666; margin-top: 2px; }
    .data-assin { font-weight: 600; margin: 6px 0 2px; font-size: 12px; }
    @page { margin: 0; size: A4; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>

  <!-- Cabeçalho -->
  <div class="header">
    ${logoUrl
      ? `<img src="${logoUrl}" style="max-height:64px;max-width:220px;object-fit:contain;display:block;margin:0 auto 6px;" alt="Logo" />`
      : `<div class="empresa-nome">Prático Sistemas</div>`}
    <div class="titulo-doc">Contrato de Prestação de Serviços</div>
  </div>

  <!-- Qualificação das partes -->
  <div class="partes">
    <div>
      <div class="parte-label">Contratada</div>
      <div class="parte-nome">PRÁTICO SISTEMAS</div>
      <div class="parte-sub">CNPJ: 12.712.069/0001-27</div>
    </div>
    <div>
      <div class="parte-label">Contratante</div>
      <div class="parte-nome">${cliente.razao_social}</div>
      ${cliente.nome_fantasia ? `<div class="parte-sub">Nome Fantasia: ${cliente.nome_fantasia}</div>` : ""}
      <div class="parte-sub">CNPJ/CPF: ${cliente.cnpj || "Não informado"}</div>
      ${cliente.telefone ? `<div class="parte-sub">Tel: ${cliente.telefone}</div>` : ""}
    </div>
  </div>

  <hr class="sep">

  <!-- Cláusulas -->
  ${clausulasHtml}

  <hr class="sep">

  <!-- Data e assinaturas -->
  <div class="assinaturas">
    <div class="ass-bloco">
      <div class="data-assin">Data: _____ / _____ / _________</div>
      <div class="ass-linha" style="margin-top:32px;"></div>
      <div class="ass-nome">${cliente.razao_social}</div>
      ${cliente.cnpj ? `<div class="ass-sub">CNPJ: ${cliente.cnpj}</div>` : ""}
      <div class="ass-tipo">Contratante</div>
    </div>
    <div class="ass-bloco">
      <div class="data-assin">&nbsp;</div>
      <div class="ass-linha" style="margin-top:32px;"></div>
      <div class="ass-nome">Prático Sistemas</div>
      <div class="ass-sub">CNPJ: 12.712.069/0001-27</div>
      <div class="ass-tipo">Contratada</div>
    </div>
  </div>

</body>
</html>`;

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) { document.body.removeChild(iframe); return; }
    doc.open(); doc.write(html); doc.close();
    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1500);
    }, 500);
  }

  /* ── JSX da prévia ─────────────────────────────────────────────── */
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-5xl w-full p-0 overflow-hidden bg-zinc-950 border-zinc-800 text-zinc-100 flex flex-col"
        style={{ maxHeight: "95vh" }}
        aria-describedby={undefined}
      >
        {/* Barra de ações */}
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
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={onLogoChange} />
            <Button type="button" variant="outline" size="sm"
              onClick={() => logoInputRef.current?.click()}
              className="gap-1.5 border-zinc-700 bg-zinc-800/80 text-xs text-zinc-300 hover:bg-zinc-700">
              <ImageIcon className="size-3.5" />
              {logoUrl ? "Trocar logo" : "Adicionar logo"}
            </Button>
            {logoUrl && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setLogoUrl(null)}
                className="gap-1 px-2 text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-700">
                <X className="size-3" /> Logo
              </Button>
            )}
            {clausulasEditadas && (
              <Button type="button" variant="outline" size="sm" onClick={resetarEdicao}
                className="gap-1.5 border-zinc-700 bg-zinc-800/80 text-xs text-amber-400 hover:bg-zinc-700">
                <RotateCcw className="size-3.5" /> Restaurar
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" onClick={copiarTexto}
              className="gap-1.5 border-zinc-700 bg-zinc-800/80 text-xs text-zinc-200 hover:bg-zinc-700">
              {copiado ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
              {copiado ? "Copiado!" : "Copiar"}
            </Button>
            <Button type="button" size="sm" onClick={imprimir}
              className="gap-1.5 bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 shadow-sm">
              <Printer className="size-3.5" />
              Imprimir / PDF
            </Button>
          </div>
        </div>

        {/* Banner editar cláusulas */}
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-b border-amber-900/40 bg-amber-950/30 px-5 py-1.5 text-xs text-amber-300">
          <span>📄 Clique em <strong>Imprimir / PDF</strong> para gerar o documento formatado com todos os dados.</span>
          <button type="button"
            onClick={() => setPanelAberto((v) => !v)}
            className="flex items-center gap-1 font-semibold text-amber-400 hover:text-amber-200">
            {panelAberto ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            {panelAberto ? "Fechar editor" : "Editar cláusulas"}
          </button>
        </div>

        {/* Painel editor de cláusulas */}
        {panelAberto && (
          <div className="shrink-0 border-b border-zinc-800 bg-zinc-900/80 px-5 py-4 max-h-80 overflow-y-auto">
            {editandoIdx !== null ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-zinc-300">
                  Editando: <span className="text-primary">{clausulas[editandoIdx].titulo}</span>
                </p>
                <input
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-primary"
                  value={tituloEd}
                  onChange={(e) => setTituloEd(e.target.value)}
                  placeholder="Título da seção"
                />
                <div className="text-[11px] text-zinc-400">
                  Conteúdo (uma linha por parágrafo; comece com "• " para bullet):
                </div>
                <textarea
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-primary font-mono leading-relaxed"
                  rows={8}
                  value={itensEd}
                  onChange={(e) => setItensEd(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={salvarEdicao} className="text-xs gap-1">
                    <Check className="size-3.5" /> Salvar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditandoIdx(null)}
                    className="text-xs border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700">
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                {clausulas.map((c, i) => (
                  <div key={i}
                    className="flex items-center justify-between gap-3 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 hover:border-zinc-600 transition-colors">
                    <span className="text-xs text-zinc-300 truncate">{c.titulo}</span>
                    <button type="button" onClick={() => abrirEdicao(i)}
                      className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80">
                      <Pencil className="size-3" /> Editar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Prévia do documento ─────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto bg-zinc-900/40 p-4 sm:p-8">
          <article
            className="mx-auto max-w-[760px] bg-white shadow-2xl rounded-sm border border-zinc-200"
            style={{ padding: "32px 44px", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "12px", lineHeight: "1.7", color: "#111" }}
          >
            {/* Cabeçalho */}
            <div style={{ textAlign: "center", borderBottom: "3px solid #111", paddingBottom: "12px", marginBottom: "16px" }}>
              {logoUrl ? (
                <img src={logoUrl} alt="Logo"
                  style={{ maxHeight: "64px", maxWidth: "200px", objectFit: "contain", display: "block", margin: "0 auto 6px" }} />
              ) : (
                <div style={{ fontSize: "22px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "3px", color: "#111", marginBottom: "2px" }}>
                  Prático Sistemas
                </div>
              )}
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "#666" }}>
                Contrato de Prestação de Serviços
              </div>
            </div>

            {/* Qualificação */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", border: "1px solid #ccc", borderRadius: "4px", padding: "12px 16px", marginBottom: "18px", background: "#fafafa" }}>
              <div>
                <div style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "#999", marginBottom: "3px" }}>Contratada</div>
                <div style={{ fontWeight: 700, fontSize: "13px" }}>PRÁTICO SISTEMAS</div>
                <div style={{ fontSize: "11px", color: "#444" }}>CNPJ: 12.712.069/0001-27</div>
              </div>
              <div>
                <div style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "#999", marginBottom: "3px" }}>Contratante</div>
                <div style={{ fontWeight: 700, fontSize: "13px" }}>{cliente.razao_social}</div>
                {cliente.nome_fantasia && <div style={{ fontSize: "11px", color: "#444" }}>Nome Fantasia: {cliente.nome_fantasia}</div>}
                <div style={{ fontSize: "11px", color: "#444" }}>CNPJ/CPF: {cliente.cnpj || "Não informado"}</div>
                {cliente.telefone && <div style={{ fontSize: "11px", color: "#444" }}>Tel: {cliente.telefone}</div>}
              </div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid #ccc", margin: "14px 0" }} />

            {/* Cláusulas com botão editar */}
            {clausulas.map((c, i) => (
              <div key={i} style={{ marginBottom: "16px", position: "relative" }}>
                {/* Botão editar inline na prévia */}
                <button
                  type="button"
                  onClick={() => { setPanelAberto(true); abrirEdicao(i); }}
                  title="Editar esta seção"
                  style={{
                    position: "absolute", top: 0, right: 0,
                    background: "none", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: "2px",
                    fontSize: "10px", color: "#2563eb", opacity: 0.45, padding: "2px 4px",
                  }}
                  className="hover:opacity-100 transition-opacity"
                >
                  <Pencil size={10} /> editar
                </button>

                {/* Título */}
                <div style={{ fontWeight: 700, fontSize: "12px", textTransform: "uppercase", borderBottom: "1px solid #ddd", paddingBottom: "3px", marginBottom: "6px", letterSpacing: "0.3px" }}>
                  {c.titulo}
                </div>

                {/* Itens */}
                {c.itens.map((item, j) =>
                  item.startsWith("• ") ? (
                    <div key={j} style={{ paddingLeft: "16px", marginBottom: "3px" }}>{item}</div>
                  ) : (
                    <p key={j} style={{ margin: "0 0 5px 0", textAlign: "justify" }}>{item}</p>
                  )
                )}
              </div>
            ))}

            <hr style={{ border: "none", borderTop: "1px solid #ccc", margin: "20px 0" }} />

            {/* Assinaturas */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", marginTop: "8px" }}>
              {[
                { nome: cliente.razao_social, sub: cliente.cnpj ? `CNPJ: ${cliente.cnpj}` : "", tipo: "Contratante" },
                { nome: "Prático Sistemas",   sub: "CNPJ: 12.712.069/0001-27",            tipo: "Contratada"  },
              ].map((p, i) => (
                <div key={i} style={{ textAlign: "center" }}>
                  {i === 0 && (
                    <div style={{ fontWeight: 600, marginBottom: "6px", fontSize: "12px" }}>
                      Data: _____ / _____ / _________
                    </div>
                  )}
                  {i === 1 && <div style={{ marginBottom: "6px", height: "20px" }} />}
                  <div style={{ borderTop: "1px solid #111", width: "85%", margin: "28px auto 5px" }} />
                  <div style={{ fontWeight: 700, fontSize: "11px", textTransform: "uppercase" }}>{p.nome}</div>
                  {p.sub && <div style={{ fontSize: "10px", color: "#666", fontFamily: "monospace" }}>{p.sub}</div>}
                  <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "#777", marginTop: "2px" }}>{p.tipo}</div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </DialogContent>
    </Dialog>
  );
}
