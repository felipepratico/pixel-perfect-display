ALTER TABLE public.clientes
  ADD COLUMN codigo_site TEXT NOT NULL DEFAULT '' CHECK (char_length(codigo_site) <= 100);

COMMENT ON COLUMN public.clientes.codigo_site IS 'Código de identificação do cliente no site/e-commerce (integração de dados). Opcional.';