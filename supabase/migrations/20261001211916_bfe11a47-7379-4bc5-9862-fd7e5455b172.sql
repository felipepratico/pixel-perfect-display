REVOKE EXECUTE ON FUNCTION public.audit_user_record() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.audit_user_record() TO service_role;