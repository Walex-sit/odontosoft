-- ==============================================================================
-- Migration: 20261012000009_saas_billing_and_onboarding.sql
-- Descrição: Motor Financeiro SaaS B2B, Integração com Stripe e Bloqueios por Inadimplência
-- ==============================================================================

-- ============================================================
-- SEÇÃO 1 — COLUNAS DE BILLING NA TABELA CLINICAS
-- ============================================================

ALTER TABLE public.clinicas
    ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS status_assinatura TEXT NOT NULL DEFAULT 'trial'
        CHECK (status_assinatura IN ('trial', 'ativo', 'inadimplente', 'cancelado', 'pendente')),
    ADD COLUMN IF NOT EXISTS plano_preco_id TEXT,
    ADD COLUMN IF NOT EXISTS periodo_fim TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancelamento_em TIMESTAMPTZ;

COMMENT ON COLUMN public.clinicas.stripe_customer_id IS
    'Identificador do cliente no gateway Stripe (ex: cus_123456789).';

COMMENT ON COLUMN public.clinicas.stripe_subscription_id IS
    'Identificador da assinatura ativa no Stripe (ex: sub_123456789).';

COMMENT ON COLUMN public.clinicas.status_assinatura IS
    'Estado financeiro da conta SaaS: trial (avaliação), ativo (adimplente), '
    'inadimplente (falha de pagamento/bloqueio de escrita), cancelado, pendente.';

COMMENT ON COLUMN public.clinicas.periodo_fim IS
    'Data de encerramento do período de faturamento atual.';

-- Índices para buscas rápidas em webhooks
CREATE INDEX IF NOT EXISTS idx_clinicas_stripe_customer
    ON public.clinicas(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_clinicas_stripe_sub
    ON public.clinicas(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_clinicas_status_assinatura
    ON public.clinicas(status_assinatura);


-- ============================================================
-- SEÇÃO 2 — BLOQUEIO OPERACIONAL POR INADIMPLÊNCIA (BILLING LOCK)
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_tenant_billing_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clinica_id UUID;
    v_status     TEXT;
BEGIN
    v_clinica_id := COALESCE(NEW.clinica_id, public.get_my_clinica_id());

    IF v_clinica_id IS NOT NULL THEN
        SELECT status_assinatura INTO v_status
        FROM public.clinicas
        WHERE id = v_clinica_id;

        IF v_status = 'inadimplente' THEN
            RAISE EXCEPTION
                '[OdontoSoft Billing] A clínica encontra-se com pendências financeiras (inadimplente). '
                'Operações de cadastro e novos registros clínicos estão temporariamente bloqueadas. '
                'Por favor, regularize a sua fatura em Configurações > Assinatura para desbloquear.'
            USING ERRCODE = 'restrict_violation';
        ELSIF v_status = 'cancelado' THEN
            RAISE EXCEPTION
                '[OdontoSoft Billing] A assinatura da clínica está cancelada. '
                'Reative a sua assinatura para criar novos cadastros.'
            USING ERRCODE = 'restrict_violation';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.check_tenant_billing_status() IS
    'Trigger de proteção de negócio: impede a criação de novos pacientes, '
    'prontuários e agendamentos caso a clínica esteja inadimplente ou cancelada.';

-- Aplica o trigger nas tabelas operacionais principais
DROP TRIGGER IF EXISTS trg_billing_lock_pacientes ON public.pacientes;
CREATE TRIGGER trg_billing_lock_pacientes
    BEFORE INSERT ON public.pacientes
    FOR EACH ROW
    EXECUTE FUNCTION public.check_tenant_billing_status();

DROP TRIGGER IF EXISTS trg_billing_lock_prontuarios ON public.prontuarios;
CREATE TRIGGER trg_billing_lock_prontuarios
    BEFORE INSERT ON public.prontuarios
    FOR EACH ROW
    EXECUTE FUNCTION public.check_tenant_billing_status();

DROP TRIGGER IF EXISTS trg_billing_lock_agendamentos ON public.agendamentos;
CREATE TRIGGER trg_billing_lock_agendamentos
    BEFORE INSERT ON public.agendamentos
    FOR EACH ROW
    EXECUTE FUNCTION public.check_tenant_billing_status();


-- ============================================================
-- SEÇÃO 3 — RPC DE PROVISIONAMENTO ATÔMICO DE TENANT
-- ============================================================

CREATE OR REPLACE FUNCTION public.provisionar_novo_tenant(
    p_user_id                UUID,
    p_nome_clinica           TEXT,
    p_plano                  TEXT,
    p_stripe_customer_id     TEXT DEFAULT NULL,
    p_stripe_subscription_id TEXT DEFAULT NULL,
    p_plano_preco_id         TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clinica_id UUID;
    v_user_role  TEXT;
BEGIN
    -- Criação da Clínica
    INSERT INTO public.clinicas (
        nome,
        plano,
        status_assinatura,
        stripe_customer_id,
        stripe_subscription_id,
        plano_preco_id,
        ativo
    ) VALUES (
        COALESCE(NULLIF(trim(p_nome_clinica), ''), 'Minha Clínica Odontológica'),
        COALESCE(p_plano, 'profissional'),
        'ativo',
        p_stripe_customer_id,
        p_stripe_subscription_id,
        p_plano_preco_id,
        true
    )
    RETURNING id INTO v_clinica_id;

    -- Criação de configurações iniciais da clínica
    INSERT INTO public.clinica_settings (
        clinica_id,
        nome,
        nome_exibido
    ) VALUES (
        v_clinica_id,
        COALESCE(NULLIF(trim(p_nome_clinica), ''), 'Minha Clínica Odontológica'),
        COALESCE(NULLIF(trim(p_nome_clinica), ''), 'Minha Clínica Odontológica')
    );

    -- Vinculação do usuário como Admin da clínica
    UPDATE public.user_profiles
    SET
        clinica_id = v_clinica_id,
        role       = 'admin'
    WHERE id = p_user_id;

    RETURN v_clinica_id;
END;
$$;

COMMENT ON FUNCTION public.provisionar_novo_tenant(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) IS
    'Provisiona uma nova clínica após a confirmação de checkout no gateway de pagamento, '
    'atribuindo a clínica e o papel de admin ao usuário contratante.';
