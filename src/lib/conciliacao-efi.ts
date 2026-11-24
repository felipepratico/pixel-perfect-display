import { supabase } from "@/integrations/supabase/client";
import {
  calcularEncargosTitulo,
  type ConfiguracoesFinanceiras,
} from "@/lib/configuracoes-financeiras";
import {
  clienteIdDoTitulo,
  getVencimentoDate,
  parseNumber,
  type ClienteRef,
  type Titulo,
  type TituloInput,
} from "@/lib/fincontrol";

export type ItemExtratoEfi = {
  Tipo: string;
  Protocolo: number | string;
  Data: string;
  Valor: string | number;
};

/** Item do "Relatório Expresso" de cobranças da Efí (valores em centavos). */
export type ItemRelatorioCobrancaEfi = {
  charge_id: number | string;
  status: string;
  total?: number | null;
  paid_value?: number | null;
  paid_at?: string | null;
  expire_at?: string | null;
  created_at?: string | null;
  charge_method?: string | null;
  customer?: {
    name?: string | null;
    document?: string | null;
    email?: string | null;
    phone_number?: string | null;
  } | null;
  payment?: {
    method?: string | null;
    banking_billet?: { paid_at?: string | null; expire_at?: string | null; paid_value?: number | null } | null;
  } | null;
};

export type ItemExtratoProcessado = {
  id: string;
  raw: ItemExtratoEfi | ItemRelatorioCobrancaEfi;
  cobrancaId: string | null;
  nomePagador: string;
  dataOriginal: string;
  dataIso: string;
  valor: number;
  protocolo: string;
  /** CPF/CNPJ do pagador (apenas dígitos), quando o arquivo informa. */
  documento: string | null;
  /** Valor original do boleto, sem juros/multa, quando o arquivo informa. */
  valorOriginal: number | null;
  /** Mês de referência do vencimento no formato MM/AAAA, quando o arquivo informa. */
  mesVencimento: string | null;
  /** Data de vencimento original (DD/MM/AAAA), quando o arquivo informa. */
  vencimentoOriginal: string | null;
};

export type ClienteAliasBancario = {
  id: string;
  cliente_id: string | null;
  nome_extrato: string;
  created_at?: string;
};

export type ClienteAliasCnpj = {
  id: string;
  user_id?: string;
  cliente_id: string;
  cnpj: string;
  created_at?: string;
  updated_at?: string;
};

export type ClienteCnpjAlias = ClienteAliasCnpj;
export type ClienteAliasCNPJ = ClienteAliasCnpj;

export type MatchConciliacao = {
  extrato: ItemExtratoProcessado;
  titulo: Titulo | null;
  clienteNome: string;
  metodo: "cnpj" | "alias" | "nome_exato" | "nome_similar" | "manual" | null;
  confianca: "alta" | "media" | "baixa" | "nenhuma";
  salvarVinculo: boolean;
  selecionadoParaBaixa: boolean;
  /** Título do mesmo cliente e mês que já está PAGO no sistema (pagamento já baixado). */
  tituloJaPago: Titulo | null;
};

/**
 * Normaliza um nome para comparação:
 * - Remove acentos
 * - Converte para maiúsculas
 * - Remove termos societários comuns (LTDA, ME, EPP, EIRELI, S/A, etc.)
 * - Remove pontuações e espaços extras
 */
