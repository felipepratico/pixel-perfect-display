export type Situacao = "ABERTO" | "PAGO";
export type TipoCobranca = "RECORRENTE" | "AVULSO";
export type StatusAssinatura = "ATIVO" | "CANCELADO";

export type Titulo = {
  id: string;
  cliente_id: string | null;
  cliente: string;
  cnpj: string;
  telefone: string;
  mensal_site: number;
  mensal_real: number;
  custo_boleto: number;
  francisco_pct: number;
  vencimento: number;
  mes_ano: string;
  tipo_cobranca: TipoCobranca;
  status_assinatura: StatusAssinatura;
  situacao: Situacao;
  deleted_at: string | null;
  efi_status: string;
  efi_link_pagamento: string;
  efi_linha_digitavel: string;
};

export type TituloInput = Omit<Titulo, "id" | "deleted_at" | "efi_status" | "efi_link_pagamento" | "efi_linha_digitavel">;

/** Accepts "R$ 1.234,56", "1234.56", 1234.56, "10%" and returns a number. */
export function parseNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isNaN(value) ? 0 : value;
  let str = String(value).trim();
  str = str
    .replace(/R\$\s?/gi, "")
    .replace(/[\s\u00A0]/g, "")
    .replace(/%/g, "");
  if (str.includes(",") && str.includes(".")) {
    str = str.replace(/\./g, "").replace(",", ".");
  } else if (str.includes(",")) {
    str = str.replace(",", ".");
  }
  const num = Number.parseFloat(str);
  return Number.isNaN(num) ? 0 : num;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

export type RowValues = {
  mensalSite: number;
  mensalReal: number;
  custoBoleto: number;
  franciscoPct: number;
  lucroFrancisco: number;
  custoBltFra: number;
  lucroFelipe: number;
};

/** Core spreadsheet math, identical to the original workbook. */
export function computeRow(item: {
  mensal_site: number | string;
  mensal_real?: number | string;
  custo_boleto?: number | string;
  francisco_pct?: number | string;
}): RowValues {
  const mensalSite = parseNumber(item.mensal_site);
  const mensalReal = parseNumber(item.mensal_real);
  const custoBoleto = parseNumber(item.custo_boleto);
  const franciscoPct = parseNumber(item.francisco_pct);
  const lucroFrancisco = mensalSite * (franciscoPct / 100);
  const custoBltFra = custoBoleto + lucroFrancisco;
  return {
    mensalSite,
    mensalReal,
    custoBoleto,
    franciscoPct,
    lucroFrancisco,
    custoBltFra,
    lucroFelipe: mensalSite - custoBltFra,
  };
}

export function currentMesAno(date = new Date()): string {
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

export function nextMesAno(date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return currentMesAno(d);
}

/** "11/2026" + 3 => "02/2027" */
export function shiftMesAno(mesAno: string, offset: number): string | null {
  const [mRaw, yRaw] = mesAno.split("/");
  const m = Number.parseInt(mRaw ?? "", 10);
  const y = Number.parseInt(yRaw ?? "", 10);
  if (!m || !y || m < 1 || m > 12) return null;
  const total = m - 1 + offset;
  const month = ((total % 12) + 12) % 12;
  const year = y + Math.floor(total / 12);
  return `${String(month + 1).padStart(2, "0")}/${year}`;
}

export function isActiveSubscription(t: Titulo): boolean {
  return t.tipo_cobranca === "RECORRENTE" && t.status_assinatura === "ATIVO";
}

export function normalizePhone(phone: string): string {
  return (phone || "").replace(/\D/g, "");
}

export function whatsappMessage(t: Titulo): string {
  const { mensalSite } = computeRow(t);
  return (
    `Olá, *${t.cliente}*! tudo bem?\n\n` +
    `Passando para lembrar referente à mensalidade/assinatura do site:\n` +
    `📌 *Valor:* ${formatCurrency(mensalSite)}\n` +
    `📅 *Vencimento:* Dia ${t.vencimento} (${t.mes_ano || "mês atual"})\n` +
    `Status: *${t.situacao}*\n` +
    (t.efi_link_pagamento ? `🔗 *Boleto/Pix:* ${t.efi_link_pagamento}\n` : "") +
    (t.efi_linha_digitavel ? `🔢 *Linha digitável:* ${t.efi_linha_digitavel}\n` : "") +
    `\n` +
    `Qualquer dúvida estamos à disposição! Obrigado.`
  );
}

export function getVencimentoDate(t: Pick<Titulo, "vencimento" | "mes_ano">): Date | null {
  if (!t.mes_ano) return null;
  const [mStr, yStr] = t.mes_ano.split("/");
  const month = Number.parseInt(mStr ?? "", 10);
  const year = Number.parseInt(yStr ?? "", 10);
  if (!month || !year || month < 1 || month > 12) return null;
  const day = Math.min(Math.max(Number(t.vencimento) || 1, 1), 31);
  return new Date(year, month - 1, day, 23, 59, 59, 999);
}

export function isTituloVencido(t: Pick<Titulo, "situacao" | "vencimento" | "mes_ano">): boolean {
  if (t.situacao === "PAGO") return false;
  const dueDate = getVencimentoDate(t);
  if (!dueDate) return false;
  return Date.now() > dueDate.getTime();
}

export function getDiasVencido(t: Pick<Titulo, "situacao" | "vencimento" | "mes_ano">): number {
  const dueDate = getVencimentoDate(t);
  if (!dueDate) return 0;
  const diffMs = Date.now() - dueDate.getTime();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export const emptyTitulo = (): TituloInput => ({
  cliente_id: null,
  cliente: "",
  cnpj: "",
  telefone: "",
  mensal_site: 0,
  mensal_real: 0,
  custo_boleto: 3.45,
  francisco_pct: 10,
  vencimento: 5,
  mes_ano: currentMesAno(),
  tipo_cobranca: "RECORRENTE",
  status_assinatura: "ATIVO",
  situacao: "ABERTO",
});
