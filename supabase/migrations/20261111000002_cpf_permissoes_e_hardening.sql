-- ================================================================================
-- Migration: 20261111000002_cpf_permissoes_e_hardening.sql
-- Descrição: Revoga privilégios indevidos de EXECUTE em cpf_encrypt, cpf_decrypt e
--            em funções internas de trigger de PUBLIC, anon e authenticated.
--            Concede exclusivamente a service_role.
-- ================================================================================

BEGIN;

-- 1. Cifragem de CPF (restrita a service_role)
REVOKE ALL ON FUNCTION public.cpf_encrypt(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cpf_decrypt(TEXT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.cpf_encrypt(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.cpf_decrypt(TEXT) TO service_role;

-- 2. Funções internas de trigger (não devem ser invocáveis via RPC pelo PostgREST)
REVOKE ALL ON FUNCTION public.protect_user_profiles_privileges() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.protect_user_profiles_privileges() TO service_role;

REVOKE ALL ON FUNCTION public.protect_clinica_billing_fields() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.protect_clinica_billing_fields() TO service_role;

REVOKE ALL ON FUNCTION public.set_clinica_id() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_clinica_id() TO service_role;

REVOKE ALL ON FUNCTION public.bloquear_delete_prontuario() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bloquear_delete_prontuario() TO service_role;

REVOKE ALL ON FUNCTION public.bloquear_delete_evolucao() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bloquear_delete_evolucao() TO service_role;

REVOKE ALL ON FUNCTION public.bloquear_update_prontuario_finalizado() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bloquear_update_prontuario_finalizado() TO service_role;

REVOKE ALL ON FUNCTION public.fn_encrypt_cpf() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_encrypt_cpf() TO service_role;

REVOKE ALL ON FUNCTION public.audit_storage_evidence_deletion() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.audit_storage_evidence_deletion() TO service_role;

REVOKE ALL ON FUNCTION public.check_tenant_billing_status() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_tenant_billing_status() TO service_role;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

DO $$
BEGIN
  IF to_regprocedure('private.fn_audit_trigger()') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION private.fn_audit_trigger() FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION private.fn_audit_trigger() TO service_role';
  END IF;
END $$;

-- 3. Garantir existência de cpf_key em private.secrets (reprodução estrita mesmo com --no-seed)
INSERT INTO private.secrets (key, value)
SELECT
    'cpf_key',
    encode(extensions.gen_random_bytes(32), 'hex')
WHERE NOT EXISTS (
    SELECT 1 FROM private.secrets WHERE key = 'cpf_key'
);

-- 4. Revogar privilégios indevidos de anon e PUBLIC em funções clínicas/LGPD
REVOKE ALL ON FUNCTION public.anonimizar_paciente(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.anonimizar_paciente(UUID, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.criar_adendo_prontuario(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_adendo_prontuario(UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.registrar_revogacao_consentimento(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_revogacao_consentimento(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_my_clinica_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_clinica_id() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_my_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, service_role;

COMMENT ON FUNCTION public.cpf_encrypt(TEXT) IS
  'Cifra CPF simetricamente utilizando cpf_key de private.secrets. '
  'Restrito a service_role. Anon e authenticated expressamente bloqueados.';

COMMENT ON FUNCTION public.cpf_decrypt(TEXT) IS
  'Decifra CPF simetricamente utilizando cpf_key de private.secrets. '
  'Restrito a service_role. Anon e authenticated expressamente bloqueados.';

COMMIT;


