-- Campo de mensagem do sistema no cadastro de clientes.
-- Permite sinalizar rapidamente o status do cliente no painel (ex: Normal, Bloqueado, Atualização, Cobrança).
-- Valor padrão 'Normal' para não alterar o comportamento de clientes já cadastrados.

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS mensagem_sistema TEXT NOT NULL DEFAULT 'Normal';
