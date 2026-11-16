-- 20261115000007_stripe_super_admin_hardening.sql
-- Reconstituição da migration já executada manualmente no banco remoto.
-- Não aplicar novamente sem revisar o histórico de migrations.

CREATE OR REPLACE FUNCTION private.fn_guard_super_admin_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
    IF OLD.role::text = 'super_admin' THEN
        IF NEW.role::text IS DISTINCT FROM 'super_admin'
           OR NEW.clinica_id IS DISTINCT FROM OLD.clinica_id THEN
            RAISE EXCEPTION
                '[OdontoSoft Security] Não é permitido rebaixar ou vincular um Super Admin por UPDATE de perfil.'
                USING ERRCODE = 'insufficient_privilege';
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION private.fn_guard_clinica_billing_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    v_jwt_role TEXT;
    v_is_privileged BOOLEAN;
BEGIN
    v_jwt_role := auth.jwt() ->> 'role';

    v_is_privileged :=
        v_jwt_role = 'service_role'
        OR session_user IN ('postgres', 'supabase_admin');

    -- Usuários autenticados não podem alterar campos financeiros.
    IF NOT v_is_privileged AND (
        NEW.plano IS DISTINCT FROM OLD.plano
        OR NEW.plano_preco_id IS DISTINCT FROM OLD.plano_preco_id
        OR NEW.status_assinatura IS DISTINCT FROM OLD.status_assinatura
        OR NEW.ativo IS DISTINCT FROM OLD.ativo
        OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at
        OR NEW.cancelamento_em IS DISTINCT FROM OLD.cancelamento_em
        OR NEW.periodo_fim IS DISTINCT FROM OLD.periodo_fim
        OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
        OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
        OR NEW.stripe_last_event_at IS DISTINCT FROM OLD.stripe_last_event_at
        OR NEW.stripe_subscription_created IS DISTINCT FROM OLD.stripe_subscription_created
    ) THEN
        RAISE EXCEPTION
            '[OdontoSoft Security] Alteração direta de campos financeiros não autorizada.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- Customer ID é identidade permanente da conta Stripe.
    IF OLD.stripe_customer_id IS NOT NULL
       AND NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
       AND session_user NOT IN ('postgres', 'supabase_admin') THEN
        RAISE EXCEPTION
            '[OdontoSoft Security] Substituição de Stripe Customer ID bloqueada.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- Não permite apagar uma assinatura já vinculada.
    IF OLD.stripe_subscription_id IS NOT NULL
       AND NEW.stripe_subscription_id IS NULL THEN
        RAISE EXCEPTION
            '[OdontoSoft Security] Remoção de Stripe Subscription ID bloqueada.'
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    -- Não permite substituir assinatura enquanto a anterior não estiver cancelada.
    IF OLD.stripe_subscription_id IS NOT NULL
       AND NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id THEN

        IF OLD.status_assinatura::text IS DISTINCT FROM 'cancelado' THEN
            RAISE EXCEPTION
                '[OdontoSoft Security] Substituição de assinatura ativa ou não cancelada bloqueada.'
                USING ERRCODE = 'integrity_constraint_violation';
        END IF;

        IF OLD.cancelamento_em IS NULL
           OR NEW.stripe_subscription_created IS NULL
           OR NEW.stripe_subscription_created <= OLD.cancelamento_em
           OR NEW.stripe_last_event_at IS NULL
           OR NEW.stripe_last_event_at <= OLD.cancelamento_em THEN
            RAISE EXCEPTION
                '[OdontoSoft Security] Nova assinatura sem comprovação temporal posterior ao cancelamento.'
                USING ERRCODE = 'integrity_constraint_violation';
        END IF;
    END IF;

    -- Uma clínica cancelada só pode voltar a ativa com uma assinatura diferente.
    IF OLD.status_assinatura::text = 'cancelado'
       AND NEW.status_assinatura::text = 'ativo' THEN

        IF OLD.stripe_subscription_id IS NULL
           OR NEW.stripe_subscription_id IS NULL
           OR NEW.stripe_subscription_id = OLD.stripe_subscription_id
           OR OLD.cancelamento_em IS NULL
           OR NEW.stripe_subscription_created IS NULL
           OR NEW.stripe_subscription_created <= OLD.cancelamento_em
           OR NEW.stripe_last_event_at IS NULL
           OR NEW.stripe_last_event_at <= OLD.cancelamento_em THEN
            RAISE EXCEPTION
                '[OdontoSoft Security] Reativação exige nova assinatura comprovadamente criada após o cancelamento.'
                USING ERRCODE = 'integrity_constraint_violation';
        END IF;
    END IF;

    -- Vínculo inicial de assinatura exige timestamp confiável.
    IF OLD.stripe_subscription_id IS NULL
       AND NEW.stripe_subscription_id IS NOT NULL
       AND NEW.stripe_subscription_created IS NULL THEN
        RAISE EXCEPTION
            '[OdontoSoft Security] Vínculo inicial exige stripe_subscription_created.'
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_super_admin_profile
ON public.user_profiles;

CREATE TRIGGER trg_guard_super_admin_profile
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION private.fn_guard_super_admin_profile();

DROP TRIGGER IF EXISTS trg_guard_clinica_billing_integrity
ON public.clinicas;

CREATE TRIGGER trg_guard_clinica_billing_integrity
BEFORE UPDATE ON public.clinicas
FOR EACH ROW
EXECUTE FUNCTION private.fn_guard_clinica_billing_integrity();
