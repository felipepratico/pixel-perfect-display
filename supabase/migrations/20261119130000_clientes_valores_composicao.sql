-- Separa valores da composição da mensalidade (boleto vs. Prático).
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS valor_proprio NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_boleto NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_pratico NUMERIC(12,2) NOT NULL DEFAULT 0;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;