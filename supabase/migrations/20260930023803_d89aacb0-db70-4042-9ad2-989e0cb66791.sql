CREATE TABLE public.titulos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users,
  cliente TEXT NOT NULL,
  cnpj TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  mensal_site NUMERIC NOT NULL DEFAULT 0,
  mensal_real NUMERIC NOT NULL DEFAULT 0,
  custo_boleto NUMERIC NOT NULL DEFAULT 0,
  francisco_pct NUMERIC NOT NULL DEFAULT 0,
  vencimento INTEGER NOT NULL DEFAULT 5,
  mes_ano TEXT NOT NULL DEFAULT '',
  tipo_cobranca TEXT NOT NULL DEFAULT 'RECORRENTE',
  status_assinatura TEXT NOT NULL DEFAULT 'ATIVO',
  situacao TEXT NOT NULL DEFAULT 'ABERTO',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.titulos TO authenticated;
GRANT ALL ON public.titulos TO service_role;

ALTER TABLE public.titulos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios gerenciam seus proprios titulos"
ON public.titulos FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX titulos_user_idx ON public.titulos (user_id, mes_ano);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_titulos_updated_at
BEFORE UPDATE ON public.titulos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();