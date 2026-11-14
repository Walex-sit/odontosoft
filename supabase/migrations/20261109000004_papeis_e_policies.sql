-- ==============================================================================
-- Migration: 20261109000004_papeis_e_policies.sql
-- Tarefa 4: Papéis e Policies
--
-- 1. Políticas com papel 'admin': inclusão de 'admin_clinica' (ALTER POLICY).
--    Sem alterar policies RESTRICTIVE tenant_guard_*.
-- 2. Trigger user_profiles: apenas super_admin altera perfil de super_admin.
-- 3. Políticas por papel em tabelas clínicas e financeiras:
--    - admin_clinica: cria paciente, agendamento, prontuario, receita, atestado, despesa, nota fiscal, comissao
--    - dentista: cria paciente, agendamento, prontuario, receita, atestado
--    - recepcao: cria paciente, agendamento
-- ==============================================================================

-- 1. Trigger de user_profiles: só super_admin altera o perfil de um super_admin
CREATE OR REPLACE FUNCTION public.protect_user_profiles_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    v_jwt_role TEXT := (auth.jwt() ->> 'role');
    v_setting_role TEXT := current_setting('role', true);
BEGIN
    -- Permitir que operações de sistema (service_role ou postgres administrativo) prossigam,
    -- desde que não estejam emulando uma role de usuário final (anon ou authenticated).
    IF (v_jwt_role = 'service_role' OR session_user IN ('postgres', 'supabase_admin'))
       AND v_setting_role NOT IN ('anon', 'authenticated') THEN
        RETURN NEW;
    END IF;

    -- 0. Proteção estrita de super_admin: só super_admin altera o perfil de um super_admin
    IF OLD.role::text = 'super_admin' THEN
        IF NOT public.is_super_admin() THEN
            RAISE EXCEPTION 'Acesso negado: apenas o Super Admin pode alterar o perfil de um super_admin.'
                USING ERRCODE = 'insufficient_privilege';
        END IF;
    END IF;

    -- 1. Bloqueio de alteração de is_lifetime (apenas super_admin pode alterar)
    IF NEW.is_lifetime IS DISTINCT FROM OLD.is_lifetime THEN
        IF NOT public.is_super_admin() THEN
            RAISE EXCEPTION 'Acesso negado: a flag is_lifetime não pode ser alterada diretamente.'
                USING ERRCODE = 'insufficient_privilege';
        END IF;
    END IF;

    -- 2. Bloqueio de auto-elevação de role ou promoção para super_admin
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        IF OLD.id = auth.uid() THEN
            RAISE EXCEPTION 'Acesso negado: auto-alteração de nível de privilégio (role) não permitida.'
                USING ERRCODE = 'insufficient_privilege';
        END IF;

        IF NEW.role::text = 'super_admin' THEN
            IF NOT public.is_super_admin() THEN
                RAISE EXCEPTION 'Acesso negado: apenas o Super Admin pode atribuir a função super_admin.'
                    USING ERRCODE = 'insufficient_privilege';
            END IF;
        END IF;
    END IF;

    -- 3. Bloqueio de troca de clínica (QUALQUER alteração, inclusive transição de NULL para UUID)
    IF NEW.clinica_id IS DISTINCT FROM OLD.clinica_id THEN
        IF NOT public.is_super_admin() THEN
            RAISE EXCEPTION 'Acesso negado: alteração de tenant (clinica_id) não permitida.'
                USING ERRCODE = 'insufficient_privilege';
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.protect_user_profiles_privileges() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.protect_user_profiles_privileges() TO service_role;

-- 2. Storage Policy: inclusão explícita de 'admin' e 'admin_clinica'
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects' 
          AND policyname = 'consentimentos-evidencias: delete restrito ao admin'
    ) THEN
        ALTER POLICY "consentimentos-evidencias: delete restrito ao admin"
        ON storage.objects
        USING (
            bucket_id = 'consentimentos-evidencias'
            AND (
                public.is_super_admin()
                OR (
                    (storage.foldername(name))[1] = (
                        SELECT clinica_id::text
                        FROM public.user_profiles
                        WHERE id = auth.uid()
                          AND role::text IN ('admin', 'admin_clinica')
                        LIMIT 1
                    )
                )
            )
        );
    END IF;
END $$;

-- 3. Políticas de inserção por papel nas tabelas de domínio (ALTER POLICY, preservando tenant_guard_*)

-- Prontuários: admin, admin_clinica, dentista, super_admin
ALTER POLICY "Tenant Insert prontuarios" ON public.prontuarios
WITH CHECK (
    (clinica_id = public.get_my_clinica_id() OR clinica_id IS NULL)
    AND public.get_my_role() IN ('admin', 'admin_clinica', 'dentista', 'super_admin')
);

-- Receitas: admin, admin_clinica, dentista, super_admin
ALTER POLICY "Tenant Insert receitas" ON public.receitas
WITH CHECK (
    (clinica_id = public.get_my_clinica_id() OR clinica_id IS NULL)
    AND public.get_my_role() IN ('admin', 'admin_clinica', 'dentista', 'super_admin')
);

-- Atestados: admin, admin_clinica, dentista, super_admin
ALTER POLICY "Tenant Insert atestados" ON public.atestados
WITH CHECK (
    (clinica_id = public.get_my_clinica_id() OR clinica_id IS NULL)
    AND public.get_my_role() IN ('admin', 'admin_clinica', 'dentista', 'super_admin')
);

-- Despesas: admin, admin_clinica, financeiro, super_admin
ALTER POLICY "Tenant Insert despesas" ON public.despesas
WITH CHECK (
    (clinica_id = public.get_my_clinica_id() OR clinica_id IS NULL)
    AND public.get_my_role() IN ('admin', 'admin_clinica', 'financeiro', 'super_admin')
);

-- Notas Fiscais: admin, admin_clinica, financeiro, super_admin
ALTER POLICY "Tenant Insert notas_fiscais" ON public.notas_fiscais
WITH CHECK (
    (clinica_id = public.get_my_clinica_id() OR clinica_id IS NULL)
    AND public.get_my_role() IN ('admin', 'admin_clinica', 'financeiro', 'super_admin')
);

-- Comissões: admin, admin_clinica, financeiro, super_admin
ALTER POLICY "Tenant Insert comissoes" ON public.comissoes
WITH CHECK (
    (clinica_id = public.get_my_clinica_id() OR clinica_id IS NULL)
    AND public.get_my_role() IN ('admin', 'admin_clinica', 'financeiro', 'super_admin')
);

-- Pacientes: admin, admin_clinica, dentista, recepcao, super_admin
ALTER POLICY "Tenant Insert pacientes" ON public.pacientes
WITH CHECK (
    (clinica_id = public.get_my_clinica_id() OR clinica_id IS NULL)
    AND public.get_my_role() IN ('admin', 'admin_clinica', 'dentista', 'recepcao', 'super_admin')
);

-- Agendamentos: admin, admin_clinica, dentista, recepcao, super_admin
ALTER POLICY "Tenant Insert agendamentos" ON public.agendamentos
WITH CHECK (
    (clinica_id = public.get_my_clinica_id() OR clinica_id IS NULL)
    AND public.get_my_role() IN ('admin', 'admin_clinica', 'dentista', 'recepcao', 'super_admin')
);

