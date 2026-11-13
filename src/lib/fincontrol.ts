export type Situacao = "ABERTO" | "PAGO";
export type TipoCobranca = "RECORRENTE" | "AVULSO";
export type StatusAssinatura = "ATIVO" | "CANCELADO";

export type Titulo = {
  id: string;
  cliente_id: string | null;
  cliente: string;
  cnpj: string;
  telefone: string;
  nome_contato: string | null;
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
  pago_em: string | null;
  forma_pagamento: string | null;
  dias_atraso: number | null;
  efi_status: string;
  efi_link_pagamento: string;
  efi_linha_digitavel: string;
  valor_nominal?: number | null;
  valor_juros?: number | null;
  valor_multa?: number | null;
  valor_total?: number | null;
  percentual_francisco_aplicado?: number | null;
  valor_repasse_francisco?: number | null;
  lucro_liquido_felipe?: number | null;
};

export type TituloInput = Omit<
  Titulo,
  "id" | "deleted_at" | "efi_status" | "efi_link_pagamento" | "efi_linha_digitavel"
>;

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
  /** Valor do título já com juros e multa (valor_total quando já foi calculado). */
  valorTotal: number;
};

/** Core spreadsheet math, identical to the original workbook. */
export function computeRow(item: {
  mensal_site: number | string;
  mensal_real?: number | string;
  custo_boleto?: number | string;
  francisco_pct?: number | string;
  valor_juros?: number | string | null;
  valor_multa?: number | string | null;
  valor_total?: number | string | null;
}): RowValues {
  const mensalSite = parseNumber(item.mensal_site);
  const mensalReal = parseNumber(item.mensal_real);
  const custoBoleto = parseNumber(item.custo_boleto);
  const franciscoPct = parseNumber(item.francisco_pct);
  const valorJuros = parseNumber(item.valor_juros);
  const valorMulta = parseNumber(item.valor_multa);
  const lucroFrancisco = mensalSite * (franciscoPct / 100);
  const custoBltFra = custoBoleto + lucroFrancisco;
  // Usa o valor_total já calculado (reajuste) quando disponível; caso contrário,
  // compõe a partir do nominal + encargos armazenados.
  const valorTotal =
    item.valor_total == null
      ? mensalSite + valorJuros + valorMulta
      : parseNumber(item.valor_total);
  return {
    mensalSite,
    mensalReal,
    custoBoleto,
    franciscoPct,
    lucroFrancisco,
    custoBltFra,
    lucroFelipe: mensalSite - custoBltFra,
    valorTotal,
  };
}

