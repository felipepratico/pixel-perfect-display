-- Adiciona a coluna nome_contato na tabela titulos caso não exista.
ALTER TABLE public.titulos
  ADD COLUMN IF NOT EXISTS nome_contato TEXT;

-- Força o PostgREST (Supabase API) a atualizar o cache do esquema.
NOTIFY pgrst, 'reload schema';

COMMENT ON COLUMN public.titulos.nome_contato IS 'Nome do contato do cliente para exibição na listagem de titulos.';
