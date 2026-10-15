/**
 * Consulta pública de CNPJ.
 *
 * Consulta primeiro a BrasilAPI e, se ela falhar (fora do ar, limite de
 * requisições ou CNPJ ausente), cai automaticamente para a ReceitaWS. A
 * resposta é normalizada para os campos usados pelos formulários e todos os
 * erros são convertidos em mensagens em português prontas para exibição.
 */

export type CnpjData = {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  telefone: string;
  email: string;
  endereco: string;
  numero_endereco: string;
  bairro: string;
  cep: string;
  cidade: string;
  uf: string;
};

export class CnpjError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CnpjError";
  }
}

const TIMEOUT_MS = 12_000;

const PROVIDERS = [
  (cnpj: string) => `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,
  (cnpj: string) => `https://receitaws.com.br/v1/cnpj/${cnpj}`,
];

/** Remove qualquer máscara e mantém apenas os dígitos. */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Aplica a máscara 00.000.000/0000-00. */
export function formatCnpj(value: string): string {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

/** Valida os 14 dígitos do CNPJ, incluindo os dígitos verificadores. */
export function isValidCnpj(value: string): boolean {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  const checkDigit = (base: string): number => {
    let weight = base.length - 7;
    const sum = [...base].reduce((total, char) => {
      total += Number(char) * weight;
      weight -= 1;
      if (weight < 2) weight = 9;
      return total;
    }, 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const first = checkDigit(cnpj.slice(0, 12));
  const second = checkDigit(cnpj.slice(0, 12) + String(first));
  return cnpj === `${cnpj.slice(0, 12)}${first}${second}`;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Campos relevantes das respostas da BrasilAPI e da ReceitaWS. */
type CnpjApiRaw = {
  // BrasilAPI
  razao_social?: unknown;
  nome_fantasia?: unknown;
  ddd_telefone_1?: unknown;
  logradouro?: unknown;
  numero?: unknown;
  bairro?: unknown;
  cep?: unknown;
  municipio?: unknown;
  uf?: unknown;
  // ReceitaWS
  nome?: unknown;
  fantasia?: unknown;
  telefone?: unknown;
  cidade?: unknown;
  // comuns
  email?: unknown;
  status?: unknown;
  message?: unknown;
};

/** Normaliza BrasilAPI (`razao_social`/`municipio`) e ReceitaWS (`nome`/`fantasia`). */
function normalize(raw: CnpjApiRaw, cnpj: string): CnpjData {
  const telefone = text(raw.ddd_telefone_1) || text(raw.telefone);
  return {
    cnpj,
    razao_social: text(raw.razao_social) || text(raw.nome),
    nome_fantasia: text(raw.nome_fantasia) || text(raw.fantasia),
    telefone: onlyDigits(telefone),
    email: text(raw.email).toLowerCase(),
    endereco: text(raw.logradouro),
    numero_endereco: text(raw.numero),
    bairro: text(raw.bairro),
    cep: onlyDigits(text(raw.cep)),
    cidade: text(raw.municipio) || text(raw.cidade),
    uf: text(raw.uf).toUpperCase().slice(0, 2),
  };
}

async function request(url: string, signal: AbortSignal): Promise<CnpjApiRaw> {
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } });

  if (response.status === 404) throw new CnpjError("CNPJ não encontrado na base pública.");
  if (response.status === 429) {
    throw new CnpjError(
      "Muitas consultas em pouco tempo. Aguarde alguns segundos e tente novamente.",
    );
  }
  if (!response.ok) throw new CnpjError(`A consulta falhou (HTTP ${response.status}).`);

  const payload = (await response.json()) as CnpjApiRaw;
  // A ReceitaWS responde 200 com status "ERROR" quando o CNPJ não existe.
  if (text(payload.status).toUpperCase() === "ERROR") {
    throw new CnpjError(text(payload.message) || "CNPJ não encontrado na base pública.");
  }
  return payload;
}

/**
 * Consulta os dados de um CNPJ nos provedores públicos.
 *
 * @throws {CnpjError} quando o CNPJ é inválido, não existe ou os provedores
 * estão indisponíveis — sempre com uma mensagem amigável em português.
 */
export async function consultarCnpj(value: string): Promise<CnpjData> {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14) throw new CnpjError("Informe um CNPJ com 14 dígitos.");
  if (!isValidCnpj(cnpj)) throw new CnpjError("CNPJ inválido. Confira os dígitos informados.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let lastError: unknown;
  try {
    for (const build of PROVIDERS) {
      try {
        return normalize(await request(build(cnpj), controller.signal), cnpj);
      } catch (error) {
        lastError = error;
        if (controller.signal.aborted) break;
      }
    }
  } finally {
    clearTimeout(timeout);
  }

  if (controller.signal.aborted) {
    throw new CnpjError("A consulta demorou demais. Verifique a conexão e tente novamente.");
  }
  if (lastError instanceof CnpjError) throw lastError;
  throw new CnpjError("Não foi possível consultar o CNPJ. Verifique a conexão e tente novamente.");
}
