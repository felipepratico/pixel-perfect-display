import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assinaturaEfiSchema } from "@/lib/efi";
import type { AssinaturaEfiDados, EfiDiagnostico } from "@/lib/efi";

async function idempotencyKey(parts: string[]): Promise<string> {
  const bytes = new TextEncoder().encode(parts.join("|"));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return `subscription:${Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

/** Monta o corpo enviado à Efí garantindo a serialização correta de PF e PJ. */
function montarPayloadAssinatura(data: AssinaturaEfiDados) {
  const address = {
    street: data.endereco,
    number: data.numeroEndereco,
    neighborhood: data.bairro,
    zipcode: data.cep,
    city: data.cidade,
    state: data.uf,
  };
  const customer =
    data.tipoPessoa === "FISICA"
      ? {
          name: data.nome,
          cpf: data.cpf,
          email: data.email,
          phone_number: data.telefone,
          address,
        }
      : {
          juridical_person: { corporate_name: data.razaoSocial, cnpj: data.cnpj },
          email: data.email,
          phone_number: data.telefone,
          address,
        };
  return {
    items: [{ name: data.itemName, value: Math.round(data.valor * 100), amount: 1 }],
    payment: {
      banking_billet: {
        customer,
        expire_at: data.vencimento,
        message: data.mensagem,
      },
    },
  };
}

/** Situação real da integração (ambiente, credenciais e certificado) para a interface. */
export const statusEfi = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<EfiDiagnostico> => {
    const { diagnosticoEfi } = await import("@/lib/efi-api.server");
    return diagnosticoEfi();
  });

export const emitirAssinaturaEfi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => assinaturaEfiSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: cliente, error: clienteError } = await supabase
      .from("clientes")
      .select("id, status, deleted_at")
      .eq("id", data.clienteId)
      .eq("user_id", userId)
      .maybeSingle();

    if (clienteError || !cliente || cliente.deleted_at || cliente.status !== "ATIVO") {
      throw new Error("Cliente não encontrado ou inativo.");
    }

    const api = await import("@/lib/efi-api.server");
    const credenciais = api.lerCredenciais();
    if (!credenciais.clientId || !credenciais.clientSecret) {
      throw new Error(
        credenciais.sandbox
          ? "Credenciais de homologação da Efí não configuradas. Defina EFI_CLIENT_ID e EFI_CLIENT_SECRET no servidor."
          : "Credenciais de produção da Efí não configuradas. Defina EFI_CLIENT_ID e EFI_CLIENT_SECRET no servidor.",
      );
    }

    const documento = data.tipoPessoa === "FISICA" ? data.cpf : data.cnpj;
    const nomeCliente = data.tipoPessoa === "FISICA" ? data.nome : data.razaoSocial;
    const key = await idempotencyKey([
      userId,
      data.clienteId,
      data.tipoPessoa,
      documento,
      String(data.planId),
      data.vencimento,
    ]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existente, error: existenteError } = await supabaseAdmin
      .from("cobrancas_efi")
      .select("id, status, efi_charge_id, efi_subscription_id, link_pagamento, linha_digitavel")
      .eq("user_id", userId)
      .eq("idempotency_key", key)
      .maybeSingle();
    if (existenteError) throw new Error("Não foi possível verificar emissões anteriores.");
    if (existente && existente.status !== "ERRO") {
      return {
        ok: true as const,
        duplicate: true,
        cobranca: existente,
        ambiente: credenciais.ambiente,
      };
    }

    const { data: titulo } = await supabase
      .from("titulos")
      .select("id")
      .eq("cliente_id", data.clienteId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const snapshot = {
      plan_id: data.planId,
      item_name: data.itemName,
      customer:
        data.tipoPessoa === "FISICA"
          ? { type: "individual", name: data.nome, cpf: data.cpf }
          : { type: "juridical", corporate_name: data.razaoSocial, cnpj: data.cnpj },
      environment: credenciais.ambiente,
    };
    let registroId = existente?.id;
    if (registroId) {
      const { error } = await supabaseAdmin
        .from("cobrancas_efi")
        .update({
          status: "PROCESSANDO",
          ultimo_erro: "",
          valor: data.valor,
          vencimento: data.vencimento,
          titulo_id: titulo?.id ?? null,
          payload_referencia: snapshot,
        })
        .eq("id", registroId)
        .eq("user_id", userId);
      if (error) throw new Error("Não foi possível preparar a nova tentativa.");
    } else {
      const { data: registro, error } = await supabaseAdmin
        .from("cobrancas_efi")
        .insert({
          user_id: userId,
          cliente_id: data.clienteId,
          titulo_id: titulo?.id ?? null,
          idempotency_key: key,
          status: "PROCESSANDO",
          valor: data.valor,
          vencimento: data.vencimento,
          payload_referencia: snapshot,
        })
        .select("id")
        .single();
      if (error || !registro) throw new Error("Não foi possível registrar a emissão.");
      registroId = registro.id;
    }

    let token: string;
    try {
      token = await api.autenticarEfi(credenciais);
    } catch (error) {
      const mensagem =
        error instanceof api.ErroEfi
          ? error.message
          : "Não foi possível autenticar na Efí. Confira as credenciais configuradas.";
      await supabaseAdmin
        .from("cobrancas_efi")
        .update({ status: "ERRO", ultimo_erro: mensagem.slice(0, 1500) })
        .eq("id", registroId);
      throw new Error(mensagem);
    }

    const payload = montarPayloadAssinatura(data);
    let resultado: Awaited<ReturnType<typeof api.criarAssinaturaEfi>>;
    try {
      resultado = await api.criarAssinaturaEfi(credenciais, token, data.planId, payload);
    } catch (error) {
      const mensagem =
        error instanceof api.ErroEfi
          ? error.message
          : `Não foi possível emitir a assinatura na Efí para ${nomeCliente}.`;
      const incerto =
        error instanceof api.ErroEfi && (error.tipo === "incerto" || error.tipo === "comunicacao");
      await supabaseAdmin
        .from("cobrancas_efi")
        .update({
          status: incerto ? "VERIFICAR" : "ERRO",
          ultimo_erro: (incerto ? "Resposta inconclusiva da Efí. " : "") + mensagem.slice(0, 1500),
        })
        .eq("id", registroId);
      throw new Error(
        incerto ? "A Efí não confirmou a emissão. Verifique antes de tentar novamente." : mensagem,
      );
    }

    const { data: cobranca, error: updateError } = await supabaseAdmin
      .from("cobrancas_efi")
      .update({
        efi_subscription_id: resultado.subscriptionId,
        efi_charge_id: resultado.chargeId,
        status: resultado.status,
        link_pagamento: resultado.link,
        linha_digitavel: resultado.linhaDigitavel,
        pix_copia_cola: resultado.pixCopiaECola,
        ultimo_erro: "",
        payload_referencia: {
          ...snapshot,
          subscription_id: resultado.subscriptionId,
          charge_id: resultado.chargeId,
        },
      })
      .eq("id", registroId)
      .eq("user_id", userId)
      .select("id, status, efi_charge_id, efi_subscription_id, link_pagamento, linha_digitavel")
      .single();
    if (updateError || !cobranca) {
      await supabaseAdmin
        .from("cobrancas_efi")
        .update({
          status: "VERIFICAR",
          ultimo_erro: "A assinatura foi emitida, mas o retorno não pôde ser salvo.",
        })
        .eq("id", registroId);
      throw new Error("A assinatura foi emitida, mas o retorno não pôde ser salvo.");
    }

    if (titulo?.id) {
      await supabaseAdmin
        .from("titulos")
        .update({
          efi_status: resultado.status,
          efi_link_pagamento: resultado.link,
          efi_linha_digitavel: resultado.linhaDigitavel,
        })
        .eq("id", titulo.id)
        .eq("user_id", userId);
    }

    return {
      ok: true as const,
      duplicate: false,
      cobranca,
      ambiente: credenciais.ambiente,
    };
  });
