/**
 * Cliente server-side da API de Cobranças do Efí Bank (Gerencianet).
 *
 * Responsável por:
 * - ler as credenciais e o ambiente (homologação/produção) das variáveis de ambiente;
 * - alternar a URL base e apresentar o certificado A1 (mTLS) quando configurado;
 * - traduzir as respostas de erro da Efí em mensagens amigáveis em português.
 *
 * Este módulo nunca é importado pelo browser: apenas por server functions.
 */

import type { EfiAmbiente, EfiDiagnostico, ResultadoAssinaturaEfi } from "@/lib/efi";

/** URLs da API de Cobranças por ambiente (confirmado na documentação oficial). */
const EFI_URLS: Record<EfiAmbiente, string> = {
  HOMOLOGACAO: "https://cobrancas-h.api.efipay.com.br",
  PRODUCAO: "https://cobrancas.api.efipay.com.br",
};

const EFI_TIMEOUT_MS = 25_000;

const NOMES_SANDBOX = [
  "EFI_SANDBOX",
  "EFI_HOMOLOGACAO",
  "EFI_AMBIENTE",
  "EFI_ENVIRONMENT",
  "GERENCIANET_SANDBOX",
];

/**
 * O certificado A1 (mTLS) é exposto como binding de ambiente, não como arquivo:
 * no Cloudflare Workers é o binding `mtls_certificates` (wrangler).
 */
const NOMES_BINDING_CERTIFICADO = ["EFI_CERTIFICATE", "EFI_CERTIFICATE_BINDING", "EFI_MTLS"];

const VALORES_VERDADEIROS = ["1", "true", "sim", "yes", "sandbox", "homologacao", "h"];
const VALORES_FALSOS = ["0", "false", "nao", "no", "production", "producao", "p"];

function valor(...nomes: string[]): string {
  for (const nome of nomes) {
    const bruto = process.env[nome];
    if (typeof bruto === "string" && bruto.trim().length > 0) return bruto.trim();
  }
  return "";
}

function textoBooleano(bruto: string): boolean | null {
  const normalizado = bruto.trim().toLowerCase();
  if (VALORES_VERDADEIROS.includes(normalizado)) return true;
  if (VALORES_FALSOS.includes(normalizado)) return false;
  return null;
}

/** Lê o ambiente configurado; assume homologação quando nada for informado. */
export function ambienteConfigurado(): EfiAmbiente {
  for (const nome of NOMES_SANDBOX) {
    const bruto = process.env[nome];
    if (typeof bruto !== "string" || !bruto.trim()) continue;
    const booleano = textoBooleano(bruto);
    if (booleano !== null) return booleano ? "HOMOLOGACAO" : "PRODUCAO";
    const normalizado = bruto.trim().toUpperCase();
    if (normalizado.startsWith("PROD")) return "PRODUCAO";
    if (normalizado.startsWith("HOM")) return "HOMOLOGACAO";
  }
  return "HOMOLOGACAO";
}

type FetchEfi = typeof fetch;

/**
 * Devolve um fetch que apresenta o certificado A1 na conexão (mTLS) quando há
 * um binding de certificado disponível no ambiente. Sem binding, a Efí é
 * chamada com o fetch padrão (OAuth2), que é o suficiente para a API de Cobranças.
 */
export function fetchComCertificado(): FetchEfi | null {
  const ambiente = process.env as Record<string, unknown>;
  for (const nome of NOMES_BINDING_CERTIFICADO) {
    const candidato = ambiente[nome];
    if (
      candidato !== null &&
      typeof candidato === "object" &&
      typeof (candidato as { fetch?: unknown }).fetch === "function"
    ) {
      const binding = candidato as { fetch: FetchEfi };
      return binding.fetch.bind(binding) as FetchEfi;
    }
  }
  return null;
}

export type CredenciaisEfi = {
  ambiente: EfiAmbiente;
  sandbox: boolean;
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  fetchSeguro: FetchEfi | null;
};

/**
 * Resolve as credenciais do ambiente ativo. Aceita os nomes documentados
 * (EFI_CLIENT_ID/EFI_CLIENT_SECRET) e também os sufixados por ambiente
 * (EFI_CLIENT_ID_HOMOLOGACAO, EFI_CLIENT_SECRET_PRODUCAO, ...).
 */
export function lerCredenciais(): CredenciaisEfi {
  const ambiente = ambienteConfigurado();
  const sandbox = ambiente === "HOMOLOGACAO";
  const sufixos = sandbox
    ? ["HOMOLOGACAO", "SANDBOX", "TESTE", "H"]
    : ["PRODUCAO", "PRODUCTION", "PROD", "P"];
  const clientId = valor(
    ...sufixos.map((sufixo) => `EFI_CLIENT_ID_${sufixo}`),
    "EFI_CLIENT_ID",
    "GERENCIANET_CLIENT_ID",
  );
  const clientSecret = valor(
    ...sufixos.map((sufixo) => `EFI_CLIENT_SECRET_${sufixo}`),
    "EFI_CLIENT_SECRET",
    "GERENCIANET_CLIENT_SECRET",
  );
  return {
    ambiente,
    sandbox,
    baseUrl: EFI_URLS[ambiente],
    clientId,
    clientSecret,
    fetchSeguro: fetchComCertificado(),
  };
}

