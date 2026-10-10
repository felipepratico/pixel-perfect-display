import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { DiagnosticoGemini, MensagemCobrancaGemini, TomCobranca } from "./gemini";

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-1.5-flash"];

async function chamarGemini(prompt: string, apiKey?: string): Promise<string> {
  const key = apiKey?.trim() || process.env['GEMINI_API_KEY'];
  if (!key) {
    throw new Error("Chave de API do Gemini não configurada.");
  }

  let ultimoErro: Error | null = null;
  for (const model of GEMINI_MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 2048,
            },
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(`Erro API Gemini (${model}): ${response.status} - ${errorText.slice(0, 300)}`);
      }

      const data = await response.json();
      const candidateText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof candidateText === "string" && candidateText.trim().length > 0) {
        return candidateText;
      }
    } catch (err) {
      ultimoErro = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw ultimoErro ?? new Error("Não foi possível obter resposta do Gemini.");
}

export const analisarFinanceiroGemini = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        titulosVencidos: z.array(
          z.object({
            id: z.string(),
            cliente: z.string(),
            cnpj: z.string().default(""),
            telefone: z.string().default(""),
            mensal_site: z.number(),
            vencimento: z.number(),
            mes_ano: z.string(),
            diasAtraso: z.number(),
          }),
        ),
        totalAberto: z.number(),
        totalPago: z.number(),
        userApiKey: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<DiagnosticoGemini> => {
    const { titulosVencidos, totalAberto, totalPago, userApiKey } = data;
    const totalVencido = titulosVencidos.reduce((acc, t) => acc + t.mensal_site, 0);
    const taxaInadimplencia =
      totalAberto + totalPago > 0
        ? ((totalVencido / (totalAberto + totalPago)) * 100).toFixed(1)
        : "0.0";

    const prompt = `Você é um CFO experiente e especialista em recuperação de créditos de software e serviços recorrentes (SaaS / ERP).
Analise os seguintes dados financeiros do sistema UPSYSTEM FINCONTROL:
- Total em aberto: R$ ${totalAberto.toFixed(2)}
- Total pago no período: R$ ${totalPago.toFixed(2)}
- Total vencido/atrasado: R$ ${totalVencido.toFixed(2)}
- Quantidade de títulos vencidos: ${titulosVencidos.length}
- Clientes com boletos vencidos:
${titulosVencidos
  .slice(0, 15)
  .map(
    (t) =>
      `  * Cliente: ${t.cliente} | Atraso: ${t.diasAtraso} dias | Valor: R$ ${t.mensal_site.toFixed(2)} | Vencimento original: Dia ${t.vencimento} (${t.mes_ano})`,
  )
  .join("\n")}

Retorne EXCLUSIVAMENTE um objeto JSON válido (sem tags markdown de bloco triplo como \`\`\`json, apenas o JSON puro) com a seguinte estrutura:
{
  "resumoGeral": "texto curto e direto resumindo o impacto financeiro no caixa",
  "indiceInadimplencia": "${taxaInadimplencia}%",
  "valorTotalEmRisco": ${totalVencido},
  "nivelRisco": "BAIXO" | "MODERADO" | "CRÍTICO",
  "acoesRecomendadas": ["Ação prática 1", "Ação prática 2", "Ação prática 3"],
  "clientesPrioritarios": [
    {
      "cliente": "Nome do cliente",
      "diasAtraso": número,
      "valor": número,
      "recomendacaoAcao": "Estratégia específica recomendada para cobrar este cliente"
    }
  ],
  "conclusaoEstrategica": "orientação estratégica final para a gestão"
}`;

    try {
      const rawResponse = await chamarGemini(prompt, userApiKey);
      const cleanJson = rawResponse
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      const parsed = JSON.parse(cleanJson) as DiagnosticoGemini;
      return parsed;
    } catch {
      // Heuristic fallback so it never fails even without API key configured
      const nivelRisco: DiagnosticoGemini["nivelRisco"] =
        titulosVencidos.length === 0
          ? "BAIXO"
          : totalVencido > 500 || titulosVencidos.some((t) => t.diasAtraso > 30)
          ? "CRÍTICO"
          : "MODERADO";

      return {
        resumoGeral:
          titulosVencidos.length > 0
            ? `Identificamos ${titulosVencidos.length} título(s) em atraso totalizando R$ ${totalVencido.toFixed(2)}. A taxa calculada de inadimplência sobre a carteira é de ${taxaInadimplencia}%. Recomenda-se acionamento preventivo imediato para evitar acúmulo de ciclos.`
            : "Excelente! Nenhum título em atraso no período atual. A saúde do fluxo de caixa está preservada e com 100% de pontualidade.",
        indiceInadimplencia: `${taxaInadimplencia}%`,
        valorTotalEmRisco: totalVencido,
        nivelRisco,
        acoesRecomendadas:
          titulosVencidos.length > 0
            ? [
                "Priorizar clientes com atraso superior a 15 dias para envio de aviso de suspensão temporária.",
                "Disponibilizar Pix Copia-e-Cola direto no WhatsApp para facilitar a quitação imediata sem emissão de novo boleto.",
                "Estabelecer rotina de régua de cobrança automática: lembrete 2 dias antes e no dia do vencimento.",
              ]
            : [
                "Manter envio de lembretes amigáveis de vencimento com 3 dias de antecedência.",
                "Estimular migração para cobrança recorrente via Pix e boleto automático da Efí.",
              ],
        clientesPrioritarios: titulosVencidos
          .sort((a, b) => b.diasAtraso * b.mensal_site - a.diasAtraso * a.mensal_site)
          .slice(0, 5)
          .map((t) => ({
            cliente: t.cliente,
            diasAtraso: t.diasAtraso,
            valor: t.mensal_site,
            recomendacaoAcao:
              t.diasAtraso > 20
                ? "Cobrança com aviso formal de bloqueio de emissão de NF-e e suporte técnico."
                : "Envio de lembrete cordial via WhatsApp com opção de pagamento rápido via Pix.",
          })),
        conclusaoEstrategica:
          titulosVencidos.length > 0
            ? "A recuperação rápida de títulos vencidos é essencial para proteger a margem de lucro e os repasses operacionais da UPSYSTEM."
            : "Fluxo de cobrança opera em conformidade ideal.",
      };
    }
  });

