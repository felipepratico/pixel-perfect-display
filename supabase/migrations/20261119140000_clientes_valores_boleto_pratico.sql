-- Garante as colunas da composição da mensalidade na tabela clientes.
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS valor_proprio NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_boleto NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_pratico NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Recarrega o schema cache do PostgREST para reconhecer as novas colunas imediatamente.
NOTIFY pgrst, 'reload schema';