export function currentMesAno(date = new Date()): string {
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

export function nextMesAno(date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return currentMesAno(d);
}

/** Accepts "M/AAAA" or "MM/AAAA" (extra spaces allowed) and returns "MM/AAAA", or null when invalid. */
export function normalizeMesAno(value: string): string | null {
  const match = /^\s*(\d{1,2})\s*\/\s*(\d{4})\s*$/.exec(value ?? "");
  if (!match) return null;
  const mes = Number(match[1]);
  const ano = Number(match[2]);
  if (!mes || mes < 1 || mes > 12 || !ano) return null;
  return `${String(mes).padStart(2, "0")}/${ano}`;
}

/** Chronological rank of "MM/AAAA" (e.g. 11/2026 => 24323), for comparing months. Null when invalid. */
export function mesAnoRank(mesAno: string): number | null {
  const normalized = normalizeMesAno(mesAno);
  if (!normalized) return null;
  const [m, y] = normalized.split("/");
  return Number(y) * 12 + Number(m);
}

/** "11/2026" + 3 => "02/2027" */
export function shiftMesAno(mesAno: string, offset: number): string | null {
  const normalized = normalizeMesAno(mesAno);
  if (!normalized) return null;
  const [mRaw, yRaw] = normalized.split("/");
  const m = Number.parseInt(mRaw ?? "", 10);
  const y = Number.parseInt(yRaw ?? "", 10);
  const total = m - 1 + offset;
  const month = ((total % 12) + 12) % 12;
  const year = y + Math.floor(total / 12);
  return `${String(month + 1).padStart(2, "0")}/${year}`;
}

export function isActiveSubscription(t: Titulo): boolean {
  return t.tipo_cobranca === "RECORRENTE" && t.status_assinatura === "ATIVO";
}

/** Minimal customer reference used to link titles to customer records. */
export type ClienteRef = { id: string; cnpj: string; razao_social: string };

/** Nome normalizado para comparação: sem espaços extras, em maiúsculas. */
function normalizarNome(valor: string | null | undefined): string {
  return (valor ?? "").trim().replace(/\s+/g, " ").toUpperCase();
}

/** Chave sintética por nome normalizado (fallback sem id vinculado). */
function chavePorNome(nome: string | null | undefined): string {
  return `nome:${normalizarNome(nome)}`;
}

/** Apenas dígitos (para comparar CNPJ com/sem máscara). */
function apenasDigitos(valor: string | null | undefined): string {
  return (valor ?? "").replace(/\D/g, "");
}

/** Resolves the customer record of a title by cliente_id, CNPJ or razão social. */
export function clienteIdDoTitulo(
  t: Pick<Titulo, "cliente_id" | "cliente" | "cnpj">,
  clientes: ClienteRef[] = [],
): string | null {
  if (t.cliente_id) return t.cliente_id;
  const cnpj = apenasDigitos(t.cnpj);
  const nome = normalizarNome(t.cliente);
  if (!cnpj && !nome) return null;
  const match = clientes.find(
    (c) =>
      (cnpj !== "" && apenasDigitos(c.cnpj) === cnpj) ||
      (nome !== "" && normalizarNome(c.razao_social) === nome),
  );
  return match?.id ?? null;
}

/** Stable key per customer: linked customer id when known, otherwise the normalized name. */
export function chaveClienteDoTitulo(
  t: Pick<Titulo, "cliente_id" | "cliente" | "cnpj">,
  clientes: ClienteRef[] = [],
): string {
  return clienteIdDoTitulo(t, clientes) ?? chavePorNome(t.cliente);
}

/** Chave estável de um cliente (cadastro) para uso em mapas de assinatura. */
export function chaveDoCliente(cliente: Pick<ClienteRef, "id" | "cnpj" | "razao_social">): string {
  // id é sempre string quando vindo do cadastro; fallback sintético garante
  // estabilidade quando um registro vier sem id.
  const id = (cliente.id ?? "").trim();
  return id || chavePorNome(cliente.razao_social);
}

/** Converte um cadastro de cliente em título recorrente (sem perder vínculo). */
export function tituloDeClienteAtivo(
  cliente: Pick<
    ClienteRef & {
      telefone: string;
      nome_contato: string | null;
      vencimento: number;
      status: "ATIVO" | "INATIVO";
      valor_base: number;
    },
    "id" | "cnpj" | "razao_social" | "telefone" | "nome_contato" | "vencimento" | "status" | "valor_base"
  >,
  mensalidade?: number | string,
  mesAnoRef: string = currentMesAno(),
): TituloInput {
  // Mensalidade: usa o valor do contrato como padrão; o chamador pode
  // sobrescrever com o valor mais recente do título recorrente.
  // Aceita "R$ 1.234,56" via parseNumber (mesma regra de computeRow).
  const mensal =
    mensalidade !== undefined && mensalidade !== null && mensalidade !== ""
      ? parseNumber(mensalidade)
      : parseNumber(cliente.valor_base ?? 0);
  // Mes/ano: normaliza ou usa o atual quando inválido.
  const mes_ano = normalizeMesAno(mesAnoRef) ?? currentMesAno();
  // Vencimento: inteiro dentro de 1..31 (padrão 5).
  const vencimentoRaw = Number.parseInt(String(cliente.vencimento ?? 5), 10);
  const vencimento = Number.isNaN(vencimentoRaw) ? 5 : Math.min(31, Math.max(1, vencimentoRaw));
  return {
    cliente_id: (cliente.id ?? "").trim() || null,
    cliente: cliente.razao_social ?? "",
    cnpj: cliente.cnpj ?? "",
    telefone: normalizePhone(cliente.telefone ?? ""),
    nome_contato: cliente.nome_contato ?? null,
    mensal_site: mensal,
    mensal_real: mensal,
    custo_boleto: 0,
    francisco_pct: 0,
    vencimento,
    mes_ano,
    tipo_cobranca: "RECORRENTE",
    status_assinatura: cliente.status === "ATIVO" ? "ATIVO" : "CANCELADO",
    situacao: "ABERTO",
    pago_em: null,
    forma_pagamento: null,
    dias_atraso: null,
  };
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

// (ResumoFinanceiro / gerarResumoFinanceiro estão definidos abaixo de calcularLtv.)

/** Título em aberto com vencimento hoje ou em data futura (dia ainda não ultrapassado). */
export function isTituloAVencer(t: Pick<Titulo, "situacao" | "vencimento" | "mes_ano">): boolean {
  if (t.situacao === "PAGO") return false;
  const dueDate = getVencimentoDate(t);
  if (!dueDate) return false;
  return Date.now() <= dueDate.getTime();
}

export function getDiasVencido(t: Pick<Titulo, "situacao" | "vencimento" | "mes_ano">): number {
  const dueDate = getVencimentoDate(t);
  if (!dueDate) return 0;
  const diffMs = Date.now() - dueDate.getTime();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export type HistoricoPagamento = {
  /** Média de dias de atraso por cliente (títulos pagos após o vencimento). */
  diasAtrasoMedios: Map<string, number>;
  /** Taxa histórica de sucesso (pagos / total de parcelas). */
  taxaSucesso: Map<string, number>;
  /** Receita acumulada por cliente (só pagamentos concluídos). */
  receitaAcumulada: Map<string, number>;
};

/**
 * Histórico por cliente para previsão de fluxo de caixa e LTV.
 * Sem coluna de data de pagamento, usa a própria situação e o vencimento
 * como aproximação de hábito de atraso.
 */
export function calcularHistoricoPagamentos(
  todos: Titulo[],
  clientes: { id: string; cnpj: string; razao_social: string }[] = [],
): HistoricoPagamento {
  const atrasos = new Map<string, number[]>();
  const taxa = new Map<string, { pagos: number; total: number }>();
  const receitaAcumulada = new Map<string, number>();

  for (const titulo of todos) {
    const chave = chaveClienteDoTitulo(titulo, clientes);
    const registro = taxa.get(chave) ?? { pagos: 0, total: 0 };
    registro.total += 1;
    if (titulo.situacao === "PAGO") {
      registro.pagos += 1;
      const valor = computeRow(titulo).mensalSite;
      receitaAcumulada.set(chave, (receitaAcumulada.get(chave) ?? 0) + valor);
    }
    taxa.set(chave, registro);

    // Atraso histórico: só títulos que ficaram vencidos e foram pagos depois.
    // Como o schema não guarda `pago_em`, aproximamos pelo atraso atual
    // dos vencidos em aberto.
    if (isTituloVencido(titulo)) {
      const dias = getDiasVencido(titulo);
      const lista = atrasos.get(chave) ?? [];
      lista.push(dias);
      atrasos.set(chave, lista);
    }
  }

  const diasAtrasoMedios = new Map<string, number>();
  for (const [chave, lista] of atrasos) {
    diasAtrasoMedios.set(
      chave,
      lista.length > 0 ? lista.reduce((acc, v) => acc + v, 0) / lista.length : 0,
    );
  }

  const taxaSucesso = new Map<string, number>();
  for (const [chave, { pagos, total }] of taxa) {
    taxaSucesso.set(chave, total > 0 ? pagos / total : 0);
  }

  return { diasAtrasoMedios, taxaSucesso, receitaAcumulada };
}

export type LtvCliente = {
  cliente: string;
  totalReceita: number;
  parcelasPagas: number;
  valorMedioPorParcela: number;
  ltv: number;
};

export function calcularLtv(todos: Titulo[]): LtvCliente[] {
  const porCliente = new Map<string, Titulo[]>();
  for (const titulo of todos) {
    const lista = porCliente.get(titulo.cliente) ?? [];
    lista.push(titulo);
    porCliente.set(titulo.cliente, lista);
  }

  const resultado: LtvCliente[] = [];
  for (const [cliente, titulos] of porCliente) {
    const pagos = titulos.filter((t) => t.situacao === "PAGO");
    if (pagos.length === 0) continue;
    const totalReceita = pagos.reduce((acc, t) => acc + computeRow(t).mensalSite, 0);
    resultado.push({
      cliente,
      totalReceita,
      parcelasPagas: pagos.length,
      valorMedioPorParcela: totalReceita / pagos.length,
      ltv: totalReceita,
    });
  }
  return resultado.sort((a, b) => b.ltv - a.ltv);
}

export type ResumoFinanceiro = {
  mensalSite: number;
  lucroFelipe: number;
  lucroFrancisco: number;
  custoBoleto: number;
  custoBltFra: number;
  pagos: number;
  abertos: number;
  vencidos: number;
  taxaInadimplencia: number;
  arpu: number;
  churnRate: number;
  ltvMedio: number;
  mrr: number;
  assinaturasAtivas: number;
};

export function gerarResumoFinanceiro(titulos: Titulo[], todos: Titulo[]): ResumoFinanceiro {
  const calc = (lista: Titulo[]) => {
    let mensalSite = 0;
    let lucroFelipe = 0;
    let lucroFrancisco = 0;
    let custoBoleto = 0;
    let custoBltFra = 0;
    for (const t of lista) {
      const row = computeRow(t);
      mensalSite += row.mensalSite;
      lucroFelipe += row.lucroFelipe;
      lucroFrancisco += row.lucroFrancisco;
      custoBoleto += row.custoBoleto;
      custoBltFra += row.custoBltFra;
    }
    return { mensalSite, lucroFelipe, lucroFrancisco, custoBoleto, custoBltFra };
  };

  const t = calc(titulos);
  const pagos = titulos.filter((x) => x.situacao === "PAGO").length;
  const abertos = titulos.filter((x) => x.situacao === "ABERTO").length;
  const vencidos = titulos.filter((x) => isTituloVencido(x)).length;
  const taxaInadimplencia = titulos.length > 0 ? (vencidos / titulos.length) * 100 : 0;

  const porCliente = new Map<string, number>();
  for (const titulo of todos) {
    if (!isActiveSubscription(titulo)) continue;
    porCliente.set(titulo.cliente, computeRow(titulo).mensalSite);
  }
  const mrr = [...porCliente.values()].reduce((acc, v) => acc + v, 0);
  const assinaturasAtivas = porCliente.size;
  const arpu = assinaturasAtivas > 0 ? mrr / assinaturasAtivas : 0;

  const canceladas = new Set<string>();
  for (const titulo of todos) {
    if (titulo.tipo_cobranca !== "RECORRENTE") continue;
    const chave = titulo.cliente_id ?? titulo.cliente;
    if (!isActiveSubscription(titulo)) canceladas.add(chave);
  }
  const canceladasUnicas = [...canceladas].filter((c) => !porCliente.has(c)).length;
  const totalAssinaturas = assinaturasAtivas + canceladasUnicas;
  const churnRate = totalAssinaturas > 0 ? (canceladasUnicas / totalAssinaturas) * 100 : 0;

  const ltv = calcularLtv(todos);
  const ltvMedio = ltv.length > 0 ? ltv.reduce((acc, x) => acc + x.ltv, 0) / ltv.length : 0;

  return {
    ...t,
    pagos,
    abertos,
    vencidos,
    taxaInadimplencia,
    arpu,
    churnRate,
    ltvMedio,
    mrr,
    assinaturasAtivas,
  };
}

export const emptyTitulo = (): TituloInput => ({
  cliente_id: null,
  cliente: "",
  cnpj: "",
  telefone: "",
  nome_contato: null,
  mensal_site: 0,
  mensal_real: 0,
  custo_boleto: 3.45,
  francisco_pct: 10,
  vencimento: 5,
  mes_ano: currentMesAno(),
  tipo_cobranca: "RECORRENTE",
  status_assinatura: "ATIVO",
  situacao: "ABERTO",
  pago_em: null,
  forma_pagamento: null,
  dias_atraso: null,
});
