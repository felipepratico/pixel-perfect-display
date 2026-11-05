-- Auditoria e idempotência das notificações (webhooks) da Efí Bank.
-- Apenas o servidor (service role) grava; o usuário dono da cobrança pode consultar.

CREATE TABLE public.efi_webhook_eventos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  chave TEXT NOT NULL UNIQUE CHECK (char_length(chave) BETWEEN 16 AND 160),
  evento TEXT NOT NULL DEFAULT 'charge' CHECK (char_length(evento) <= 80),
  efi_charge_id BIGINT,
  efi_subscription_id BIGINT,
  status TEXT NOT NULL DEFAULT '' CHECK (char_length(status) <= 40),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processado BOOLEAN NOT NULL DEFAULT false,
  erro TEXT NOT NULL DEFAULT '' CHECK (char_length(erro) <= 1500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX efi_webhook_eventos_charge_idx ON public.efi_webhook_eventos (efi_charge_id);

GRANT SELECT ON public.efi_webhook_eventos TO authenticated;
GRANT ALL ON public.efi_webhook_eventos TO service_role;

ALTER TABLE public.efi_webhook_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios consultam eventos Efi das suas cobrancas"
  ON public.efi_webhook_eventos
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