/** Situação da configuração, usada pela interface para exibir o ambiente real. */
export function diagnosticoEfi(): EfiDiagnostico {
  const credenciais = lerCredenciais();
  const faltando: string[] = [];
  if (!credenciais.clientId) faltando.push("EFI_CLIENT_ID");
  if (!credenciais.clientSecret) faltando.push("EFI_CLIENT_SECRET");
  return {
    ambiente: credenciais.ambiente,
    sandbox: credenciais.sandbox,
    baseUrl: credenciais.baseUrl,
    credenciaisConfiguradas: faltando.length === 0,
    certificadoConfigurado: credenciais.fetchSeguro !== null,
    faltando,
  };
}

export type TipoErroEfi = "credenciais" | "certificado" | "validacao" | "comunicacao" | "incerto";

/** Erro de negócio da Efí já traduzido para o usuário. */
export class ErroEfi extends Error {
  readonly tipo: TipoErroEfi;
  readonly status: number;

  constructor(mensagem: string, tipo: TipoErroEfi, status = 0) {
    super(mensagem);
    this.name = "ErroEfi";
    this.tipo = tipo;
    this.status = status;
  }
}

function objeto(valorBruto: unknown): Record<string, unknown> {
  return valorBruto !== null && typeof valorBruto === "object"
    ? (valorBruto as Record<string, unknown>)
    : {};
}

function texto(...valores: unknown[]): string {
  const achado = valores.find((item) => typeof item === "string" && item.length > 0);
  return typeof achado === "string" ? achado : "";
}

function numeroInteiro(...valores: unknown[]): number | null {
  for (const item of valores) {
    if (typeof item === "number" && Number.isSafeInteger(item)) return item;
    if (typeof item === "string" && /^\d+$/.test(item)) {
      const convertido = Number(item);
      if (Number.isSafeInteger(convertido)) return convertido;
    }
  }
  return null;
}

function jsonSeguro(corpo: string): Record<string, unknown> {
  try {
    return objeto(JSON.parse(corpo));
  } catch {
    return {};
  }
}

function mensagemProvedor(corpo: string): string {
  const payload = jsonSeguro(corpo);
  return texto(
    payload["message"],
    payload["error_description"],
    payload["error"],
    payload["nome"],
    payload["detail"],
  );
}

type RequisicaoEfi = { method: "GET" | "POST"; headers: Record<string, string>; body?: string };
type RespostaEfi = { status: number; ok: boolean; corpo: string };

function pareceErroDeCertificado(erro: unknown): boolean {
  const codigo =
    typeof (erro as { code?: unknown } | null)?.code === "string"
      ? String((erro as { code: string }).code)
      : "";
  const mensagem = erro instanceof Error ? erro.message : "";
  const assinatura = `${codigo} ${mensagem}`.toUpperCase();
  return [
    "CERT",
    "SSL",
    "TLS",
    "PKCS12",
    "SELF_SIGNED",
    "UNABLE_TO_VERIFY",
    "DEPTH_ZERO",
    "CANNOT_LOAD",
    "OSSL",
  ].some((termo) => assinatura.includes(termo));
}

function traduzirFalhaDeRede(erro: unknown, credenciais: CredenciaisEfi): ErroEfi {
  if (erro instanceof ErroEfi) return erro;
  const mensagem = erro instanceof Error ? erro.message : "";
  if (pareceErroDeCertificado(erro)) {
    return new ErroEfi(
      "Falha no certificado A1 usado na Efí. Confira o certificado (mTLS) configurado no servidor.",
      "certificado",
    );
  }
  if (mensagem === "EFI_TIMEOUT" || (erro instanceof Error && erro.name === "AbortError")) {
    return new ErroEfi(
      "A Efí demorou demais para responder. Tente novamente em instantes.",
      "comunicacao",
    );
  }
  return new ErroEfi(
    credenciais.fetchSeguro
      ? "Não foi possível conectar à Efí com o certificado configurado. Confira o certificado A1 (mTLS)."
      : "Não foi possível conectar à Efí. Verifique a conexão do servidor e tente novamente.",
    "comunicacao",
  );
}

