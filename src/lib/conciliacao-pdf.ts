import { parseNumber, type ClienteRef, type Titulo } from "@/lib/fincontrol";

export async function extrairTextoPdf(file: File): Promise<string> {
  const pdfjsLib: any = await import("pdfjs-dist");
  const workerMod: any = await import("pdfjs-dist/build/pdf.worker.mjs?url");
  const workerSrc = workerMod?.default ?? workerMod;
  if (pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
  }
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = (content.items || []).map((it: any) => it.str || "");
    text += strings.join(" ") + "\n";
  }
  return text;
}

export type PdfCobrancaEfi = {
  numero_cobranca: string;
  valor_original: number;
  status: string;
  nome_cliente: string;
  documento: string;
  documento_digits: string;
  data_vencimento: string;
  valor_pago: number;
  data_pagamento: string;
  identificador_assinatura: string | null;
};

export type PdfMatch = {
  cobranca: PdfCobrancaEfi;
  titulo: Titulo | null;
  status: "conciliado" | "ja_pago" | "nao_encontrado" | "ignorado";
};

export function isStatusPago(status: string): boolean {
  const s = (status || "").toLowerCase();
  return s.includes("pago") || s.includes("marcado como pago");
}

export function somenteDigitos(valor: string | null | undefined): string {
  return String(valor || "").replace(/\D/g, "");
}

function parseDataBr(dataStr: string): { dia: number; mes: number; ano: number; mesAno: string } {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(dataStr || "").trim());
  const dia = m ? parseInt(m[1] || "0", 10) : 0;
  const mes = m ? parseInt(m[2] || "0", 10) : 0;
  const ano = m ? parseInt(m[3] || "0", 10) : 0;
  const mesAno = mes && ano ? `${String(mes).padStart(2, "0")}/${ano}` : "";
  return { dia, mes, ano, mesAno };
}

function parseValorMonetario(valor: string | null | undefined): number {
  if (!valor) return 0;
  const limpo = String(valor).trim().replace(/[^\d.,]/g, "");
  // formato brasileiro
  const normalizado = limpo.includes(",")
    ? limpo.replace(/\./g, "").replace(",", ".")
    : limpo;
  const num = parseFloat(normalizado);
  return isNaN(num) ? 0 : num;
}

export function parseCobrancasPdf(texto: string): PdfCobrancaEfi[] {
  const normalized = String(texto || "").replace(/\r/g, "\n");
  const markerRegex = /N[°º]\s*Cob\.?\s*:/gi;
  const positions: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = markerRegex.exec(normalized)) !== null) positions.push(m.index);
  if (positions.length === 0) return [];
  positions.push(normalized.length);

  const cobrancas: PdfCobrancaEfi[] = [];

  for (let i = 0; i < positions.length - 1; i++) {
    const bloco = normalized.slice(positions[i], positions[i + 1]);

    const numMatch = bloco.match(/N[°º]\s*Cob\.?\s*:\s*(\S+)/i);
    const valorOrigMatch = bloco.match(/Valor:\s*\(R\$\)\s*(?:R\$\s*)?([\d.,]+)/i);
    const statusMatch = bloco.match(/Status:\s*(.+?)(?:\n|$)/i);
    const nomeMatch = bloco.match(/Nome:\s*(.+?)(?:\n|$)/i);
    const docMatch = bloco.match(/Documento\s*:?\s*(.+?)(?:\n|$)/i);
    const vencMatch = bloco.match(/Data de Vencimento:\s*(\d{2}\/\d{2}\/\d{4})/i);
    const valorPagoMatch = bloco.match(/Valor Pago:\s*(?:R\$\s*)?([\d.,]+)/i);
    const pagoEmMatch = bloco.match(/Pago Em:\s*(\d{2}\/\d{2}\/\d{4})/i);
    const identMatch = bloco.match(/Identificador da Assinatura:\s*(.+?)(?:\n|$)/i);

    const numero_cobranca = numMatch && numMatch[1] ? numMatch[1].trim() : "";
    if (!numero_cobranca) continue;

    const documento = docMatch && docMatch[1] ? docMatch[1].trim() : "";
    const identRaw = identMatch && identMatch[1] ? identMatch[1].trim() : "";
    const identificador_assinatura =
      identRaw && identRaw !== "-" ? identRaw : null;

    cobrancas.push({
      numero_cobranca,
      valor_original: parseValorMonetario(valorOrigMatch && valorOrigMatch[1] ? valorOrigMatch[1] : ""),
      status: statusMatch && statusMatch[1] ? statusMatch[1].trim() : "",
      nome_cliente: nomeMatch && nomeMatch[1] ? nomeMatch[1].trim() : "",
      documento,
      documento_digits: somenteDigitos(documento),
      data_vencimento: vencMatch && vencMatch[1] ? vencMatch[1].trim() : "",
      valor_pago: parseValorMonetario(valorPagoMatch && valorPagoMatch[1] ? valorPagoMatch[1] : ""),
      data_pagamento: pagoEmMatch && pagoEmMatch[1] ? pagoEmMatch[1].trim() : "",
      identificador_assinatura,
    });
  }

  return cobrancas;
}

export function conciliarCobrancasPdf({
  cobrancas,
  titulosAbertos,
  clientesCadastrados = [],
}: {
  cobrancas: PdfCobrancaEfi[];
  titulosAbertos: Titulo[];
  clientesCadastrados?: ClienteRef[];
}): PdfMatch[] {
  const titulosUsados = new Set<string>();

  return cobrancas.map((cob) => {
    if (!isStatusPago(cob.status)) {
      return { cobranca: cob, titulo: null, status: "ignorado" };
    }

    const { dia: vencDia, mesAno: vencMesAno } = parseDataBr(cob.data_vencimento);

    let candidatos = titulosAbertos.filter((t) => {
      if (titulosUsados.has(t.id)) return false;
      // vencimento
      if (vencDia && t.vencimento !== vencDia) return false;
      if (vencMesAno && t.mes_ano !== vencMesAno) return false;
      // documento
      if (cob.documento_digits) {
        const tDoc = somenteDigitos(t.cnpj);
        if (tDoc && tDoc !== cob.documento_digits) return false;
        // se título sem cnpj, tenta por cliente cadastrado
        if (!tDoc && t.cliente_id) {
          const cliente = clientesCadastrados.find((c) => c.id === t.cliente_id);
          if (cliente && somenteDigitos(cliente.cnpj) !== cob.documento_digits) return false;
        }
      }
      return true;
    });

    // desempate por valor original
    if (candidatos.length > 1) {
      candidatos = [...candidatos].sort((a, b) => {
        const diffA = Math.abs(parseNumber(a.mensal_site) - cob.valor_original);
        const diffB = Math.abs(parseNumber(b.mensal_site) - cob.valor_original);
        return diffA - diffB;
      });
    }

    const titulo = candidatos[0] ?? null;

    if (!titulo) {
      return { cobranca: cob, titulo: null, status: "nao_encontrado" };
    }

    if (titulo.situacao === "PAGO") {
      return { cobranca: cob, titulo, status: "ja_pago" };
    }

    titulosUsados.add(titulo.id);
    return { cobranca: cob, titulo, status: "conciliado" };
  });
}

export function dataBrParaIso(dataBr: string): string {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(dataBr || "").trim());
  if (!m) return new Date().toISOString();
  const dia = (m[1] || "1").padStart(2, "0");
  const mes = (m[2] || "1").padStart(2, "0");
  const ano = m[3] || "2000";
  return `${ano}-${mes}-${dia}T12:00:00.000Z`;
}