export function normalizarNomeParaComparacao(nome: string): string {
  return (nome || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\b(LTDA|ME|EPP|EIRELI|S\/A|SA|SS|MEI)\b/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Converte valor em formato brasileiro ("84,21", "1.234,56") ou número para number.
 */
export function parseValorBrasileiro(valor: string | number): number {
  if (typeof valor === "number") return isNaN(valor) ? 0 : valor;
  if (!valor) return 0;
  const limpo = String(valor).trim().replace(/[^\d,-]/g, "").replace(",", ".");
  const num = parseFloat(limpo);
  return isNaN(num) ? 0 : num;
}

/**
 * Converte data DD/MM/YYYY para objeto Date e string ISO.
 */
export function parseDataBrasileira(dataStr: string): { date: Date; iso: string } {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(dataStr || "").trim());
  if (match) {
    const dia = parseInt(match[1] || "1", 10);
    const mes = parseInt(match[2] || "1", 10);
    const ano = parseInt(match[3] || "2000", 10);
    const d = new Date(ano, mes - 1, dia, 12, 0, 0);
    return { date: d, iso: d.toISOString() };
  }
  const fallback = new Date();
  return { date: fallback, iso: fallback.toISOString() };
}

/**
 * Extrai cobrança, pagador, data e valor do item do extrato Efí.
 * Exemplo de Tipo: "Recebimento de cobrança • 1080800445 de MINI MERCADO MERCADO"
 */
export function parseItemExtratoEfi(item: ItemExtratoEfi, index: number): ItemExtratoProcessado | null {
  if (!item || !item.Tipo) return null;

  const tipo = String(item.Tipo || "").trim();
  let cobrancaId: string | null = null;
  let nomePagador = "";

  // Regex específico: "• <ID> de <NOME>"
  const matchBullet = /[•·]\s*([^\s]+)\s+de\s+(.+)$/i.exec(tipo);
  if (matchBullet) {
    cobrancaId = matchBullet[1]?.trim() || null;
    nomePagador = matchBullet[2]?.trim() || "";
  } else {
    // Fallback: busca por " de "
    const partesDe = tipo.split(/\s+de\s+/i);
    if (partesDe.length > 1) {
      nomePagador = partesDe.slice(1).join(" de ").trim();
      const antesDe = partesDe[0] || "";
      const bulletSplit = antesDe.split(/[•·]/);
      if (bulletSplit.length > 1) {
        cobrancaId = bulletSplit[1]?.trim().split(/\s+/)[0] || null;
      }
    } else {
      nomePagador = tipo;
    }
  }

  const valor = parseValorBrasileiro(item.Valor);
  const { iso: dataIso } = parseDataBrasileira(item.Data);

  return {
    id: `extrato-${index}-${item.Protocolo || Math.random()}`,
    raw: item,
    cobrancaId,
    nomePagador,
    dataOriginal: String(item.Data || "").trim(),
    dataIso,
    valor,
    protocolo: String(item.Protocolo || ""),
    documento: null,
    valorOriginal: null,
    mesVencimento: null,
    vencimentoOriginal: null,
  };
}

/** Status do relatório Efí que representam pagamento confirmado. */
export const STATUS_EFI_PAGOS = ["paid", "settled"] as const;

/** Rótulos em português para status do relatório Efí. */
export const ROTULO_STATUS_EFI: Record<string, string> = {
  paid: "Pagas",
  settled: "Marcadas como pagas",
  unpaid: "Em aberto / não pagas",
  waiting: "Aguardando pagamento",
  canceled: "Canceladas",
  identified: "Identificadas (aguardando confirmação)",
  expired: "Expiradas",
  link: "Link gerado",
  new: "Novas",
  refunded: "Estornadas",
  contested: "Contestadas",
};

export function isItemRelatorioCobrancaEfi(item: unknown): item is ItemRelatorioCobrancaEfi {
  if (!item || typeof item !== "object") return false;
  const o = item as Record<string, unknown>;
  return o["charge_id"] !== undefined && typeof o["status"] === "string";
}

/**
 * Converte "AAAA-MM-DD HH:MM:SS" (horário de Brasília, como a Efí envia)
 * em ISO e em texto "DD/MM/AAAA HH:MM".
 */
export function parseDataHoraEfi(valor: string | null | undefined): { iso: string; texto: string; data: string } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(String(valor ?? "").trim());
  if (!m) return null;
  const [, ano, mes, dia, hh = "12", mm = "00", ss = "00"] = m;
  const iso = new Date(`${ano}-${mes}-${dia}T${hh}:${mm}:${ss}-03:00`).toISOString();
  const data = `${dia}/${mes}/${ano}`;
  return { iso, texto: m[4] ? `${data} ${hh}:${mm}` : data, data };
}

/**
 * Converte um item do Relatório Expresso da Efí em pagamento para conciliar.
 * Retorna null para cobranças que não estão pagas (abertas, canceladas etc.).
 */
