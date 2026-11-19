-- Coluna para marcar clientes que não devem gerar assinatura/cobrança
-- (cadastros vinculados como secundários ou isentos).

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS nao_gerar_assinatura BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.clientes.nao_gerar_assinatura IS
  'Quando true, o cliente é ignorado na geração de títulos/mensalidades e nos KPIs de receita.';

CREATE INDEX IF NOT EXISTS clientes_nao_gerar_assinatura_idx
  ON public.clientes (user_id, nao_gerar_assinatura)
  WHERE deleted_at IS NULL;