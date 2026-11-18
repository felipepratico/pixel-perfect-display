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
  status:
    | "conciliado"
    | "corrigir"
    | "ja_conciliado"
    | "novo_retroativo"
    | "nao_encontrado"
    | "ignorado";
  cliente: any | null;
  divergencia?: string;
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

function normalizarNome(str: string): string {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseCobrancasPdf(texto: string): PdfCobrancaEfi[] {
  const normalized = String(texto || "").replace(/\r/g, " ");
  const markerRegex = /N[°º]\s*Cob\.?\s*:/gi;
  const positions: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = markerRegex.exec(normalized)) !== null) positions.push(m.index);
  if (positions.length === 0) return [];
  positions.push(normalized.length);

  const cobrancas: PdfCobrancaEfi[] = [];

  for (let i = 0; i < positions.length - 1; i++) {
    const bloco = normalized.slice(positions[i], positions[i + 1]);

    const numMatch = bloco.match(/N[°º]\s*Cob\.?\s*:\s*(\d+)/i);
    const statusMatch = bloco.match(/Status:\s*(.+?)(?=Nome:|Telefone:|Documento|Data de Vencimento|Valor:|Pago Em:|Identificador|$)/i);
    const nomeMatch = bloco.match(/Nome:\s*(.+?)(?=Telefone:|Documento|Data de Vencimento|Valor:|Pago Em:|Identificador|$)/i);
    const docMatch = bloco.match(/Documento\s*:?\s*([0-9.\-\/]+)/i);
    const vencMatch = bloco.match(/Data de Vencimento:\s*(\d{2}\/\d{2}\/\d{4})/i);
    const valorOrigMatch = bloco.match(/Valor:\s*\(R\$\)\s*(?:R\$\s*)?([\d.,]+)/i);
    const valorPagoMatch = bloco.match(/Valor Pago:\s*(?:R\$\s*)?([\d.,]+)/i);
    const pagoEmMatch = bloco.match(/Pago Em:\s*(\d{2}\/\d{2}\/\d{4})/i);
    const identMatch = bloco.match(/Identificador da Assinatura:\s*(.+?)(?=N[°º]\s*Cob|Status:|Nome:|Telefone:|Documento|$)/i);

    const numero_cobranca = numMatch && numMatch[1] ? numMatch[1].trim() : "";
    if (!numero_cobranca) continue;

    const statusRaw = statusMatch && statusMatch[1] ? statusMatch[1].trim() : "";
    const nomeRaw = nomeMatch && nomeMatch[1] ? nomeMatch[1].trim() : "";
    const docRaw = docMatch && docMatch[1] ? docMatch[1].trim() : "";
    const docDigits = somenteDigitos(docRaw);
    const identRaw = identMatch && identMatch[1] ? identMatch[1].trim() : "";

    cobrancas.push({
      numero_cobranca,
      valor_original: parseValorMonetario(valorOrigMatch && valorOrigMatch[1] ? valorOrigMatch[1] : ""),
      status: statusRaw,
      nome_cliente: normalizarNome(nomeRaw) ? nomeRaw.trim() : nomeRaw.trim(),
      documento: docRaw,
      documento_digits: docDigits,
      data_vencimento: vencMatch && vencMatch[1] ? vencMatch[1].trim() : "",
      valor_pago: parseValorMonetario(valorPagoMatch && valorPagoMatch[1] ? valorPagoMatch[1] : ""),
      data_pagamento: pagoEmMatch && pagoEmMatch[1] ? pagoEmMatch[1].trim() : "",
      identificador_assinatura: identRaw && identRaw !== "-" ? identRaw : null,
    });
  }

  return cobrancas;
}