export function parseItemRelatorioEfi(
  item: ItemRelatorioCobrancaEfi,
  index: number,
): ItemExtratoProcessado | null {
  const status = String(item.status || "").toLowerCase();
  if (!(STATUS_EFI_PAGOS as readonly string[]).includes(status)) return null;

  const boleto = item.payment?.banking_billet ?? null;
  const centavosPagos = item.paid_value ?? boleto?.paid_value ?? item.total ?? null;
  if (centavosPagos === null || centavosPagos === undefined) return null;

  const pagoEm = parseDataHoraEfi(item.paid_at ?? boleto?.paid_at ?? null);
  if (!pagoEm) return null;

  const vencimento = parseDataHoraEfi(item.expire_at ?? boleto?.expire_at ?? null);
  const documento = String(item.customer?.document ?? "").replace(/\D/g, "") || null;
  const total = item.total ?? null;

  return {
    id: `efi-${index}-${item.charge_id}`,
    raw: item,
    cobrancaId: String(item.charge_id),
    nomePagador: String(item.customer?.name ?? "").trim(),
    dataOriginal: pagoEm.texto,
    dataIso: pagoEm.iso,
    valor: Number((Number(centavosPagos) / 100).toFixed(2)),
    protocolo: String(item.charge_id),
    documento,
    valorOriginal: total === null ? null : Number((Number(total) / 100).toFixed(2)),
    mesVencimento: vencimento ? vencimento.data.slice(3) : null,
    vencimentoOriginal: vencimento ? vencimento.data : null,
  };
}

export type ResultadoLeituraArquivoEfi = {
  formato: "relatorio" | "extrato";
  itens: ItemExtratoProcessado[];
  /** Cobranças não pagas que ficaram fora da baixa, por status. */
  ignorados: Record<string, number>;
};

/**
 * Lê o conteúdo de um arquivo JSON da Efí. Aceita o Relatório Expresso de cobranças
 * (charge_id, customer, paid_value) e o extrato simples (Tipo, Data, Valor).
 */
export function lerArquivoEfi(conteudo: unknown): ResultadoLeituraArquivoEfi {
  const obj = conteudo as Record<string, unknown> | null;
  const lista: unknown[] = Array.isArray(conteudo)
    ? conteudo
    : obj && Array.isArray(obj["data"])
      ? (obj["data"] as unknown[])
      : obj && Array.isArray(obj["items"])
        ? (obj["items"] as unknown[])
        : obj
          ? [obj]
          : [];

  if (lista.some(isItemRelatorioCobrancaEfi)) {
    const itens: ItemExtratoProcessado[] = [];
    const ignorados: Record<string, number> = {};
    lista.forEach((it, idx) => {
      if (!isItemRelatorioCobrancaEfi(it)) return;
      const processado = parseItemRelatorioEfi(it, idx);
      if (processado) itens.push(processado);
      else {
        const st = String(it.status || "desconhecido").toLowerCase();
        ignorados[st] = (ignorados[st] ?? 0) + 1;
      }
    });
    return { formato: "relatorio", itens, ignorados };
  }

  const itens = lista
    .map((it, idx) => parseItemExtratoEfi(it as ItemExtratoEfi, idx))
    .filter((it): it is ItemExtratoProcessado => it !== null);
  return { formato: "extrato", itens, ignorados: {} };
}

/**
 * Calcula a similaridade entre duas strings normalizadas (0 a 1).
 */
export function calcularSimilaridadeNomes(str1: string, str2: string): number {
  const s1 = normalizarNomeParaComparacao(str1);
  const s2 = normalizarNomeParaComparacao(str2);
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1.0;

  // Um contém o outro
  if (s1.includes(s2) || s2.includes(s1)) {
    const minLen = Math.min(s1.length, s2.length);
    const maxLen = Math.max(s1.length, s2.length);
    return Math.max(0.75, minLen / maxLen);
  }

  // Token / word overlap
  const tokens1 = new Set(s1.split(" ").filter((w) => w.length >= 2));
  const tokens2 = new Set(s2.split(" ").filter((w) => w.length >= 2));
  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  let intersecao = 0;
  tokens1.forEach((t) => {
    if (tokens2.has(t)) intersecao++;
  });

  const uniao = new Set([...tokens1, ...tokens2]).size;
  return uniao > 0 ? intersecao / uniao : 0;
}

/**
 * Busca todos os aliases cadastrados na tabela cliente_aliases_bancarios.
 */
