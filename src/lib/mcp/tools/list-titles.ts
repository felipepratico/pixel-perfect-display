import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, mcpUserId } from "../supabase";

export default defineTool({
  name: "listar_titulos",
  title: "Consultar títulos financeiros",
  description: "Consulta títulos não excluídos da conta conectada, filtrando por cliente, situação e mês de referência.",
  inputSchema: {
    cliente_id: z.string().uuid().optional(),
    situacao: z.enum(["ABERTO", "PAGO"]).optional(),
    mes_ano: z.string().max(20).optional().describe("Mês de referência exatamente como cadastrado no financeiro."),
    limite: z.number().int().min(1).max(100).default(25),
    pagina: z.number().int().min(1).max(10000).default(1),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ cliente_id, situacao, mes_ano, limite, pagina }, ctx) => {
    let query = supabaseForUser(ctx).from("titulos")
      .select("id, cliente_id, cliente, mes_ano, vencimento, situacao, mensal_site, pago_em", { count: "exact" })
      .eq("user_id", mcpUserId(ctx)).is("deleted_at", null).order("created_at", { ascending: false }).order("id");
    if (cliente_id) query = query.eq("cliente_id", cliente_id);
    if (situacao) query = query.eq("situacao", situacao);
    if (mes_ano) query = query.eq("mes_ano", mes_ano);
    const { data, count, error } = await query.range((pagina - 1) * limite, pagina * limite - 1).abortSignal(ctx.signal);
    if (error) throw new ToolError("Não foi possível consultar os títulos financeiros.");
    const resultado = { total: count ?? 0, pagina, titulos: (data ?? []).map(t => ({
      id: t.id, cliente_id: t.cliente_id, cliente: t.cliente, mes_ano: t.mes_ano,
      vencimento: t.vencimento, situacao: t.situacao, valor: t.mensal_site, pago_em: t.pago_em,
    })) };
    return { content: [{ type: "text", text: JSON.stringify(resultado) }], structuredContent: resultado };
  },
});
