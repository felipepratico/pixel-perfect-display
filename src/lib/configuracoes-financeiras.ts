import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type ConfiguracoesFinanceiras = {
  id: string;
  percentual_repasse_francisco: number;
  multa_atraso_percentual: number;
  juros_diario_percentual: number;
  custo_boleto_padrao: number;
  updated_at: string;
  updated_by: string | null;
};

export type ConfiguracoesFinanceirasInput = {
  percentual_repasse_francisco?: number;
  multa_atraso_percentual?: number;
  juros_diario_percentual?: number;
  custo_boleto_padrao?: number;
  updated_by?: string;
};

const TABLE = "configuracoes_financeiras";

export async function buscarConfiguracaoFinanceira(): Promise<ConfiguracoesFinanceiras | null> {
  const { data, error } = await sb
    .from(TABLE)
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar configuração financeira:", error);
    return null;
  }

  return (data ?? null) as ConfiguracoesFinanceiras | null;
}

export async function salvarConfiguracaoFinanceira(
  valores: ConfiguracoesFinanceirasInput,
): Promise<ConfiguracoesFinanceiras | null> {
  // Garante que a linha pertence ao usuário autenticado (necessário com RLS ativo).
  const { data: authData } = await sb.auth.getUser();
  const userId = authData?.user?.id ?? null;

  const existente = await buscarConfiguracaoFinanceira();

  const payload: Record<string, unknown> = {
    ...valores,
    updated_at: new Date().toISOString(),
  };
  if (userId) payload["user_id"] = userId;

  if (existente) {
    const { data, error } = await sb
      .from(TABLE)
      .update(payload)
      .eq("id", existente.id)
      .select()
      .single();

    if (error) {
      console.error("Erro ao atualizar configuração financeira:", error);
      return null;
    }

    return data as ConfiguracoesFinanceiras;
  }

  const { data, error } = await sb.from(TABLE).insert(payload).select().single();

  if (error) {
    console.error("Erro ao inserir configuração financeira:", error);
    return null;
  }

  return data as ConfiguracoesFinanceiras;
}

/**
 * Calcula os encargos de um título vencido com base nas configurações globais.
 * - Multa: percentual sobre o valor nominal.
 * - Juros: percentual diário sobre o valor nominal * dias de atraso.
 * - Repasse Francisco: percentual sobre o valor nominal (ignora juros/multa).
 * - Lucro Felipe: valor_total - repasse - custo boleto.
 */
export function calcularEncargosTitulo({
  valorNominal,
  diasAtraso,
  config,
}: {
  valorNominal: number;
  diasAtraso: number;
  config: ConfiguracoesFinanceiras;
}) {
  const multa = (valorNominal * config.multa_atraso_percentual) / 100;
  const juros = (valorNominal * config.juros_diario_percentual * diasAtraso) / 100;
  const valorTotal = valorNominal + multa + juros;
  const repasseFrancisco = (valorNominal * config.percentual_repasse_francisco) / 100;
  const lucroLiquidoFelipe = valorTotal - repasseFrancisco - config.custo_boleto_padrao;

  return {
    valorNominal,
    valorMulta: multa,
    valorJuros: juros,
    valorTotal,
    percentualFranciscoAplicado: config.percentual_repasse_francisco,
    valorRepasseFrancisco: repasseFrancisco,
    lucroLiquidoFelipe,
  };
}