export async function buscarAliasesBancarios(): Promise<ClienteAliasBancario[]> {
  try {
    const { data, error } = await supabase
      .from("cliente_aliases_bancarios" as any)
      .select("*");
    if (error) {
      console.warn("Aviso ao buscar cliente_aliases_bancarios:", error);
      return [];
    }
    return (data as unknown as ClienteAliasBancario[]) || [];
  } catch (err) {
    console.error("Erro inesperado ao buscar aliases bancários:", err);
    return [];
  }
}

/**
 * Salva um novo alias na tabela cliente_aliases_bancarios.
 */
export async function salvarAliasBancario(
  clienteId: string,
  nomeExtrato: string,
): Promise<ClienteAliasBancario | null> {
  if (!clienteId || !nomeExtrato.trim()) return null;
  try {
    const { data, error } = await supabase
      .from("cliente_aliases_bancarios" as any)
      .insert({
        cliente_id: clienteId,
        nome_extrato: nomeExtrato.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error("Erro ao salvar alias bancário:", error);
      return null;
    }
    return data as unknown as ClienteAliasBancario;
  } catch (err) {
    console.error("Erro ao salvar alias bancário:", err);
    return null;
  }
}

/**
 * Busca todos os aliases de CNPJ cadastrados na tabela cliente_aliases_cnpj.
 */
const TABELAS_CNPJ_ALIAS = [
  "cliente_aliases_cnpj",
  "cliente_cnpj_aliases",
  "cliente_vinculos_cnpj",
] as const;

export async function buscarAliasesCnpj(): Promise<ClienteAliasCnpj[]> {
  const resultados: ClienteAliasCnpj[] = [];
  const vistos = new Set<string>();

  for (const tabela of TABELAS_CNPJ_ALIAS) {
    try {
      const { data, error } = await supabase.from(tabela as any).select("*");
      if (error) continue;
      const linhas = (data as unknown as ClienteAliasCnpj[]) || [];
      linhas.forEach((linha) => {
        const chave = linha.id || `${linha.cliente_id}:${linha.cnpj}`;
        if (vistos.has(chave)) return;
        vistos.add(chave);
        resultados.push(linha);
      });
    } catch {
      // Tabela inexistente ou inacessível: tenta a próxima.
    }
  }

  return resultados;
}

/**
 * Salva um novo alias de CNPJ vinculado ao cadastro principal do cliente.
 */
export type ResultadoSalvarAliasCnpj = {
  registro: ClienteAliasCnpj | null;
  erro: { message: string; details?: string; code?: string } | null;
};

export async function salvarAliasCnpjDetalhado(
  clienteId: string,
  cnpj: string,
): Promise<ResultadoSalvarAliasCnpj> {
  if (!clienteId || !cnpj.trim()) {
    return { registro: null, erro: { message: "Cliente ou CNPJ inválido." } };
  }

  // Obtém o usuário autenticado para respeitar RLS (user_id).
  let userId: string | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    userId = data?.user?.id ?? null;
  } catch {
    userId = null;
  }

  let ultimoErro: { message: string; details?: string; code?: string } | null = null;

  for (const tabela of TABELAS_CNPJ_ALIAS) {
    try {
      const payload: Record<string, unknown> = {
        cliente_id: clienteId,
        cnpj: cnpj.trim(),
      };
      if (userId) payload["user_id"] = userId;

      const { data, error } = await supabase
        .from(tabela as any)
        .insert(payload)
        .select()
        .single();

      if (error) {
        ultimoErro = {
          message: error.message || "Erro ao vincular CNPJ.",
          details: (error as any).details,
          code: (error as any).code,
        };
        continue;
      }
      return { registro: data as unknown as ClienteAliasCnpj, erro: null };
    } catch (err) {
      ultimoErro = {
        message: err instanceof Error ? err.message : "Erro inesperado ao vincular CNPJ.",
      };
    }
  }

  if (!ultimoErro) {
    ultimoErro = { message: "Não foi possível vincular o CNPJ em nenhuma tabela." };
  }
  return { registro: null, erro: ultimoErro };
}

export async function salvarAliasCnpj(
  clienteId: string,
  cnpj: string,
): Promise<ClienteAliasCnpj | null> {
  const resultado = await salvarAliasCnpjDetalhado(clienteId, cnpj);
  return resultado.registro;
}

