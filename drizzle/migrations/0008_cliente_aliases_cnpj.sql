-- Tabela de vínculos/aliases de CNPJ por cliente.
CREATE TABLE IF NOT EXISTS public.cliente_aliases_cnpj (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  cnpj TEXT NOT NULL CHECK (char_length(cnpj) BETWEEN 1 AND 20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, cnpj)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_aliases_cnpj TO authenticated;
GRANT ALL ON public.cliente_aliases_cnpj TO service_role;

ALTER TABLE public.cliente_aliases_cnpj ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'cliente_aliases_cnpj'
      AND policyname = 'Usuarios gerenciam seus aliases de CNPJ'
  ) THEN
    CREATE POLICY "Usuarios gerenciam seus aliases de CNPJ"
      ON public.cliente_aliases_cnpj
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;