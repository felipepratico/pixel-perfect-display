-- Campo de nome do contato responsável pelo cliente.
-- Opcional (nullable), usado no cadastro e edição de clientes.

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS nome_contato TEXT;

COMMENT ON COLUMN public.clientes.nome_contato IS
  'Nome da pessoa de contato responsável pelo cliente (opcional).';