// Compatibilidade de nomes (PT/EN) para diferentes chamadas.
export const buscarAliasesCNPJ = buscarAliasesCnpj;
export const buscarCnpjAliases = buscarAliasesCnpj;
export const buscarVinculosCnpj = buscarAliasesCnpj;
export const buscarAliasesCnpjCliente = buscarAliasesCnpj;
export const salvarAliasCNPJ = salvarAliasCnpj;
export const salvarCnpjAlias = salvarAliasCnpj;
export const salvarVinculoCnpj = salvarAliasCnpj;

export async function excluirAliasCnpj(id: string): Promise<boolean> {
  if (!id) return false;
  let ok = false;
  for (const tabela of TABELAS_CNPJ_ALIAS) {
    try {
      const { error } = await supabase.from(tabela as any).delete().eq("id", id);
      if (!error) ok = true;
    } catch {
      // Tenta próxima tabela.
    }
  }
  return ok;
}

export const excluirAliasCNPJ = excluirAliasCnpj;
export const excluirCnpjAlias = excluirAliasCnpj;
export const removerVinculoCnpj = excluirAliasCnpj;

export function resolverClientePrincipalPorCnpj(
  cnpj: string,
  aliasesCnpj: Array<{ cliente_id?: string | null; cnpj: string }> = [],
  clientesCadastrados: ClienteRef[] = [],
): string | null {
  return clienteIdDoTitulo(
    { cliente_id: null, cliente: "", cnpj },
    clientesCadastrados,
    aliasesCnpj,
  );
}

export const clientePrincipalPorCnpj = resolverClientePrincipalPorCnpj;
export const obterClientePrincipalPorCnpj = resolverClientePrincipalPorCnpj;

/**
 * Executa a conciliação automática do lote de itens processados com os lançamentos em aberto.
 */
