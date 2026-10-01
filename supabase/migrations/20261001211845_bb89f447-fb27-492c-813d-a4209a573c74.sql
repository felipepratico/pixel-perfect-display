CREATE TABLE public.grupos_clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL CHECK (char_length(nome) BETWEEN 1 AND 120),
  observacoes TEXT NOT NULL DEFAULT '' CHECK (char_length(observacoes) <= 2000),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, nome)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupos_clientes TO authenticated;
GRANT ALL ON public.grupos_clientes TO service_role;
ALTER TABLE public.grupos_clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios gerenciam seus grupos" ON public.grupos_clientes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  grupo_id UUID REFERENCES public.grupos_clientes(id) ON DELETE SET NULL,
  razao_social TEXT NOT NULL CHECK (char_length(razao_social) BETWEEN 1 AND 160),
  nome_fantasia TEXT NOT NULL DEFAULT '' CHECK (char_length(nome_fantasia) <= 160),
  cnpj TEXT NOT NULL DEFAULT '' CHECK (char_length(cnpj) <= 20),
  email TEXT NOT NULL DEFAULT '' CHECK (char_length(email) <= 255),
  telefone TEXT NOT NULL DEFAULT '' CHECK (char_length(telefone) <= 20),
  plano TEXT NOT NULL DEFAULT 'BÁSICO' CHECK (plano IN ('BÁSICO', 'COMPLETO')),
  valor_base NUMERIC(12,2) NOT NULL DEFAULT 80 CHECK (valor_base >= 0),
  quantidade_computadores INTEGER NOT NULL DEFAULT 1 CHECK (quantidade_computadores BETWEEN 1 AND 999),
  valor_computador_adicional NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (valor_computador_adicional >= 0),
  modulos TEXT[] NOT NULL DEFAULT ARRAY['PRÁTICO']::TEXT[],
  vencimento INTEGER NOT NULL DEFAULT 5 CHECK (vencimento BETWEEN 1 AND 31),
  rede_vpn TEXT NOT NULL DEFAULT '' CHECK (char_length(rede_vpn) <= 160),
  ultimo_backup DATE,
  versao_instalada TEXT NOT NULL DEFAULT '' CHECK (char_length(versao_instalada) <= 30),
  data_ultima_atualizacao DATE,
  tipo_certificado TEXT NOT NULL DEFAULT '' CHECK (tipo_certificado IN ('', 'A1', 'A3')),
  validade_certificado DATE,
  chave_pix TEXT NOT NULL DEFAULT '' CHECK (char_length(chave_pix) <= 255),
  observacoes TEXT NOT NULL DEFAULT '' CHECK (char_length(observacoes) <= 5000),
  status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO')),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios gerenciam seus clientes" ON public.clientes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.atendimentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  assunto TEXT NOT NULL CHECK (char_length(assunto) BETWEEN 1 AND 160),
  descricao TEXT NOT NULL DEFAULT '' CHECK (char_length(descricao) <= 5000),
  status TEXT NOT NULL DEFAULT 'ABERTO' CHECK (status IN ('ABERTO', 'EM ANDAMENTO', 'CONCLUÍDO')),
  prioridade TEXT NOT NULL DEFAULT 'NORMAL' CHECK (prioridade IN ('BAIXA', 'NORMAL', 'ALTA', 'URGENTE')),
  aberto_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  concluido_em TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.atendimentos TO authenticated;
