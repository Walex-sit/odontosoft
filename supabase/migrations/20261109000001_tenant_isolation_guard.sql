-- =====================================================================
-- OdontoSoft: isolamento entre clinicas (RLS RESTRICTIVE)
--
-- Policies RESTRICTIVE sao combinadas com AND as policies permissivas.
-- Assim, uma policy antiga e frouxa nao consegue abrir acesso entre clinicas.
-- Valem so para o papel "authenticated". service_role continua ignorando RLS.
--
-- Idempotente: pode rodar mais de uma vez.
-- NAO cobre tabelas com RLS e sem coluna clinica_id (ver lista no teste).
-- =====================================================================

-- 1) Guarda de tenant em toda tabela com coluna clinica_id
DO $guard$
DECLARE
  r record;
  v_saas   text[] := ARRAY['clinica_settings','assinaturas','subscription','pagamentos_assinaturas','system_logs','auditoria'];
  v_shared text[] := ARRAY['procedimentos','medicamentos'];
  v_skip   text[] := ARRAY['clinicas','user_profiles','user_verification_codes','roles'];
  v_mine   text;
  v_read   text;
BEGIN
  FOR r IN
    SELECT c.relname::text AS t
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'clinica_id' AND NOT a.attisdropped
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
    ORDER BY c.relname
  LOOP
    IF r.t = ANY (v_skip) THEN CONTINUE; END IF;

    v_mine := 'clinica_id = (SELECT public.get_my_clinica_id())';
    IF r.t = ANY (v_saas) THEN
      v_mine := '(' || v_mine || ' OR (SELECT public.is_super_admin()))';
    END IF;
    v_read := v_mine;
    IF r.t = ANY (v_shared) THEN
      v_read := '(' || v_mine || ' OR clinica_id IS NULL)';
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS tenant_guard_select ON public.%I', r.t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_guard_insert ON public.%I', r.t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_guard_update ON public.%I', r.t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_guard_delete ON public.%I', r.t);
    EXECUTE format('CREATE POLICY tenant_guard_select ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING (%s)', r.t, v_read);
    EXECUTE format('CREATE POLICY tenant_guard_insert ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (%s)', r.t, v_mine);
    EXECUTE format('CREATE POLICY tenant_guard_update ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)', r.t, v_mine, v_mine);
    EXECUTE format('CREATE POLICY tenant_guard_delete ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (%s)', r.t, v_mine);
  END LOOP;
END
$guard$;

-- 2) Tabela clinicas (usa "id" no lugar de clinica_id)
DROP POLICY IF EXISTS tenant_guard_all ON public.clinicas;
CREATE POLICY tenant_guard_all ON public.clinicas AS RESTRICTIVE FOR ALL TO authenticated
  USING (id = (SELECT public.get_my_clinica_id()) OR (SELECT public.is_super_admin()))
  WITH CHECK (id = (SELECT public.get_my_clinica_id()) OR (SELECT public.is_super_admin()));

-- 3) Tabela user_profiles: fecha INSERT e DELETE e limita leitura e escrita a propria clinica
DROP POLICY IF EXISTS tenant_guard_select ON public.user_profiles;
DROP POLICY IF EXISTS tenant_guard_insert ON public.user_profiles;
DROP POLICY IF EXISTS tenant_guard_update ON public.user_profiles;
DROP POLICY IF EXISTS tenant_guard_delete ON public.user_profiles;

CREATE POLICY tenant_guard_select ON public.user_profiles AS RESTRICTIVE FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid())
         OR clinica_id = (SELECT public.get_my_clinica_id())
         OR (SELECT public.is_super_admin()));

CREATE POLICY tenant_guard_insert ON public.user_profiles AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_super_admin())
              OR (id = (SELECT auth.uid())
                  AND clinica_id IS NULL
                  AND role::text <> 'super_admin'
                  AND is_lifetime IS NOT TRUE));

CREATE POLICY tenant_guard_update ON public.user_profiles AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid())
         OR clinica_id = (SELECT public.get_my_clinica_id())
         OR (SELECT public.is_super_admin()))
  WITH CHECK (id = (SELECT auth.uid())
              OR clinica_id = (SELECT public.get_my_clinica_id())
              OR (SELECT public.is_super_admin()));

CREATE POLICY tenant_guard_delete ON public.user_profiles AS RESTRICTIVE FOR DELETE TO authenticated
  USING ((SELECT public.is_super_admin())
         OR (clinica_id = (SELECT public.get_my_clinica_id()) AND id <> (SELECT auth.uid())));

-- 4) Prontuario e evolucao: exclusao proibida de verdade (RESTRICTIVE nao pode ser anulada)
DO $proibido$
BEGIN
  IF to_regclass('public.prontuarios') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS delete_proibido_total ON public.prontuarios';
    EXECUTE 'CREATE POLICY delete_proibido_total ON public.prontuarios AS RESTRICTIVE FOR DELETE TO authenticated USING (false)';
  END IF;
  IF to_regclass('public.evolucao') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS delete_proibido_total ON public.evolucao';
    EXECUTE 'CREATE POLICY delete_proibido_total ON public.evolucao AS RESTRICTIVE FOR DELETE TO authenticated USING (false)';
  END IF;
END
$proibido$;

-- 5) get_tenant_audit_logs precisa ler o schema private: SECURITY DEFINER com search_path vazio
DO $audit$
BEGIN
  IF to_regprocedure('public.get_tenant_audit_logs(text,text,integer,integer)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.get_tenant_audit_logs(text,text,integer,integer) SECURITY DEFINER SET search_path = ''''';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_tenant_audit_logs(text,text,integer,integer) FROM PUBLIC, anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_tenant_audit_logs(text,text,integer,integer) TO authenticated, service_role';
  END IF;
END
$audit$;
