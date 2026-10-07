import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "listar_cobrancas_efi",
  title: "Consultar cobranças Efí",
  description: "Consulta o histórico e os status salvos de cobranças Efí da conta conectada, sem emitir ou modificar cobranças.",
  inputSchema: {
    cliente_id: z.string().uuid().optional(),
    status: z.string().trim().min(1).max(50).optional().describe("Status exatamente como salvo no histórico."),
    limite: z.number().int().min(1).max(100).default(25),
    pagina: z.number().int().min(1).max(10000).default(1),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ cliente_id, status, limite, pagina }, ctx) => {
    let query = supabaseForUser(ctx).from("cobrancas_efi")
      .select("id, cliente_id, titulo_id, status, valor, vencimento, efi_charge_id, efi_subscription_id, created_at", { count: "exact" })
      .eq("user_id", ctx.getUserId()).is("deleted_at", null).order("created_at", { ascending: false }).order("id");
    if (cliente_id) query = query.eq("cliente_id", cliente_id);
    if (status) query = query.eq("status", status);
    const { data, count, error } = await query.range((pagina - 1) * limite, pagina * limite - 1).abortSignal(ctx.signal);
    if (error) throw new ToolError("Não foi possível consultar as cobranças Efí.");
    const resultado = { total: count ?? 0, pagina, cobrancas: (data ?? []).map(c => ({
      id: c.id, cliente_id: c.cliente_id, titulo_id: c.titulo_id, status: c.status,
      valor: c.valor, vencimento: c.vencimento, charge_id: c.efi_charge_id,
      subscription_id: c.efi_subscription_id, criado_em: c.created_at,
    })) };
    return { content: [{ type: "text", text: JSON.stringify(resultado) }], structuredContent: resultado };
  },
});
