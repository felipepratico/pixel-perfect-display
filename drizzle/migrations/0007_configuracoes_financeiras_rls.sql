ALTER TABLE public.configuracoes_financeiras
  ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT auth.uid();

UPDATE public.configuracoes_financeiras
SET user_id = (SELECT user_id FROM public.titulos ORDER BY created_at LIMIT 1)
WHERE user_id IS NULL;

DROP INDEX IF EXISTS public.configuracoes_financeiras_singleton_idx;
CREATE UNIQUE INDEX IF NOT EXISTS configuracoes_financeiras_user_idx
  ON public.configuracoes_financeiras (user_id);

REVOKE ALL ON public.configuracoes_financeiras FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.configuracoes_financeiras TO authenticated;
GRANT ALL ON public.configuracoes_financeiras TO service_role;

ALTER TABLE public.configuracoes_financeiras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios consultam suas configuracoes financeiras"
  ON public.configuracoes_financeiras FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Usuarios criam suas configuracoes financeiras"
  ON public.configuracoes_financeiras FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuarios atualizam suas configuracoes financeiras"
  ON public.configuracoes_financeiras FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);