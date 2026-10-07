import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, mcpUserId } from "../supabase";

export default defineTool({
  name: "listar_clientes",
  title: "Consultar clientes",
  description: "Consulta clientes e contratos não excluídos da conta conectada, com busca e paginação.",
  inputSchema: {
    busca: z.string().trim().max(100).optional().describe("Parte do nome ou CPF/CNPJ."),
    situacao: z.enum(["ATIVO", "INATIVO"]).optional(),
    limite: z.number().int().min(1).max(100).default(25),
    pagina: z.number().int().min(1).max(10000).default(1),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ busca, situacao, limite, pagina }, ctx) => {
    let query = supabaseForUser(ctx).from("clientes")
      .select("id, razao_social, nome_fantasia, cnpj, plano, valor_base, quantidade_computadores, valor_computador_adicional, modulos, vencimento, status", { count: "exact" })
      .eq("user_id", mcpUserId(ctx)).is("deleted_at", null).order("razao_social").order("id");
    if (situacao) query = query.eq("status", situacao);
    if (busca) {
      const safe = busca.replace(/[^\p{L}\p{N}\s.-]/gu, "").trim();
      if (safe) query = query.or(`razao_social.ilike.%${safe}%,nome_fantasia.ilike.%${safe}%,cnpj.ilike.%${safe}%`);
    }
    const { data, count, error } = await query.range((pagina - 1) * limite, pagina * limite - 1).abortSignal(ctx.signal);
    if (error) throw new ToolError("Não foi possível consultar os clientes.");
    const resultado = { total: count ?? 0, pagina, clientes: (data ?? []).map(c => ({
      id: c.id, nome: c.razao_social, nome_fantasia: c.nome_fantasia, documento: c.cnpj,
      plano: c.plano, modulos: c.modulos, dia_vencimento: c.vencimento, situacao: c.status,
      valor_mensal: Number(c.valor_base) + Math.max(0, c.quantidade_computadores - 1) * Number(c.valor_computador_adicional),
    })) };
    return { content: [{ type: "text", text: JSON.stringify(resultado) }], structuredContent: resultado };
  },
});