async function requisicao(
  credenciais: CredenciaisEfi,
  caminho: string,
  init: RequisicaoEfi,
): Promise<RespostaEfi> {
  const url = `${credenciais.baseUrl}${caminho}`;
  const enviar: FetchEfi = credenciais.fetchSeguro ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EFI_TIMEOUT_MS);
  try {
    const resposta = await enviar(url, {
      method: init.method,
      headers: init.headers,
      signal: controller.signal,
      ...(init.body === undefined ? {} : { body: init.body }),
    });
    return { status: resposta.status, ok: resposta.ok, corpo: await resposta.text() };
  } catch (erro) {
    throw traduzirFalhaDeRede(erro, credenciais);
  } finally {
    clearTimeout(timer);
  }
}

function erroDeResposta(resposta: RespostaEfi, etapa: "autenticacao" | "cobranca"): ErroEfi {
  const detalhe = mensagemProvedor(resposta.corpo);
  if (resposta.status === 401 || resposta.status === 403) {
    return new ErroEfi(
      etapa === "autenticacao"
        ? "A Efí recusou a autenticação. Confira EFI_CLIENT_ID e EFI_CLIENT_SECRET no ambiente configurado e, se a conta exigir mTLS, o certificado A1."
        : "A Efí recusou a emissão por falta de autorização. Verifique o escopo da aplicação e o acesso ao plano.",
      "credenciais",
      resposta.status,
    );
  }
  if ([400, 404, 422].includes(resposta.status)) {
    return new ErroEfi(
      detalhe
        ? `A Efí recusou os dados: ${detalhe}`
        : "A Efí recusou os dados enviados. Revise o cliente, o plano e o vencimento.",
      "validacao",
      resposta.status,
    );
  }
  if (resposta.status === 429) {
    return new ErroEfi(
      "Muitas requisições à Efí em pouco tempo. Aguarde alguns segundos e tente novamente.",
      "comunicacao",
      resposta.status,
    );
  }
  if (resposta.status >= 500) {
    return new ErroEfi(
      "A Efí respondeu com instabilidade. Confirme a emissão antes de tentar novamente.",
      "incerto",
      resposta.status,
    );
  }
  return new ErroEfi(
    detalhe || "A Efí retornou uma resposta inesperada.",
    "comunicacao",
    resposta.status,
  );
}

/** Autentica via OAuth2 (client_credentials) e devolve o access token. */
export async function autenticarEfi(credenciais: CredenciaisEfi): Promise<string> {
  if (!credenciais.clientId || !credenciais.clientSecret) {
    throw new ErroEfi(
      credenciais.sandbox
        ? "Credenciais de homologação da Efí ausentes. Configure EFI_CLIENT_ID e EFI_CLIENT_SECRET."
        : "Credenciais de produção da Efí ausentes. Configure EFI_CLIENT_ID e EFI_CLIENT_SECRET.",
      "credenciais",
    );
  }
  const resposta = await requisicao(credenciais, "/v1/authorize", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${credenciais.clientId}:${credenciais.clientSecret}`)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ grant_type: "client_credentials" }),
  });
  const corpo = jsonSeguro(resposta.corpo);
  const token = texto(corpo["access_token"]);
  if (!resposta.ok || !token) throw erroDeResposta(resposta, "autenticacao");
  return token;
}

/** Cria a assinatura em uma única chamada (plano + primeiro boleto). */
export async function criarAssinaturaEfi(
  credenciais: CredenciaisEfi,
  token: string,
  planId: number,
  body: unknown,
): Promise<ResultadoAssinaturaEfi> {
  const resposta = await requisicao(
    credenciais,
    `/v1/plan/${encodeURIComponent(String(planId))}/subscription/one-step`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (!resposta.ok) throw erroDeResposta(resposta, "cobranca");
  return extrairAssinatura(jsonSeguro(resposta.corpo));
}

/** Normaliza o retorno da Efí (boleto, link, linha digitável e Pix quando houver). */
export function extrairAssinatura(payload: Record<string, unknown>): ResultadoAssinaturaEfi {
  const data = objeto(payload["data"] ?? payload);
  const payment = objeto(data["payment"]);
  const billet = objeto(payment["banking_billet"] ?? data["banking_billet"]);
  const pix = objeto(payment["pix"] ?? data["pix"]);
  const pdf = objeto(billet["pdf"]);
  return {
    status: texto(data["status"], payload["status"]) || "ATIVO",
    subscriptionId: numeroInteiro(data["subscription_id"], payload["subscription_id"]),
    chargeId: numeroInteiro(data["charge_id"], payload["charge_id"], billet["charge_id"]),
    link: texto(
      billet["link"],
      billet["payment_url"],
      pdf["charge"],
      data["link"],
      data["payment_url"],
    ),
    linhaDigitavel: texto(
      billet["barcode"],
      billet["digitable_line"],
      data["barcode"],
      data["digitable_line"],
    ),
    pixCopiaECola: texto(
      pix["pixCopiaECola"],
      pix["qrcode"],
      billet["pix_copia_cola"],
      data["pix_copia_cola"],
    ),
  };
}
