-- Garante que a coluna clientes.mensagem_sistema aceite exatamente os 4 valores
-- permitidos pelo painel (com acentuação): 'Normal', 'Bloqueado', 'Atualização', 'Cobrança'.
-- Remove eventuais CHECK constraints ou enumerações restritivas existentes nesta coluna.

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS mensagem_sistema TEXT NOT NULL DEFAULT 'Normal';

-- Se a coluna não for texto (ex: ENUM), converte preservando os dados.
ALTER TABLE public.clientes
  ALTER COLUMN mensagem_sistema TYPE TEXT USING mensagem_sistema::TEXT;

-- Remove CHECK constraints existentes sobre a coluna (nomes auto-gerados ou customizados).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.clientes'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%mensagem_sistema%'
  LOOP
    EXECUTE format('ALTER TABLE public.clientes DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- Adiciona CHECK constraint aceitando exatamente os valores permitidos (com acentuação).
ALTER TABLE public.clientes
  ADD CONSTRAINT clientes_mensagem_sistema_check
  CHECK (mensagem_sistema IN ('Normal', 'Bloqueado', 'Atualização', 'Cobrança'));

COMMENT ON COLUMN public.clientes.mensagem_sistema IS
  'Mensagem de sinalizacao do sistema no painel. Valores permitidos: Normal, Bloqueado, Atualizacao, Cobrança.';
