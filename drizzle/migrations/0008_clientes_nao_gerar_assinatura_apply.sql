ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS nao_gerar_assinatura BOOLEAN NOT NULL DEFAULT false;