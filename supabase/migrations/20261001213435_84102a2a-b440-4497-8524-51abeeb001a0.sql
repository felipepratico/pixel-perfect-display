ALTER TABLE public.clientes
  ADD COLUMN endereco TEXT NOT NULL DEFAULT '' CHECK (char_length(endereco) <= 180),
  ADD COLUMN numero_endereco TEXT NOT NULL DEFAULT '' CHECK (char_length(numero_endereco) <= 30),
  ADD COLUMN bairro TEXT NOT NULL DEFAULT '' CHECK (char_length(bairro) <= 100),
  ADD COLUMN cep TEXT NOT NULL DEFAULT '' CHECK (char_length(cep) <= 12),
  ADD COLUMN cidade TEXT NOT NULL DEFAULT '' CHECK (char_length(cidade) <= 100),
  ADD COLUMN uf TEXT NOT NULL DEFAULT '' CHECK (char_length(uf) <= 2);