/**
 * Credenciais da Efí cadastradas pelo usuário no próprio sistema.
 *
 * - Segredos são cifrados com AES-256-GCM antes de irem para o banco.
 * - A chave vem de EFI_CREDENTIALS_KEY; na ausência dela, é derivada da
 *   SUPABASE_SERVICE_ROLE_KEY (que também é um segredo exclusivo do servidor).
 * - A tabela `efi_credenciais` não tem acesso para `authenticated`: somente a
 *   service role lê/grava. O navegador recebe apenas dados mascarados.
 */

import type { EfiAmbiente } from "@/lib/efi";
import { lerCredenciais, tokenWebhook } from "@/lib/efi-api.server";

const PREFIXO = "v1";
const NOMES_CHAVE = ["EFI_CREDENTIALS_KEY"];

export type CredenciaisSalvas = {
  ambiente: EfiAmbiente;
  clientId: string;
  clientSecret: string;
  webhookToken: string;
};

export type CredenciaisResolvidas = CredenciaisSalvas & {
  origem: "SISTEMA" | "AMBIENTE" | "NENHUMA";
};

export type EntradaCredenciais = {
  ambiente: EfiAmbiente;
  clientId?: string | undefined;
  clientSecret?: string | undefined;
  webhookToken?: string | undefined;
};

function chaveMestra(): string {
  for (const nome of NOMES_CHAVE) {
    const bruto = process.env[nome];
    if (typeof bruto === "string" && bruto.trim()) return bruto.trim();
  }
  return process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";
}

async function chaveCripto(): Promise<CryptoKey> {
  const base = chaveMestra();
  if (!base) {
    throw new Error("Chave de criptografia indisponível. Defina EFI_CREDENTIALS_KEY no servidor.");
  }
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`efi-credenciais:${base}`),
  );
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

function bytesParaBase64(bytes: Uint8Array): string {
  let binario = "";
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return btoa(binario);
}

function base64ParaBytes(texto: string): Uint8Array<ArrayBuffer> {
  const binario = atob(texto);
  const bytes = new Uint8Array(new ArrayBuffer(binario.length));
  for (let indice = 0; indice < binario.length; indice += 1) {
    bytes[indice] = binario.charCodeAt(indice);
  }
  return bytes;
}

/** Cifra um segredo. String vazia permanece vazia. */
export async function cifrarSegredo(texto: string): Promise<string> {
  if (!texto) return "";
  const chave = await chaveCripto();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cifrado = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    chave,
    new TextEncoder().encode(texto),
  );
  return `${PREFIXO}.${bytesParaBase64(iv)}.${bytesParaBase64(new Uint8Array(cifrado))}`;
}

/** Decifra um segredo salvo. Valor inválido/chave trocada devolve string vazia. */
export async function decifrarSegredo(valor: string): Promise<string> {
  if (!valor) return "";
  const [versao, ivBase64, dadosBase64] = valor.split(".");
  if (versao !== PREFIXO || !ivBase64 || !dadosBase64) return "";
  try {
    const chave = await chaveCripto();
    const claro = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ParaBytes(ivBase64) },
      chave,
      base64ParaBytes(dadosBase64),
    );
    return new TextDecoder().decode(claro);
  } catch {
    return "";
  }
}

/** Mostra apenas os 4 últimos caracteres, o suficiente para conferência visual. */
export function mascarar(valor: string): string {
  const limpo = (valor ?? "").trim();
  if (!limpo) return "";
  if (limpo.length <= 4) return "•".repeat(limpo.length);
  return `${"•".repeat(Math.min(12, limpo.length - 4))}${limpo.slice(-4)}`;
}

function ambienteValido(valor: string | null | undefined): EfiAmbiente {
  return valor === "PRODUCAO" ? "PRODUCAO" : "HOMOLOGACAO";
}

/** Lê as credenciais salvas pelo usuário (ou null quando não há registro). */
export async function lerCredenciaisSalvas(userId: string): Promise<CredenciaisSalvas | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("efi_credenciais")
    .select("ambiente, client_id, client_secret_cifrado, webhook_token_cifrado")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    ambiente: ambienteValido(data.ambiente),
    clientId: data.client_id ?? "",
    clientSecret: await decifrarSegredo(data.client_secret_cifrado ?? ""),
    webhookToken: await decifrarSegredo(data.webhook_token_cifrado ?? ""),
  };
}

/**
 * Salva as credenciais. Campos omitidos (`undefined`) preservam o valor atual;
 * string vazia limpa o campo.
 */