export function conciliarItensExtrato({
  itens,
  titulosAbertos,
  aliases,
  clientesCadastrados = [],
  aliasesCnpj = [],
  cnpjAliases = [],
  aliasesCNPJ = [],
  vinculosCnpj = [],
  titulosPagos = [],
}: {
  itens: ItemExtratoProcessado[];
  titulosAbertos: Titulo[];
  /** Títulos já pagos, para reconhecer pagamentos que já foram baixados. */
  titulosPagos?: Titulo[];
  aliases: ClienteAliasBancario[];
  clientesCadastrados?: ClienteRef[];
  aliasesCnpj?: ClienteAliasCnpj[];
  cnpjAliases?: ClienteAliasCnpj[];
  aliasesCNPJ?: ClienteAliasCnpj[];
  vinculosCnpj?: ClienteAliasCnpj[];
}): MatchConciliacao[] {
  // Mapa de aliases normalizados para busca rápida
  const mapAliases = new Map<string, string>(); // nomeNormalizado -> cliente_id
  aliases.forEach((a) => {
    if (a.cliente_id && a.nome_extrato) {
      mapAliases.set(normalizarNomeParaComparacao(a.nome_extrato), a.cliente_id);
    }
  });

  const cnpjAliasesMesclados = [
    ...aliasesCnpj,
    ...cnpjAliases,
    ...aliasesCNPJ,
    ...vinculosCnpj,
  ].filter(Boolean);

  // Títulos disponíveis para vínculo (evita vincular o mesmo título 2x)
  const titulosDisponiveis = [...titulosAbertos];
  const titulosUsados = new Set<string>();

  const digitos = (v: string | null | undefined) => (v ?? "").replace(/\D/g, "");

  /** Títulos do cliente dono do documento (CNPJ direto ou cadastro principal vinculado). */
  function titulosDoDocumento(lista: Titulo[], doc: string): Titulo[] {
    const clientePrincipal = resolverClientePrincipalPorCnpj(doc, cnpjAliasesMesclados, clientesCadastrados);
    return lista.filter((t) => {
      if (digitos(t.cnpj) === doc) return true;
      if (!clientePrincipal) return false;
      const cId = t.cliente_id ?? clienteIdDoTitulo(t, clientesCadastrados, cnpjAliasesMesclados);
      return cId === clientePrincipal;
    });
  }

  const pagosUsados = new Set<string>();
  function acharJaPago(item: ItemExtratoProcessado): Titulo | null {
    if (!item.documento || !item.mesVencimento) return null;
    const achado = titulosDoDocumento(titulosPagos, item.documento).find(
      (t) => !pagosUsados.has(t.id) && t.mes_ano === item.mesVencimento && !t.deleted_at,
    );
    if (!achado) return null;
    pagosUsados.add(achado.id);
    return achado;
  }

  return itens.map((item): MatchConciliacao => {
    const base = conciliarItem(item);
    return { ...base, tituloJaPago: base.titulo ? null : acharJaPago(item) };
  });

  function conciliarItem(item: ItemExtratoProcessado): Omit<MatchConciliacao, "tituloJaPago"> {
    const nomeNorm = normalizarNomeParaComparacao(item.nomePagador);
    const valorRef = item.valorOriginal ?? item.valor;

    // 0. Passo: busca pelo CPF/CNPJ do pagador (relatório oficial da Efí)
    if (item.documento) {
      const candidatos = titulosDoDocumento(titulosDisponiveis, item.documento).filter(
        (t) => !titulosUsados.has(t.id),
      );

      if (candidatos.length > 0) {
        candidatos.sort((a, b) => {
          const mesA = item.mesVencimento && a.mes_ano === item.mesVencimento ? 0 : 1;
          const mesB = item.mesVencimento && b.mes_ano === item.mesVencimento ? 0 : 1;
          if (mesA !== mesB) return mesA - mesB;
          const diffA = Math.abs(parseNumber(a.mensal_site) - valorRef);
          const diffB = Math.abs(parseNumber(b.mensal_site) - valorRef);
          return diffA - diffB;
        });
        const escolhido = candidatos[0]!;
        titulosUsados.add(escolhido.id);
        return {
          extrato: item,
          titulo: escolhido,
          clienteNome: escolhido.cliente,
          metodo: "cnpj",
          confianca: "alta",
          salvarVinculo: false,
          selecionadoParaBaixa: true,
        };
      }
    }

    // 1. Passo: busca por alias bancário
    const clienteIdPorAlias = mapAliases.get(nomeNorm);
    if (clienteIdPorAlias) {
      // Procura títulos abertos deste cliente
      const candidatos = titulosDisponiveis.filter((t) => {
        if (titulosUsados.has(t.id)) return false;
        const cId = t.cliente_id ?? clienteIdDoTitulo(t, clientesCadastrados, cnpjAliasesMesclados);
        return cId === clienteIdPorAlias;
      });

      if (candidatos.length > 0) {
        // Prioriza o que tem o mesmo valor ou valor mais próximo
        candidatos.sort((a, b) => {
          const diffA = Math.abs(parseNumber(a.mensal_site) - valorRef);
          const diffB = Math.abs(parseNumber(b.mensal_site) - valorRef);
          return diffA - diffB;
        });

        const escolhido = candidatos[0]!;
        titulosUsados.add(escolhido.id);

        return {
          extrato: item,
          titulo: escolhido,
          clienteNome: escolhido.cliente,
          metodo: "alias",
          confianca: "alta",
          salvarVinculo: false, // já existe alias salvo
          selecionadoParaBaixa: true,
        };
      }
    }

    // 2. Passo: busca por nome do cliente ou similaridade
    type Candidato = {
      titulo: Titulo;
      similaridade: number;
      mesmoValor: boolean;
      scoreFinal: number;
    };

    const candidatos: Candidato[] = [];

    for (const t of titulosDisponiveis) {
      if (titulosUsados.has(t.id)) continue;

      const nomeTituloNorm = normalizarNomeParaComparacao(t.cliente);
      const sim = calcularSimilaridadeNomes(nomeNorm, nomeTituloNorm);

      // Compara também com a razão social cadastrada se houver
      let simCadastro = 0;
      const cId = t.cliente_id ?? clienteIdDoTitulo(t, clientesCadastrados, cnpjAliasesMesclados);
      if (cId) {
        const clienteObj = clientesCadastrados.find((c) => c.id === cId);
        if (clienteObj) {
          simCadastro = calcularSimilaridadeNomes(nomeNorm, normalizarNomeParaComparacao(clienteObj.razao_social));
        }
      }

      const maiorSim = Math.max(sim, simCadastro);
      const valorTitulo = parseNumber(t.mensal_site);
      const mesmoValor = Math.abs(valorTitulo - valorRef) < 0.05;

      // Se há alguma similaridade razoável (>= 0.4) ou se os nomes são iguais
      if (maiorSim >= 0.4) {
        let scoreFinal = maiorSim;
        if (mesmoValor) scoreFinal += 0.25; // bônus de valor idêntico
        candidatos.push({
          titulo: t,
          similaridade: maiorSim,
          mesmoValor,
          scoreFinal,
        });
      }
    }

    // Ordena pelo maior score
    candidatos.sort((a, b) => b.scoreFinal - a.scoreFinal);

    const melhor = candidatos[0];
    if (melhor && (melhor.similaridade >= 0.7 || (melhor.similaridade >= 0.5 && melhor.mesmoValor))) {
      titulosUsados.add(melhor.titulo.id);
      const confianca = melhor.similaridade >= 0.85 ? "alta" : "media";
      const metodo = melhor.similaridade >= 0.95 ? "nome_exato" : "nome_similar";

      return {
        extrato: item,
        titulo: melhor.titulo,
        clienteNome: melhor.titulo.cliente,
        metodo,
        confianca,
        salvarVinculo: true, // sugere salvar vínculo para próximas vezes
        selecionadoParaBaixa: true,
      };
    }

    // Não encontrado
    return {
      extrato: item,
      titulo: null,
      clienteNome: "",
      metodo: null,
      confianca: "nenhuma",
      salvarVinculo: true,
      selecionadoParaBaixa: false,
    };
  }
}

