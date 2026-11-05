-- Campos de controle de pagamento na tabela titulos.
-- dias_atraso é calculado no servidor (ou no cliente ao salvar) e armazenado
-- para permitir relatórios e scores de adimplência sem reprocessamento.

ALTER TABLE public.titulos
  ADD COLUMN IF NOT EXISTS forma_pagamento TEXT CHECK (char_length(forma_pagamento) <= 40),
  ADD COLUMN IF NOT EXISTS dias_atraso INTEGER CHECK (dias_atraso >= 0);

CREATE INDEX IF NOT EXISTS titulos_pago_em_idx ON public.titulos (pago_em) WHERE pago_em IS NOT NULL;