GRANT ALL ON public.atendimentos TO service_role;
ALTER TABLE public.atendimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios gerenciam seus atendimentos" ON public.atendimentos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.configuracoes_usuario (
  user_id UUID NOT NULL PRIMARY KEY,
  versao_atual TEXT NOT NULL DEFAULT '2026.09' CHECK (char_length(versao_atual) BETWEEN 1 AND 30),
  dias_alerta_backup INTEGER NOT NULL DEFAULT 7 CHECK (dias_alerta_backup BETWEEN 1 AND 365),
  dias_alerta_certificado INTEGER NOT NULL DEFAULT 30 CHECK (dias_alerta_certificado BETWEEN 1 AND 365),
  efi_ambiente TEXT NOT NULL DEFAULT 'HOMOLOGACAO' CHECK (efi_ambiente IN ('HOMOLOGACAO', 'PRODUCAO')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracoes_usuario TO authenticated;
GRANT ALL ON public.configuracoes_usuario TO service_role;
ALTER TABLE public.configuracoes_usuario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios gerenciam suas configuracoes" ON public.configuracoes_usuario FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.cobrancas_efi (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  titulo_id UUID REFERENCES public.titulos(id) ON DELETE SET NULL,
  idempotency_key TEXT NOT NULL CHECK (char_length(idempotency_key) BETWEEN 8 AND 160),
  efi_charge_id BIGINT,
  efi_subscription_id BIGINT,
  status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (char_length(status) <= 40),
  vencimento DATE NOT NULL,
  valor NUMERIC(12,2) NOT NULL CHECK (valor > 0),
  link_pagamento TEXT NOT NULL DEFAULT '' CHECK (char_length(link_pagamento) <= 2000),
  linha_digitavel TEXT NOT NULL DEFAULT '' CHECK (char_length(linha_digitavel) <= 120),
  pix_copia_cola TEXT NOT NULL DEFAULT '' CHECK (char_length(pix_copia_cola) <= 1000),
  payload_referencia JSONB NOT NULL DEFAULT '{}'::JSONB,
  ultimo_erro TEXT NOT NULL DEFAULT '' CHECK (char_length(ultimo_erro) <= 2000),
  pago_em TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cobrancas_efi TO authenticated;
GRANT ALL ON public.cobrancas_efi TO service_role;
ALTER TABLE public.cobrancas_efi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios consultam suas cobrancas Efi" ON public.cobrancas_efi FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Usuarios atualizam suas cobrancas Efi" ON public.cobrancas_efi FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.auditoria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tabela TEXT NOT NULL CHECK (char_length(tabela) <= 80),
  registro_id UUID NOT NULL,
  acao TEXT NOT NULL CHECK (acao IN ('CRIADO', 'ALTERADO', 'EXCLUÍDO', 'RESTAURADO')),
  resumo TEXT NOT NULL DEFAULT '' CHECK (char_length(resumo) <= 300),
  dados_anteriores JSONB,
  dados_novos JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.auditoria TO authenticated;
GRANT ALL ON public.auditoria TO service_role;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios consultam sua auditoria" ON public.auditoria FOR SELECT TO authenticated USING (auth.uid() = user_id);

ALTER TABLE public.titulos
  ADD COLUMN cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  ADD COLUMN deleted_at TIMESTAMPTZ,
  ADD COLUMN efi_status TEXT NOT NULL DEFAULT '',
  ADD COLUMN efi_link_pagamento TEXT NOT NULL DEFAULT '',
  ADD COLUMN efi_linha_digitavel TEXT NOT NULL DEFAULT '',
  ADD COLUMN pago_em TIMESTAMPTZ;

CREATE INDEX clientes_user_active_idx ON public.clientes (user_id, deleted_at, razao_social);
CREATE INDEX clientes_grupo_idx ON public.clientes (grupo_id) WHERE deleted_at IS NULL;
CREATE INDEX titulos_cliente_idx ON public.titulos (cliente_id, deleted_at, mes_ano);
CREATE INDEX atendimentos_cliente_idx ON public.atendimentos (cliente_id, deleted_at, aberto_em DESC);
CREATE INDEX cobrancas_efi_user_status_idx ON public.cobrancas_efi (user_id, status, vencimento);
CREATE INDEX auditoria_user_created_idx ON public.auditoria (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.audit_user_record()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID;
  rid UUID;
  old_data JSONB;
  new_data JSONB;
  action_name TEXT;
  display_name TEXT;
BEGIN
  old_data := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END;
  new_data := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END;
  uid := COALESCE((new_data->>'user_id')::UUID, (old_data->>'user_id')::UUID);
  rid := COALESCE((new_data->>'id')::UUID, (old_data->>'id')::UUID);
  display_name := COALESCE(new_data->>'razao_social', new_data->>'cliente', old_data->>'razao_social', old_data->>'cliente', '');
  IF TG_OP = 'INSERT' THEN
    action_name := 'CRIADO';
  ELSIF TG_OP = 'UPDATE' AND old_data->>'deleted_at' IS NULL AND new_data->>'deleted_at' IS NOT NULL THEN
    action_name := 'EXCLUÍDO';
  ELSIF TG_OP = 'UPDATE' AND old_data->>'deleted_at' IS NOT NULL AND new_data->>'deleted_at' IS NULL THEN
    action_name := 'RESTAURADO';
  ELSE
    action_name := 'ALTERADO';
  END IF;
  INSERT INTO public.auditoria(user_id, tabela, registro_id, acao, resumo, dados_anteriores, dados_novos)
  VALUES (uid, TG_TABLE_NAME, rid, action_name, display_name, old_data, new_data);
  RETURN COALESCE(NEW, OLD);
END;
$$;
REVOKE ALL ON FUNCTION public.audit_user_record() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.audit_user_record() TO service_role;

CREATE TRIGGER update_grupos_clientes_updated_at BEFORE UPDATE ON public.grupos_clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_atendimentos_updated_at BEFORE UPDATE ON public.atendimentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_configuracoes_usuario_updated_at BEFORE UPDATE ON public.configuracoes_usuario FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cobrancas_efi_updated_at BEFORE UPDATE ON public.cobrancas_efi FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER audit_clientes AFTER INSERT OR UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.audit_user_record();
CREATE TRIGGER audit_titulos AFTER INSERT OR UPDATE ON public.titulos FOR EACH ROW EXECUTE FUNCTION public.audit_user_record();
CREATE TRIGGER audit_atendimentos AFTER INSERT OR UPDATE ON public.atendimentos FOR EACH ROW EXECUTE FUNCTION public.audit_user_record();
CREATE TRIGGER audit_cobrancas_efi AFTER INSERT OR UPDATE ON public.cobrancas_efi FOR EACH ROW EXECUTE FUNCTION public.audit_user_record();

INSERT INTO public.clientes (
  user_id, razao_social, cnpj, telefone, valor_base, vencimento, status, created_at, updated_at
)
SELECT
  ranked.user_id,
  ranked.cliente,
  ranked.cnpj,
  ranked.telefone,
  ranked.mensal_site,
  ranked.vencimento,
  CASE WHEN ranked.status_assinatura = 'ATIVO' THEN 'ATIVO' ELSE 'INATIVO' END,
  ranked.created_at,
  now()
FROM (
  SELECT DISTINCT ON (user_id, CASE WHEN regexp_replace(cnpj, '\D', '', 'g') <> '' THEN regexp_replace(cnpj, '\D', '', 'g') ELSE upper(trim(cliente)) END)
    user_id, cliente, cnpj, telefone, mensal_site, vencimento, status_assinatura, created_at
  FROM public.titulos
  ORDER BY user_id, CASE WHEN regexp_replace(cnpj, '\D', '', 'g') <> '' THEN regexp_replace(cnpj, '\D', '', 'g') ELSE upper(trim(cliente)) END, updated_at DESC
) ranked;

UPDATE public.titulos t
SET cliente_id = c.id
FROM public.clientes c
WHERE c.user_id = t.user_id
  AND (
    (regexp_replace(t.cnpj, '\D', '', 'g') <> '' AND regexp_replace(c.cnpj, '\D', '', 'g') = regexp_replace(t.cnpj, '\D', '', 'g'))
    OR
    (regexp_replace(t.cnpj, '\D', '', 'g') = '' AND upper(trim(c.razao_social)) = upper(trim(t.cliente)))
  );