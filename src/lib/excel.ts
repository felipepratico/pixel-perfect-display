import * as XLSX from "xlsx";

import {
  computeRow,
  currentMesAno,
  parseNumber,
  type Situacao,
  type Titulo,
  type TituloInput,
} from "@/lib/fincontrol";

export type SheetRow = Record<string, unknown>;

export type Mapping = {
  cliente: string;
  cnpj: string;
  telefone: string;
  mensal_site: string;
  mensal_real: string;
  custo_boleto: string;
  francisco_pct: string;
  vencimento: string;
  situacao: string;
  mes_ano: string;
};

export const emptyMapping: Mapping = {
  cliente: "",
  cnpj: "",
  telefone: "",
  mensal_site: "",
  mensal_real: "",
  custo_boleto: "",
  francisco_pct: "",
  vencimento: "",
  situacao: "",
  mes_ano: "",
};

const HINTS: Record<keyof Mapping, string[]> = {
  cliente: ["cliente", "razao", "nome", "empresa"],
  cnpj: ["cnpj", "cpf", "documento"],
  telefone: ["telefone", "whats", "celular", "fone"],
  mensal_site: ["mensal site", "mensalsite", "valor site", "mensalidade site"],
  mensal_real: ["mensal real", "mensalreal", "valor real"],
  custo_boleto: ["custo boleto", "boleto", "taxa"],
  francisco_pct: ["francisco%", "francisco %", "% francisco", "percentual", "comissao"],
  vencimento: ["vencimento", "venc", "dia"],
  situacao: ["situacao", "situação", "status", "pagamento"],
  mes_ano: ["mes", "mês", "referencia", "referência", "competencia"],
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function readWorkbook(buffer: ArrayBuffer) {
  return XLSX.read(buffer, { type: "array" });
}

export function sheetToRows(workbook: XLSX.WorkBook, sheetName: string): SheetRow[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<SheetRow>(sheet, { defval: "" });
}

export function autoMap(headers: string[]): Mapping {
  const mapping: Mapping = { ...emptyMapping };
  const normalized = headers.map((header) => ({ header, key: normalize(header) }));
  (Object.keys(HINTS) as Array<keyof Mapping>).forEach((field) => {
    const hit = normalized.find((item) =>
      HINTS[field].some((hint) => item.key.includes(normalize(hint))),
    );
    if (hit) mapping[field] = hit.header;
  });
  // "% Francisco" must not be captured by the generic "dia"/"venc" hints.
  if (mapping.vencimento && mapping.vencimento === mapping.francisco_pct) mapping.vencimento = "";
  return mapping;
}

function pick(row: SheetRow, column: string): unknown {
  if (!column) return "";
  return row[column] ?? "";
}

/** Spreadsheets store percentages either as 10 or as 0.1 — normalize to 10. */
function normalizePercent(value: unknown): number {
  const num = parseNumber(value);
  return num > 0 && num <= 1 ? num * 100 : num;
}

export function rowsToTitulos(rows: SheetRow[], mapping: Mapping, mesAno: string): TituloInput[] {
  return rows
    .map((row) => {
      const cliente = String(pick(row, mapping.cliente) ?? "")
        .toUpperCase()
        .trim();
      if (!cliente) return null;
      const situacaoRaw = normalize(String(pick(row, mapping.situacao) ?? ""));
      const situacao: Situacao = situacaoRaw.includes("pago") ? "PAGO" : "ABERTO";
      const cnpjRaw = pick(row, mapping.cnpj);
      const cnpj = parseNumber(cnpjRaw) === 0 ? "" : String(cnpjRaw).trim();
      const vencimento = Math.min(31, Math.max(1, Math.round(parseNumber(pick(row, mapping.vencimento))) || 5));
      const mesAnoCell = String(pick(row, mapping.mes_ano) ?? "").trim();
      return {
        cliente,
        cnpj,
        telefone: String(pick(row, mapping.telefone) ?? "").replace(/\D/g, ""),
        mensal_site: parseNumber(pick(row, mapping.mensal_site)),
        mensal_real: parseNumber(pick(row, mapping.mensal_real)),
        custo_boleto: parseNumber(pick(row, mapping.custo_boleto)),
        francisco_pct: normalizePercent(pick(row, mapping.francisco_pct)),
        vencimento,
        mes_ano: mesAnoCell || mesAno || currentMesAno(),
        tipo_cobranca: "RECORRENTE" as const,
        status_assinatura: "ATIVO" as const,
        situacao,
      };
    })
    .filter((item): item is TituloInput => item !== null);
}

export function exportTitulos(titulos: Titulo[]) {
  const rows = titulos.map((titulo) => {
    const calc = computeRow(titulo);
    return {
      CLIENTE: titulo.cliente,
      CNPJ: titulo.cnpj,
      TELEFONE: titulo.telefone,
      "MENSAL SITE": calc.mensalSite,
      "MENSAL REAL": calc.mensalReal,
      "CUSTO BOLETO": calc.custoBoleto,
      "FRANCISCO%": calc.franciscoPct,
      "LUCRO FRANCISCO": Number(calc.lucroFrancisco.toFixed(2)),
      "CUSTO(BLT X FRANCISCO)": Number(calc.custoBltFra.toFixed(2)),
      "LUCRO FELIPE": Number(calc.lucroFelipe.toFixed(2)),
      VENCIMENTO: titulo.vencimento,
      "MES/ANO": titulo.mes_ano,
      "TIPO COBRANCA": titulo.tipo_cobranca,
      "STATUS ASSINATURA": titulo.status_assinatura,
      SITUACAO: titulo.situacao,
    };
  });
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Contas a Receber");
  XLSX.writeFile(workbook, `contas-a-receber-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