/**
 * Calcula todos os campos de baixa financeira conforme as regras do sistema:
 * - Repasse do Francisco: calculado APENAS sobre o valor nominal sem juros.
 * - Custo do boleto: deduzido integralmente.
 * - Encargos (juros/multa): creditados 100% ao Felipe.
 */
export function calcularValoresBaixaTitulo({
  titulo,
  valorPago,
  dataPagamentoIso,
  config,
}: {
  titulo: Titulo;
  valorPago: number;
  dataPagamentoIso: string;
  config: ConfiguracoesFinanceiras | null;
}): Partial<TituloInput> {
  const mensalSite = parseNumber(titulo.mensal_site);
  const franciscoPct =
    parseNumber(titulo.francisco_pct) || config?.percentual_repasse_francisco || 5;
  const custoBoleto =
    parseNumber(titulo.custo_boleto) || config?.custo_boleto_padrao || 3.45;

  // Dias de atraso com base na data do pagamento vs vencimento
  const dueDate = getVencimentoDate(titulo);
  const paidDate = new Date(dataPagamentoIso);
  const diffMs = dueDate ? paidDate.getTime() - dueDate.getTime() : 0;
  const diasAtraso = diffMs > 0 ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : 0;

  // Repasse Francisco (sobre valor original sem juros)
  const valorRepasseFrancisco = Number((mensalSite * (franciscoPct / 100)).toFixed(2));

  // Lucro líquido do Felipe: valor recebido total - repasse Francisco - custo boleto
  const lucroLiquidoFelipe = Number((valorPago - valorRepasseFrancisco - custoBoleto).toFixed(2));

  // Juros e multa recebidos além do valor nominal
  let valorMulta = 0;
  let valorJuros = 0;
  if (valorPago > mensalSite) {
    const encargosRecebidos = valorPago - mensalSite;
    if (diasAtraso > 0 && config) {
      const calcEnc = calcularEncargosTitulo({
        valorNominal: mensalSite,
        diasAtraso,
        config,
      });
      valorMulta = Number(calcEnc.valorMulta.toFixed(2));
      valorJuros = Number(Math.max(0, encargosRecebidos - valorMulta).toFixed(2));
    } else {
      valorJuros = Number(encargosRecebidos.toFixed(2));
    }
  }

  return {
    situacao: "PAGO",
    pago_em: dataPagamentoIso,
    forma_pagamento: "boleto",
    dias_atraso: diasAtraso,
    valor_nominal: mensalSite,
    valor_total: valorPago,
    valor_multa: valorMulta,
    valor_juros: valorJuros,
    valor_repasse_francisco: valorRepasseFrancisco,
    percentual_francisco_aplicado: franciscoPct,
    lucro_liquido_felipe: lucroLiquidoFelipe,
    custo_boleto: custoBoleto,
  };
}

