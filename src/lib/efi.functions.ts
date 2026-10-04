import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assinaturaEfiSchema } from "@/lib/efi";

const EFI_SANDBOX_URL = "https://cobrancas-h.api.efipay.com.br";

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function textValue(...values: unknown[]): string {
  const value = values.find((item) => typeof item === "string" && item.length > 0);
  return typeof value === "string" ? value : "";
}

function numberValue(...values: unknown[]): number | null {
  const value = values.find((item) => typeof item === "number" || (typeof item === "string" && /^\d+$/.test(item)));
  if (value === undefined) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

async function idempotencyKey(parts: string[]): Promise<string> {
  const bytes = new TextEncoder().encode(parts.join("|"));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return `subscription:${Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

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

    const clientId = process.env['EFI_CLIENT_ID_HOMOLOGACAO'];
    const clientSecret = process.env['EFI_CLIENT_SECRET_HOMOLOGACAO'];
    if (!clientId || !clientSecret) throw new Error("As credenciais de homologação Efí ainda não estão configuradas.");

    const key = await idempotencyKey([userId, data.clienteId, String(data.planId), data.vencimento]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existente, error: existenteError } = await supabaseAdmin
      .from("cobrancas_efi")
      .select("id, status, efi_charge_id, efi_subscription_id, link_pagamento, linha_digitavel")
      .eq("user_id", userId)
      .eq("idempotency_key", key)
      .maybeSingle();
    if (existenteError) throw new Error("Não foi possível verificar emissões anteriores.");
    if (existente && existente.status !== "ERRO") {
      return { ok: true as const, duplicate: true, cobranca: existente };
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
      customer: { corporate_name: data.razaoSocial, cnpj: data.cnpj },
      environment: "HOMOLOGACAO",
    };
    let registroId = existente?.id;
    if (registroId) {
      const { error } = await supabaseAdmin.from("cobrancas_efi").update({
        status: "PROCESSANDO", ultimo_erro: "", valor: data.valor, vencimento: data.vencimento,
        titulo_id: titulo?.id ?? null, payload_referencia: snapshot,
      }).eq("id", registroId).eq("user_id", userId);
      if (error) throw new Error("Não foi possível preparar a nova tentativa.");
    } else {
      const { data: registro, error } = await supabaseAdmin.from("cobrancas_efi").insert({
        user_id: userId, cliente_id: data.clienteId, titulo_id: titulo?.id ?? null,
        idempotency_key: key, status: "PROCESSANDO", valor: data.valor,
        vencimento: data.vencimento, payload_referencia: snapshot,
      }).select("id").single();
      if (error || !registro) throw new Error("Não foi possível registrar a emissão.");
      registroId = registro.id;
    }

    try {
      const authResponse = await fetch(`${EFI_SANDBOX_URL}/v1/authorize`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ grant_type: "client_credentials" }),
      });
      const authJson: unknown = await authResponse.json().catch(() => ({}));
      const accessToken = textValue(asRecord(authJson).access_token);
      if (!authResponse.ok || !accessToken) {
        await supabaseAdmin.from("cobrancas_efi").update({ status: "ERRO", ultimo_erro: "Falha na autenticação de homologação Efí." }).eq("id", registroId);
        throw new Error("A Efí recusou a autenticação de homologação. Confira as credenciais salvas.");
      }

      const body = {
        items: [{ name: data.itemName, value: Math.round(data.valor * 100), amount: 1 }],
        payment: {
          banking_billet: {
            expire_at: data.vencimento,
            message: data.mensagem,
            customer: {
              juridical_person: { corporate_name: data.razaoSocial, cnpj: data.cnpj },
              email: data.email,
              phone_number: data.telefone,
              address: {
                street: data.endereco, number: data.numeroEndereco, neighborhood: data.bairro,
                zipcode: data.cep, city: data.cidade, state: data.uf,
              },
            },
          },
        },
      };

      let chargeResponse: Response;
      try {
        chargeResponse = await fetch(`${EFI_SANDBOX_URL}/v1/plan/${data.planId}/subscription/one-step`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } catch {
        await supabaseAdmin.from("cobrancas_efi").update({ status: "VERIFICAR", ultimo_erro: "A conexão foi interrompida durante a emissão. Verifique na Efí antes de tentar novamente." }).eq("id", registroId);
        throw new Error("A conexão foi interrompida. Verifique a emissão na Efí antes de tentar novamente.");
      }

      const responseJson: unknown = await chargeResponse.json().catch(() => ({}));
      if (!chargeResponse.ok) {
        const provider = asRecord(responseJson);
        const providerMessage = textValue(provider.message, provider.error_description, provider.error) || "Dados recusados pela Efí.";
        const uncertain = chargeResponse.status >= 500;
        await supabaseAdmin.from("cobrancas_efi").update({
          status: uncertain ? "VERIFICAR" : "ERRO",
          ultimo_erro: (uncertain ? "Resposta inconclusiva da Efí. " : "") + providerMessage.slice(0, 1500),
        }).eq("id", registroId);
        throw new Error(uncertain ? "A Efí não confirmou a emissão. Verifique antes de tentar novamente." : `A Efí não aceitou a assinatura: ${providerMessage}`);
      }

      const root = asRecord(responseJson);
      const responseData = asRecord(root.data ?? root);
      const payment = asRecord(responseData.payment);
      const billet = asRecord(payment.banking_billet ?? responseData.banking_billet);
      const pdf = asRecord(billet.pdf);
      const subscriptionId = numberValue(responseData.subscription_id, root.subscription_id);
      const chargeId = numberValue(responseData.charge_id, root.charge_id, billet.charge_id);
      const link = textValue(billet.link, billet.payment_url, pdf.charge, responseData.link, responseData.payment_url);
      const barcode = textValue(billet.barcode, billet.digitable_line, responseData.barcode, responseData.digitable_line);
      const status = textValue(responseData.status, root.status) || "ATIVO";

      const { data: cobranca, error: updateError } = await supabaseAdmin.from("cobrancas_efi").update({
        efi_subscription_id: subscriptionId,
        efi_charge_id: chargeId,
        status,
        link_pagamento: link,
        linha_digitavel: barcode,
        ultimo_erro: "",
        payload_referencia: { ...snapshot, subscription_id: subscriptionId, charge_id: chargeId },
      }).eq("id", registroId).eq("user_id", userId)
        .select("id, status, efi_charge_id, efi_subscription_id, link_pagamento, linha_digitavel")
        .single();
      if (updateError || !cobranca) throw new Error("A assinatura foi emitida, mas o retorno não pôde ser salvo.");

      if (titulo?.id) {
        await supabaseAdmin.from("titulos").update({
          efi_status: status, efi_link_pagamento: link, efi_linha_digitavel: barcode,
        }).eq("id", titulo.id).eq("user_id", userId);
      }
      return { ok: true as const, duplicate: false, cobranca };
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error("Não foi possível emitir a assinatura na Efí.");
    }
  });