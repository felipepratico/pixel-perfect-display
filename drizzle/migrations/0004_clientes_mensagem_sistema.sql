-- A coluna ainda não existe; adiciona diretamente como TEXT, sem conversão de tipo nem remoção de constraints.
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS mensagem_sistema TEXT NOT NULL DEFAULT 'Normal';

ALTER TABLE public.clientes
  ADD CONSTRAINT clientes_mensagem_sistema_check
  CHECK (mensagem_sistema IN ('Normal', 'Bloqueado', 'Atualização', 'Cobrança'));

COMMENT ON COLUMN public.clientes.mensagem_sistema IS
  'Mensagem de sinalizacao do sistema no painel. Valores permitidos: Normal, Bloqueado, Atualizacao, Cobrança.';