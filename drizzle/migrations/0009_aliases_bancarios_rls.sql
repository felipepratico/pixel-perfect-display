-- Segurança: protege cliente_aliases_bancarios com RLS por usuário,
-- seguindo o mesmo padrão de cliente_aliases_cnpj.

ALTER TABLE public.cliente_aliases_bancarios
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill: o dono do alias é o dono do cliente vinculado.
UPDATE public.cliente_aliases_bancarios b
SET user_id = c.user_id
FROM public.clientes c
WHERE c.id = b.cliente_id AND b.user_id IS NULL;

-- Linças órfãs sem dono identificável são removidas para permitir a proteção.
DELETE FROM public.cliente_aliases_bancarios WHERE user_id IS NULL;

ALTER TABLE public.cliente_aliases_bancarios
  ALTER COLUMN user_id SET DEFAULT auth.uid(),
  ALTER COLUMN user_id SET NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_aliases_bancarios TO authenticated;
GRANT ALL ON public.cliente_aliases_bancarios TO service_role;

ALTER TABLE public.cliente_aliases_bancarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios gerenciam seus aliases bancarios"
  ON public.cliente_aliases_bancarios
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS cliente_aliases_bancarios_user_idx
  ON public.cliente_aliases_bancarios (user_id);