export const gerarCobrancaGemini = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        cliente: z.string(),
        cnpj: z.string().default(""),
        telefone: z.string().default(""),
        valor: z.number(),
        vencimento: z.string(),
        diasAtraso: z.number(),
        tom: z.enum(["AMIGAVEL", "FORMAL", "URGENTE_SUSPENSAO", "RENEGOCIACAO"]),
        chavePix: z.string().optional(),
        linkPagamento: z.string().optional(),
        userApiKey: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<MensagemCobrancaGemini> => {
    const {
      cliente,
      valor,
      vencimento,
      diasAtraso,
      tom,
      chavePix,
      linkPagamento,
      userApiKey,
    } = data;

    const instrucoesTom: Record<TomCobranca, string> = {
      AMIGAVEL:
        "Tom amigável, acolhedor e educado. Trate como um simples esquecimento de rotina. Emojis leves, sem ameaças de bloqueio.",
      FORMAL:
        "Tom formal, administrativo e respeitoso. Notificação clara de pendência financeira e solicitação de envio do comprovante.",
      URGENTE_SUSPENSAO:
        "Tom firme e urgente. Alerte com seriedade que, devido aos dias em atraso, os serviços de suporte, atualizações e emissão de notas do software podem ser suspensos em 24h caso não haja regularização.",
      RENEGOCIACAO:
        "Tom conciliador e comercial. Ofereça facilidade de pagamento imediato via Pix ou renegociação para quitar sem encargos adicionais.",
    };

    const prompt = `Você é um assistente de comunicação financeira profissional da UPSYSTEM FINCONTROL.
Crie uma mensagem de cobrança sob medida para o seguinte cliente:
- Nome/Razão Social: ${cliente}
- Valor em aberto: R$ ${valor.toFixed(2)}
- Vencimento original: ${vencimento}
- Dias de atraso: ${diasAtraso} dia(s)
- Chave Pix disponível: ${chavePix || "Não informada"}
- Link do boleto/pagamento: ${linkPagamento || "Não informado"}
- Tom exigido: ${instrucoesTom[tom]}

Retorne EXCLUSIVAMENTE um objeto JSON válido (sem delimitadores markdown, apenas o JSON puro) com a seguinte estrutura:
{
  "textoWhatsapp": "Texto completo pronto para WhatsApp, usando negrito com asteriscos (*texto*), quebras de linha e emojis bem posicionados",
  "assuntoEmail": "Assunto conciso e chamativo para o e-mail",
  "textoEmail": "Corpo formal completo do e-mail de cobrança",
  "dicaNegociacao": "Dica estratégica de 1 frase para o operador humano fechar o acordo caso o cliente responda questionando"
}`;

    try {
      const rawResponse = await chamarGemini(prompt, userApiKey);
      const cleanJson = rawResponse
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      const parsed = JSON.parse(cleanJson) as MensagemCobrancaGemini;
      return parsed;
    } catch {
      // Heuristic fallback matching the requested tone
      const pixText = chavePix ? `\n🔑 *Chave Pix para quitação:* ${chavePix}` : "";
      const linkText = linkPagamento ? `\n🔗 *Link do Boleto:* ${linkPagamento}` : "";

      if (tom === "URGENTE_SUSPENSAO") {
        return {
          textoWhatsapp: `⚠️ *COMUNICADO IMPORTANTE — UPSYSTEM FINCONTROL*\n\nOlá, *${cliente}*!\n\nConstatamos que a mensalidade do sistema com vencimento em *${vencimento}* (há *${diasAtraso} dias*) no valor de *R$ ${valor.toFixed(2)}* permanece em aberto.\n\nPara evitar a *interrupção dos serviços de suporte e emissão*, solicitamos a regularização nas próximas 24 horas.${pixText}${linkText}\n\nCaso o pagamento já tenha sido realizado, por favor nos envie o comprovante. Obrigado!`,
          assuntoEmail: `[URGENTE] Aviso de Suspensão de Serviços — ${cliente}`,
          textoEmail: `Prezado(a) ${cliente},\n\nInformamos que seu contrato apresenta pendência financeira referente à fatura vencida em ${vencimento} no valor de R$ ${valor.toFixed(2)} (${diasAtraso} dias de atraso).\n\nPara evitar o bloqueio preventivo de acessos, atualizações e suporte técnico, solicitamos a liquidação imediata.\n\nAtenciosamente,\nFinanceiro UPSYSTEM`,
          dicaNegociacao: "Se o cliente alegar fluxo de caixa apertado, ofereça parcelar a pendência na próxima fatura garantindo o pagamento de 50% via Pix agora.",
        };
      }

      if (tom === "RENEGOCIACAO") {
        return {
          textoWhatsapp: `🤝 *PROPOSTA DE ACORDO — UPSYSTEM FINCONTROL*\n\nOlá, *${cliente}*! Tudo bem?\n\nQueremos te ajudar a manter sua mensalidade em dia. Identificamos a pendência de *R$ ${valor.toFixed(2)}* vencida em *${vencimento}*.\n\nPodemos isentar eventuais juros se quitarmos via Pix hoje mesmo:${pixText}${linkText}\n\nPodemos confirmar essa condição especial para você?`,
          assuntoEmail: `Proposta de Regularização Financeira — ${cliente}`,
          textoEmail: `Olá ${cliente},\n\nEstamos entrando em contato para apresentar condições facilitadas de regularização referente ao título vencido em ${vencimento} no valor de R$ ${valor.toFixed(2)}.\n\nFicamos no aguardo do seu retorno para formalizar a quitação sem burocracia.\n\nAtenciosamente,\nUPSYSTEM FINCONTROL`,
          dicaNegociacao: "Reforce que quitar hoje evita qualquer impacto na operação contábil e fiscal da empresa dele.",
        };
      }

      if (tom === "FORMAL") {
        return {
          textoWhatsapp: `📄 *NOTIFICAÇÃO FINANCEIRA — UPSYSTEM*\n\nPrezado(a) *${cliente}*,\n\nIdentificamos em nosso sistema financeiro a pendência referente à mensalidade do software:\n📌 *Valor:* R$ ${valor.toFixed(2)}\n📅 *Vencimento:* ${vencimento} (*${diasAtraso} dias em aberto*)${pixText}${linkText}\n\nSolicitamos a gentileza de nos encaminhar o comprovante de liquidação assim que possível.\n\nAtenciosamente,\nEquipe Financeira`,
          assuntoEmail: `Notificação de Vencimento de Título — ${cliente}`,
          textoEmail: `Prezado(a) ${cliente},\n\nSegue notificação referente ao título financeiro com vencimento em ${vencimento} no valor de R$ ${valor.toFixed(2)}.\n\nSolicitamos a quitação para atualização dos registros contábeis.\n\nAtenciosamente,\nUPSYSTEM FINCONTROL`,
          dicaNegociacao: "Pergunte diretamente se o boleto foi encaminhado para o departamento fiscal/contábil responsável.",
        };
      }

      return {
        textoWhatsapp: `Olá, *${cliente}*! Tudo bem? 😊\n\nPassando apenas para um breve lembrete da mensalidade do sistema no valor de *R$ ${valor.toFixed(2)}*, que venceu em *${vencimento}*.\n\nSe ainda não tiver recebido o boleto, seguem os dados para facilidade:${pixText}${linkText}\n\nSe já tiver realizado o pagamento, pode desconsiderar esta mensagem. Tenha um ótimo dia!`,
        assuntoEmail: `Lembrete de Mensalidade — ${cliente}`,
        textoEmail: `Olá ${cliente},\n\nEsperamos que esteja tudo bem.\n\nEste é um lembrete de cortesia referente à sua mensalidade com vencimento em ${vencimento} no valor de R$ ${valor.toFixed(2)}.\n\nQualquer dúvida estamos à inteira disposição.\n\nAtenciosamente,\nUPSYSTEM FINCONTROL`,
        dicaNegociacao: "Mantenha o tom cordial para preservar o relacionamento comercial positivo.",
      };
    }
  });
