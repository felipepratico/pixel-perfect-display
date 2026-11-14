import { createFileRoute } from "@tanstack/react-router";

import type { Json } from "@/integrations/supabase/types";

/**
 * Webhook de notificações da Efí Bank.
 *
 * A URL deve ser cadastrada no painel da Efí incluindo o token compartilhado,
 * por exemplo: https://seu-dominio/api/efi/webhook?token=SEU_TOKEN
 *
 * Regras de segurança:
 * - exige EFI_WEBHOOK_TOKEN (ou EFI_WEBHOOK_SECRET / EFI_NOTIFICATION_TOKEN)
 *   configurado no servidor; sem token o endpoint responde 503;
 * - compara o token recebido em tempo constante;
 * - processa o evento de forma idempotente (tabela efi_webhook_eventos);
 * - usa a service role apenas no servidor, nunca no bundle do navegador.
 */

type EventoNormalizado = {
  evento: string;
  chargeId: number | null;
  subscriptionId: number | null;
  statusOriginal: string;
  status: string;
  payload: Record<string, unknown>;
};

type ResultadoProcessamento = {
  recebidos: number;
  processados: number;
  ignorados: number;
  erros: number;
};

const MAPA_STATUS: Record<string, string> = {
  new: "PENDENTE",
  waiting: "AGUARDANDO",
  link: "LINK_GERADO",
  paid: "PAGO",
  settled: "PAGO",
  unpaid: "NAO_PAGO",
  canceled: "CANCELADO",
  cancelled: "CANCELADO",
  expired: "EXPIRADO",
  contested: "CONTESTADO",
  refunded: "DEVOLVIDO",
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function tokenRecebido(request: Request, url: URL): string {
  return (
    url.searchParams.get("token") ??
    url.searchParams.get("hmac") ??
    request.headers.get("x-efi-token") ??
    request.headers.get("x-webhook-token") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    ""
  );
}

async function hashChave(partes: string[]): Promise<string> {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(partes.join("|")));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function objeto(valor: unknown): Record<string, unknown> {
  return valor !== null && typeof valor === "object" ? (valor as Record<string, unknown>) : {};
}

function texto(...valores: unknown[]): string {
  const achado = valores.find((item) => typeof item === "string" && item.trim().length > 0);
  return typeof achado === "string" ? achado.trim() : "";
}

function inteiro(...valores: unknown[]): number | null {
  for (const item of valores) {
    if (typeof item === "number" && Number.isSafeInteger(item)) return item;
    if (typeof item === "string" && /^\d+$/.test(item)) {
      const convertido = Number(item);
      if (Number.isSafeInteger(convertido)) return convertido;
    }
  }
  return null;
}

function normalizarStatus(bruto: string): string {
  const chave = bruto.trim().toLowerCase();
  return MAPA_STATUS[chave] ?? bruto.trim().toUpperCase().slice(0, 40);
}

/** Lê o status mesmo quando a Efí envia um objeto { current, previous }. */
function statusDe(obj: Record<string, unknown>): string {
  const bruto = obj["status"];
  if (bruto !== null && typeof bruto === "object") {
    const interno = bruto as Record<string, unknown>;
    return texto(interno["current"], interno["atual"], interno["situacao"]);
  }
  return texto(bruto, obj["situacao"], obj["payment_status"]);
}

/**
 * Percorre o payload da Efí coletando objetos que tenham identificador de
 * cobrança e status. Tolera os formatos de boleto, Pix e assinatura, além de
 * arrays de eventos.
 */
function coletarEventos(payload: unknown): EventoNormalizado[] {
  const eventos: EventoNormalizado[] = [];
  const vistos = new Set<string>();

  const visitar = (no: unknown): void => {
    if (Array.isArray(no)) {
      no.forEach(visitar);
      return;
    }
    if (no === null || typeof no !== "object") return;
    const obj = no as Record<string, unknown>;

    const chargeId = inteiro(obj["charge_id"], obj["chargeId"], obj["id"], obj["codigo"]);
    const statusOriginal = statusDe(obj);
    if (chargeId !== null && statusOriginal) {
      const evento = texto(obj["event"], obj["evento"]) || "charge";
      const status = normalizarStatus(statusOriginal);
      const chave = `${evento}|${chargeId}|${status}`;
      if (!vistos.has(chave)) {
        vistos.add(chave);
        eventos.push({
          evento,
          chargeId,
          subscriptionId: inteiro(obj["subscription_id"], obj["subscriptionId"]),
          statusOriginal,
          status,
          payload: obj,
        });
      }
    }

    for (const valor of Object.values(obj)) visitar(valor);
  };

  visitar(payload);
  return eventos;
}

async function processar(request: Request, url: URL): Promise<Response> {
  const { existeTokenWebhookConfigurado, usuarioDoTokenWebhook } =
    await import("@/lib/efi-credenciais.server");

  if (!(await existeTokenWebhookConfigurado())) {
    return json(
      {
        ok: false,
        erro: "Webhook não configurado. Cadastre o token na tela de Cobranças Efí.",
      },
      503,
    );
  }

  const autenticacao = await usuarioDoTokenWebhook(tokenRecebido(request, url));
  if (!autenticacao.valido) {
    return json({ ok: false, erro: "Token inválido." }, 401);
  }
  const usuarioDoToken = autenticacao.userId;

  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return json({ ok: false, erro: "Corpo JSON inválido." }, 400);
  }

  let eventos = coletarEventos(corpo);

  // Formato clássico: a Efí envia apenas {"notification":"<token>"} e o
  // detalhe precisa ser consultado na API. Buscamos os eventos nesse caso.
  if (eventos.length === 0) {
    const raiz = objeto(corpo);
    const tokenNotificacao = texto(raiz["notification"], raiz["notification_token"]);
    if (tokenNotificacao) {
      try {
        const { consultarNotificacaoEfi } = await import("@/lib/efi-api.server");
        eventos = coletarEventos(await consultarNotificacaoEfi(tokenNotificacao));
      } catch (erro) {
        console.error("[efi-webhook] falha ao consultar notificação", erro);
        return json({ ok: false, erro: "Não foi possível consultar a notificação na Efí." }, 502);
      }
    }
  }

  const resultado: ResultadoProcessamento = {
    recebidos: eventos.length,
    processados: 0,
    ignorados: 0,
    erros: 0,
  };
  if (eventos.length === 0) return json({ ok: true, ...resultado });

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  for (const evento of eventos) {
    const chave = await hashChave([
      evento.evento,
      String(evento.chargeId ?? ""),
      evento.status,
      evento.statusOriginal.toLowerCase(),
    ]);

    let consulta = supabaseAdmin
      .from("cobrancas_efi")
      .select("id, user_id, titulo_id, status")
      .eq("efi_charge_id", evento.chargeId as number)
      .is("deleted_at", null);
    if (usuarioDoToken) consulta = consulta.eq("user_id", usuarioDoToken);
    const { data: cobranca, error: cobrancaError } = await consulta.maybeSingle();

    if (cobrancaError) {
      resultado.erros += 1;
      continue;
    }

    const { error: registroError } = await supabaseAdmin.from("efi_webhook_eventos").insert({
      user_id: cobranca?.user_id ?? null,
      chave,
      evento: evento.evento.slice(0, 80),
      efi_charge_id: evento.chargeId,
      efi_subscription_id: evento.subscriptionId,
      status: evento.status,
      payload: evento.payload as unknown as Json,
      processado: false,
    });

    // 23505 = chave duplicada: notificação repetida, nada a fazer.
    if (registroError) {
      if (registroError.code === "23505") {
        resultado.ignorados += 1;
      } else {
        resultado.erros += 1;
      }
      continue;
    }

    if (!cobranca) {
      // Evento registrado para auditoria, mas sem cobrança vinculada neste app.
      resultado.ignorados += 1;
      continue;
    }

    const { error: updateError } = await supabaseAdmin
      .from("cobrancas_efi")
      .update({
        status: evento.status,
        ...(evento.status === "PAGO" ? { pago_em: new Date().toISOString() } : {}),
        ultimo_erro: "",
      })
      .eq("id", cobranca.id);

    if (updateError) {
      resultado.erros += 1;
      await supabaseAdmin
        .from("efi_webhook_eventos")
        .update({ erro: updateError.message.slice(0, 1500) })
        .eq("chave", chave);
      continue;
    }

    if (cobranca.titulo_id) {
      await supabaseAdmin
        .from("titulos")
        .update({
          efi_status: evento.status,
          ...(evento.status === "PAGO"
            ? { situacao: "PAGO", pago_em: new Date().toISOString() }
            : {}),
        })
        .eq("id", cobranca.titulo_id)
        .eq("user_id", cobranca.user_id);
    }

    await supabaseAdmin.from("efi_webhook_eventos").update({ processado: true }).eq("chave", chave);

    resultado.processados += 1;
  }

  return json({ ok: true, ...resultado });
}

export const Route = createFileRoute("/api/efi/webhook")({
  server: {
    handlers: {
      GET: async () => {
        const { existeTokenWebhookConfigurado } = await import("@/lib/efi-credenciais.server");
        return json({
          ok: true,
          endpoint: "efi-webhook",
          configurado: await existeTokenWebhookConfigurado(),
        });
      },
      POST: async ({ request }) => {
        const url = new URL(request.url);
        try {
          return await processar(request, url);
        } catch (erro) {
          console.error("[efi-webhook]", erro);
          return json({ ok: false, erro: "Falha ao processar a notificação." }, 500);
        }
      },
    },
  },
});