export async function salvarCredenciaisSalvas(
  userId: string,
  entrada: EntradaCredenciais,
): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: atual } = await supabaseAdmin
    .from("efi_credenciais")
    .select("client_id, client_secret_cifrado, webhook_token_cifrado")
    .eq("user_id", userId)
    .maybeSingle();

  const clientId =
    entrada.clientId !== undefined ? entrada.clientId.trim() : (atual?.client_id ?? "");

  let clientSecretCifrado = atual?.client_secret_cifrado ?? "";
  if (entrada.clientSecret !== undefined) {
    const segredo = entrada.clientSecret.trim();
    clientSecretCifrado = segredo ? await cifrarSegredo(segredo) : "";
  }

  let webhookTokenCifrado = atual?.webhook_token_cifrado ?? "";
  if (entrada.webhookToken !== undefined) {
    const token = entrada.webhookToken.trim();
    webhookTokenCifrado = token ? await cifrarSegredo(token) : "";
  }

  const { error } = await supabaseAdmin.from("efi_credenciais").upsert(
    {
      user_id: userId,
      ambiente: entrada.ambiente,
      client_id: clientId.slice(0, 255),
      client_secret_cifrado: clientSecretCifrado,
      webhook_token_cifrado: webhookTokenCifrado,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error("Não foi possível salvar as credenciais Efí no servidor.");
}

/** Remove as credenciais salvas do usuário (volta a usar as variáveis de ambiente). */
export async function removerCredenciaisSalvas(userId: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("efi_credenciais").delete().eq("user_id", userId);
  if (error) throw new Error("Não foi possível remover as credenciais Efí salvas.");
}

/**
 * Resolve as credenciais em uso: primeiro as salvas no sistema; se estiverem
 * completas, elas vencem. Caso contrário, usa as variáveis de ambiente.
 */
export async function resolverCredenciais(userId: string): Promise<CredenciaisResolvidas> {
  const salvas = await lerCredenciaisSalvas(userId);
  const ambiente = lerCredenciais();
  const tokenAmbiente = tokenWebhook();

  if (salvas && salvas.clientId && salvas.clientSecret) {
    return {
      origem: "SISTEMA",
      ambiente: salvas.ambiente,
      clientId: salvas.clientId,
      clientSecret: salvas.clientSecret,
      webhookToken: salvas.webhookToken || tokenAmbiente,
    };
  }

  const origem = ambiente.clientId && ambiente.clientSecret ? "AMBIENTE" : "NENHUMA";
  return {
    origem,
    ambiente: salvas?.ambiente ?? ambiente.ambiente,
    clientId: ambiente.clientId,
    clientSecret: ambiente.clientSecret,
    webhookToken: tokenAmbiente,
  };
}

/** Comparação em tempo constante (compara digests SHA-256). */
async function iguais(a: string, b: string): Promise<boolean> {
  if (!a || !b) return false;
  const encoder = new TextEncoder();
  const [digestA, digestB] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  const bytesA = new Uint8Array(digestA);
  const bytesB = new Uint8Array(digestB);
  let diferenca = 0;
  for (let indice = 0; indice < bytesA.length; indice += 1) {
    diferenca |= (bytesA[indice] ?? 0) ^ (bytesB[indice] ?? 0);
  }
  return diferenca === 0;
}

/**
 * Descobre de qual usuário é o token do webhook recebido.
 * Aceita o token de ambiente (userId null) e os tokens salvos no sistema.
 */
export async function usuarioDoTokenWebhook(
  tokenRecebido: string,
): Promise<{ valido: boolean; userId: string | null }> {
  const tokenAmbiente = tokenWebhook();
  if (tokenAmbiente && (await iguais(tokenAmbiente, tokenRecebido))) {
    return { valido: true, userId: null };
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("efi_credenciais")
    .select("user_id, webhook_token_cifrado");
  for (const linha of data ?? []) {
    const salvo = await decifrarSegredo(linha.webhook_token_cifrado ?? "");
    if (salvo && (await iguais(salvo, tokenRecebido))) {
      return { valido: true, userId: linha.user_id };
    }
  }
  return { valido: false, userId: null };
}

/** True quando existe algum token de webhook configurado (banco ou ambiente). */
export async function existeTokenWebhookConfigurado(): Promise<boolean> {
  if (tokenWebhook()) return true;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("efi_credenciais")
    .select("webhook_token_cifrado")
    .not("webhook_token_cifrado", "eq", "")
    .limit(1);
  return (data?.length ?? 0) > 0;
}