export function conciliarCobrancasPdf({
  cobrancas,
  titulos,
  clientesCadastrados = [],
}: {
  cobrancas: PdfCobrancaEfi[];
  titulos: Titulo[];
  clientesCadastrados?: ClienteRef[];
}): PdfMatch[] {
  const titulosUsados = new Set<string>();

  return cobrancas.map((cob) => {
    if (!isStatusPago(cob.status)) {
      return { cobranca: cob, titulo: null, status: "ignorado", cliente: null };
    }

    const { mesAno: vencMesAno } = parseDataBr(cob.data_vencimento);
    const cobNomeNorm = normalizarNome(cob.nome_cliente);

    let clienteEncontrado: any = null;
    if (cob.documento_digits) {
      clienteEncontrado = clientesCadastrados.find(
        (c: any) => somenteDigitos(c.cnpj) === cob.documento_digits,
      );
    }
    if (!clienteEncontrado && cobNomeNorm) {
      clienteEncontrado = clientesCadastrados.find(
        (c: any) => normalizarNome(c.razao_social) === cobNomeNorm,
      );
    }

    let candidatos = titulos.filter((t) => {
      if (titulosUsados.has(t.id)) return false;
      if (vencMesAno && t.mes_ano !== vencMesAno) return false;
      if (cob.documento_digits) {
        const tDoc = somenteDigitos(t.cnpj);
        let docOk = false;
        if (tDoc && tDoc === cob.documento_digits) docOk = true;
        if (!tDoc && t.cliente_id) {
          const cliente = clientesCadastrados.find((c: any) => c.id === t.cliente_id);
          if (cliente && somenteDigitos(cliente.cnpj) === cob.documento_digits) docOk = true;
        }
        if (!docOk) return false;
      } else if (cobNomeNorm) {
        const tNomeNorm = normalizarNome(t.cliente);
        if (tNomeNorm !== cobNomeNorm) {
          if (t.cliente_id) {
            const cliente = clientesCadastrados.find((c: any) => c.id === t.cliente_id);
            if (!cliente || normalizarNome(cliente.razao_social) !== cobNomeNorm) return false;
          } else {
            return false;
          }
        }
      }
      if (Math.abs(parseNumber(t.mensal_site) - cob.valor_original) >= 0.05) return false;
      return true;
    });

    if (candidatos.length === 0 && cobNomeNorm) {
      candidatos = titulos.filter((t) => {
        if (titulosUsados.has(t.id)) return false;
        if (vencMesAno && t.mes_ano !== vencMesAno) return false;
        if (Math.abs(parseNumber(t.mensal_site) - cob.valor_original) >= 0.05) return false;
        const tNomeNorm = normalizarNome(t.cliente);
        if (tNomeNorm === cobNomeNorm) return true;
        if (t.cliente_id) {
          const cliente = clientesCadastrados.find((c: any) => c.id === t.cliente_id);
          if (cliente && normalizarNome(cliente.razao_social) === cobNomeNorm) return true;
        }
        return false;
      });
    }

    if (candidatos.length > 1) {
      candidatos = [...candidatos].sort((a, b) => {
        const diffA = Math.abs(parseNumber(a.mensal_site) - cob.valor_original);
        const diffB = Math.abs(parseNumber(b.mensal_site) - cob.valor_original);
        return diffA - diffB;
      });
    }

    const titulo = candidatos[0] ?? null;

    if (!titulo) {
      if (clienteEncontrado) {
        return { cobranca: cob, titulo: null, status: "novo_retroativo", cliente: clienteEncontrado };
      }
      return { cobranca: cob, titulo: null, status: "nao_encontrado", cliente: null };
    }

    if (titulo.situacao === "PAGO") {
      const sameDate =
        titulo.pago_em &&
        new Date(titulo.pago_em).toISOString().slice(0, 10) ===
          dataBrParaIso(cob.data_pagamento).slice(0, 10);
      const sameValor =
        titulo.valor_total != null &&
        Math.abs(Number(titulo.valor_total) - cob.valor_pago) < 0.01;
      if (sameDate && sameValor) {
        return { cobranca: cob, titulo, status: "ja_conciliado", cliente: clienteEncontrado };
      }
      const divergencia = `Sistema: data ${titulo.pago_em ? new Date(titulo.pago_em).toLocaleDateString("pt-BR") : "—"}, valor pago ${titulo.valor_total ?? "—"} | PDF: data ${cob.data_pagamento}, valor pago ${cob.valor_pago}`;
      return { cobranca: cob, titulo, status: "corrigir", cliente: clienteEncontrado, divergencia };
    }

    titulosUsados.add(titulo.id);
    return { cobranca: cob, titulo, status: "conciliado", cliente: clienteEncontrado };
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
