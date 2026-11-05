-- Credenciais da Efí cadastradas pelo próprio usuário no sistema (confidenciais).
--
-- Segurança:
-- - client_secret e webhook_token são gravados CIFRADOS (AES-256-GCM) pelo servidor;
-- - a tabela NÃO concede acesso a `authenticated`: apenas a service role (servidor)
--   lê/grava, portanto o navegador nunca recebe o segredo;
-- - a interface exibe apenas valores mascarados/booleanos.

CREATE TABLE public.efi_credenciais (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ambiente TEXT NOT NULL DEFAULT 'HOMOLOGACAO' CHECK (ambiente IN ('HOMOLOGACAO', 'PRODUCAO')),
  client_id TEXT NOT NULL DEFAULT '' CHECK (char_length(client_id) <= 255),
  client_secret_cifrado TEXT NOT NULL DEFAULT '' CHECK (char_length(client_secret_cifrado) <= 4000),
  webhook_token_cifrado TEXT NOT NULL DEFAULT '' CHECK (char_length(webhook_token_cifrado) <= 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.efi_credenciais TO service_role;

ALTER TABLE public.efi_credenciais ENABLE ROW LEVEL SECURITY;

-- Nenhuma policy é criada de propósito: somente a service role acessa.