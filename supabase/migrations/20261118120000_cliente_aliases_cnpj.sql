-- Tabela de vínculos/aliases de CNPJ por cliente.
-- Permite associar múltiplos CNPJs (matriz/filiais, CNPJs antigos) ao mesmo
-- cadastro principal, para que a conciliação identifique o cliente correto.

CREATE TABLE public.cliente_aliases_cnpj (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  cnpj TEXT NOT NULL CHECK (char_length(cnpj) BETWEEN 1 AND 20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, cnpj)
);

COMMENT ON TABLE public.cliente_aliases_cnpj IS
  'Vínculos de CNPJs secundários ao cadastro principal do cliente (aliases de CNPJ).';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_aliases_cnpj TO authenticated;
GRANT ALL ON public.cliente_aliases_cnpj TO service_role;

ALTER TABLE public.cliente_aliases_cnpj ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios gerenciam seus aliases de CNPJ"
  ON public.cliente_aliases_cnpj
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX cliente_aliases_cnpj_user_idx ON public.cliente_aliases_cnpj (user_id, cnpj);
CREATE INDEX cliente_aliases_cnpj_cliente_idx ON public.cliente_aliases_cnpj (cliente_id);

CREATE TRIGGER update_cliente_aliases_cnpj_updated_at
  BEFORE UPDATE ON public.cliente_aliases_cnpj
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Nome alternativo (compatibilidade) para a mesma estrutura.
CREATE TABLE IF NOT EXISTS public.cliente_cnpj_aliases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  cnpj TEXT NOT NULL CHECK (char_length(cnpj) BETWEEN 1 AND 20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, cnpj)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_cnpj_aliases TO authenticated;
GRANT ALL ON public.cliente_cnpj_aliases TO service_role;

ALTER TABLE public.cliente_cnpj_aliases ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'cliente_cnpj_aliases'
      AND policyname = 'Usuarios gerenciam seus aliases de CNPJ (alt)'
  ) THEN
    CREATE POLICY "Usuarios gerenciam seus aliases de CNPJ (alt)"
      ON public.cliente_cnpj_aliases
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS cliente_cnpj_aliases_user_idx ON public.cliente_cnpj_aliases (user_id, cnpj);
CREATE INDEX IF NOT EXISTS cliente_cnpj_aliases_cliente_idx ON public.cliente_cnpj_aliases (cliente_id);

-- Variação "vínculos" (compatibilidade com o vocabulário do pedido).
CREATE TABLE IF NOT EXISTS public.cliente_vinculos_cnpj (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  cnpj TEXT NOT NULL CHECK (char_length(cnpj) BETWEEN 1 AND 20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, cnpj)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_vinculos_cnpj TO authenticated;
GRANT ALL ON public.cliente_vinculos_cnpj TO service_role;

ALTER TABLE public.cliente_vinculos_cnpj ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'cliente_vinculos_cnpj'
      AND policyname = 'Usuarios gerenciam seus vínculos de CNPJ'
  ) THEN
    CREATE POLICY "Usuarios gerenciam seus vínculos de CNPJ"
      ON public.cliente_vinculos_cnpj
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS cliente_vinculos_cnpj_user_idx ON public.cliente_vinculos_cnpj (user_id, cnpj);
CREATE INDEX IF NOT EXISTS cliente_vinculos_cnpj_cliente_idx ON public.cliente_vinculos_cnpj (cliente_id);