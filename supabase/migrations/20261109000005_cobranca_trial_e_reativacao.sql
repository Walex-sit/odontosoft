-- ==============================================================================
-- Migration: 20261109000005_cobranca_trial_e_reativacao.sql
-- Tarefa 3: Cobrança, Trial e Bloqueio de Inserção por Trial Vencido
--
-- 1. Estende check_tenant_billing_status() para bloquear INSERT quando
--    status_assinatura = 'trial' e trial_ends_at < now(), exceto para
--    is_lifetime = true e role = 'super_admin'.
-- 2. Mantém os bloqueios existentes de 'inadimplente' e 'cancelado'.
-- 3. Triggers existentes que invocam esta função:
--    - public.agendamentos (trg_billing_lock_agendamentos)
--    - public.pacientes (trg_billing_lock_pacientes)
--    - public.prontuarios (trg_billing_lock_prontuarios)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.check_tenant_billing_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    v_clinica_id     UUID;
    v_status         TEXT;
    v_trial_ends_at  TIMESTAMPTZ;
    v_jwt_role       TEXT := (auth.jwt() ->> 'role');
    v_setting_role   TEXT := current_setting('role', true);
BEGIN
    -- Permitir que operações de sistema (service_role ou postgres administrativo) prossigam,
    -- desde que não estejam emulando uma role de usuário final (anon ou authenticated).
    IF (v_jwt_role = 'service_role' OR session_user IN ('postgres', 'supabase_admin'))
       AND v_setting_role NOT IN ('anon', 'authenticated') THEN
        RETURN NEW;
    END IF;

    -- super_admin é sempre isento de bloqueios de faturamento/trial
    IF public.is_super_admin() THEN
        RETURN NEW;
    END IF;

    v_clinica_id := COALESCE(NEW.clinica_id, public.get_my_clinica_id());

    IF v_clinica_id IS NOT NULL THEN
        -- Contas com is_lifetime = true são isentas de bloqueio de trial e faturamento
        IF EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE (id = auth.uid() OR clinica_id = v_clinica_id)
              AND is_lifetime = true
        ) THEN
            RETURN NEW;
        END IF;

        SELECT status_assinatura, trial_ends_at
        INTO v_status, v_trial_ends_at
        FROM public.clinicas
        WHERE id = v_clinica_id;

        IF v_status = 'inadimplente' THEN
            RAISE EXCEPTION
                '[OdontoSoft Billing] A clínica encontra-se com pendências financeiras (inadimplente). Operações de cadastro e novos registros clínicos estão temporariamente bloqueadas. Por favor, regularize a sua fatura em Configurações > Assinatura para desbloquear.'
            USING ERRCODE = 'restrict_violation';
        ELSIF v_status = 'cancelado' THEN
            RAISE EXCEPTION
                '[OdontoSoft Billing] A assinatura da clínica está cancelada. Reative a sua assinatura para criar novos cadastros.'
            USING ERRCODE = 'restrict_violation';
        ELSIF v_status = 'trial' AND v_trial_ends_at IS NOT NULL AND v_trial_ends_at < now() THEN
            RAISE EXCEPTION
                '[OdontoSoft Billing] O período de avaliação gratuita (trial) desta clínica expirou. Para continuar cadastrando novos registros, assine um plano em Configurações > Assinatura.'
            USING ERRCODE = 'restrict_violation';
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

