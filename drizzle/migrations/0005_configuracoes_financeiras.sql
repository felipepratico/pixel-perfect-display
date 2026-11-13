-- Tabela de parametrização global de taxas e regras de cálculo financeiro.
CREATE TABLE IF NOT EXISTS public.configuracoes_financeiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  percentual_repasse_francisco NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  multa_atraso_percentual NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  juros_diario_percentual NUMERIC(5,2) NOT NULL DEFAULT 0.33,
  custo_boleto_padrao NUMERIC(10,2) NOT NULL DEFAULT 3.45,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by TEXT
);

-- Garante que exista apenas uma linha de configuração (singleton).
CREATE UNIQUE INDEX IF NOT EXISTS configuracoes_financeiras_singleton_idx
  ON public.configuracoes_financeiras (percentual_repasse_francisco);

-- Insere a configuração inicial caso a tabela esteja vazia.
INSERT INTO public.configuracoes_financeiras (
  percentual_repasse_francisco,
  multa_atraso_percentual,
  juros_diario_percentual,
  custo_boleto_padrao
)
SELECT 5.00, 5.00, 0.33, 3.45
WHERE NOT EXISTS (SELECT 1 FROM public.configuracoes_financeiras);

-- Colunas de separação de encargos na tabela de lançamentos (titulos).
-- Preserva o histórico de meses anteriores: colunas novas são opcionais.
ALTER TABLE public.titulos
  ADD COLUMN IF NOT EXISTS valor_nominal NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS valor_juros NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_multa NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_total NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS percentual_francisco_aplicado NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS valor_repasse_francisco NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lucro_liquido_felipe NUMERIC(12,2);

-- Comentários de documentação das colunas.
COMMENT ON COLUMN public.configuracoes_financeiras.percentual_repasse_francisco IS 'Percentual de repasse aplicado ao Francisco sobre o valor nominal.';
COMMENT ON COLUMN public.configuracoes_financeiras.multa_atraso_percentual IS 'Percentual de multa por atraso aplicado sobre o valor nominal.';
COMMENT ON COLUMN public.configuracoes_financeiras.juros_diario_percentual IS 'Percentual de juros de mora diário aplicado sobre o valor nominal.';
COMMENT ON COLUMN public.configuracoes_financeiras.custo_boleto_padrao IS 'Custo padrão da tarifa bancária de boleto.';
COMMENT ON COLUMN public.titulos.valor_nominal IS 'Valor base fixo para cálculo do repasse (ignora juros/multa).';
COMMENT ON COLUMN public.titulos.valor_juros IS 'Juros de mora calculados sobre o valor nominal após o vencimento.';
COMMENT ON COLUMN public.titulos.valor_multa IS 'Multa por atraso calculada sobre o valor nominal.';
COMMENT ON COLUMN public.titulos.valor_total IS 'Valor total cobrado: nominal + juros + multa.';
COMMENT ON COLUMN public.titulos.percentual_francisco_aplicado IS 'Percentual do Francisco vigente no momento do lançamento.';
COMMENT ON COLUMN public.titulos.valor_repasse_francisco IS 'Valor repassado ao Francisco: nominal * percentual aplicado / 100.';
COMMENT ON COLUMN public.titulos.lucro_liquido_felipe IS 'Lucro líquido de Felipe: total - repasse Francisco - custo boleto.';
