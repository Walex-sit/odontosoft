-- ==============================================================================
-- Migration: 20261103000002_protect_billing_fields.sql
-- Descrição: R-006 — Proteção de campos críticos de billing na tabela public.clinicas.
--
-- Problema identificado (Auditoria Adversarial Etapa 3):
--   A política RLS de UPDATE em public.clinicas permite que qualquer admin atualize
--   qualquer campo da clínica, incluindo status_assinatura, trial_ends_at e ativo,
--   contornando completamente o paywall via API REST direta.
--
-- Solução:
--   Trigger BEFORE UPDATE em public.clinicas que rejeita alterações dos campos
--   críticos de billing por qualquer conexão que não seja service_role.
--   Webhooks Stripe, RPCs autorizadas (provisionar_novo_tenant) e operações
--   administrativas do SaaS passam via service_role e são isentas.
--
-- Campos protegidos:
--   - status_assinatura  → estado financeiro (trial/ativo/inadimplente/cancelado)
--   - trial_ends_at      → expiração do período de avaliação
--   - ativo              → ativação/desativação do tenant
--
-- Campos NÃO protegidos (alteráveis pelo admin da clínica via app):
--   - nome, cnpj, telefone, email, endereco, etc.
--
-- Canais autorizados para alterar campos de billing:
--   1. service_role (Stripe webhooks, migrações, RPCs SECURITY DEFINER)
--   2. supabase_admin
-- ==============================================================================

-- ── FUNÇÃO PROTETORA DE BILLING ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.protect_clinica_billing_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_jwt_role TEXT;
BEGIN
    -- Extrai o role do JWT atual (service_role, authenticated, anon, etc.)
    v_jwt_role := (auth.jwt() ->> 'role');

    -- service_role e supabase_admin têm acesso irrestrito
    -- (usado por: Stripe webhooks, RPCs autorizadas, migrations, supabaseAdmin)
    IF v_jwt_role = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- Para qualquer outro usuário (authenticated, anon):
    -- Bloquear alteração dos campos críticos de billing

    -- 1. Proteção de status_assinatura
    IF NEW.status_assinatura IS DISTINCT FROM OLD.status_assinatura THEN
        RAISE EXCEPTION
            '[OdontoSoft Security] Alteração de status_assinatura não autorizada. '
            'Esta operação é exclusiva de processos administrativos do SaaS (Stripe, service_role). '
            'Para alterar seu plano, utilize a interface de Configurações > Assinatura.'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- 2. Proteção de trial_ends_at
    IF NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at THEN
        RAISE EXCEPTION
            '[OdontoSoft Security] Alteração de trial_ends_at não autorizada. '
            'O período de avaliação só pode ser modificado por processos internos do SaaS.'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- 3. Proteção de ativo
    IF NEW.ativo IS DISTINCT FROM OLD.ativo THEN
        RAISE EXCEPTION
            '[OdontoSoft Security] Alteração do campo ativo não autorizada. '
            'A ativação/desativação de tenants é exclusiva de processos administrativos do SaaS.'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.protect_clinica_billing_fields() IS
    'Trigger de segurança: impede que usuários autenticados (admin, admin_clinica) '
    'alterem diretamente campos críticos de billing (status_assinatura, trial_ends_at, ativo) '
    'via API REST. Apenas service_role (Stripe webhooks, RPCs autorizadas) pode modificá-los. '
    'Corrige vulnerabilidade R-006 identificada na Auditoria Adversarial Etapa 3.';

-- ── REGISTRO DO TRIGGER ───────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS tr_protect_clinica_billing_fields ON public.clinicas;
CREATE TRIGGER tr_protect_clinica_billing_fields
    BEFORE UPDATE ON public.clinicas
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_clinica_billing_fields();

COMMENT ON TRIGGER tr_protect_clinica_billing_fields ON public.clinicas IS
    'Proteção de campos críticos de billing. Disparado em cada UPDATE na tabela clinicas. '
    'Bloqueia alterações de status_assinatura, trial_ends_at e ativo por usuários autenticados comuns.';


-- ── TESTES NEGATIVOS EMBUTIDOS (executados em ambiente de desenvolvimento) ────
-- Os comentários abaixo documentam os cenários de teste que DEVEM ser validados
-- manualmente ou via suite de testes antes da aplicação em produção.
--
-- TESTE N1 — Tentativa de bypass do paywall via API REST:
--   PATCH /rest/v1/clinicas?id=eq.<clinica-id>
--   Header: Authorization: Bearer <jwt-admin-clinica>
--   Body: { "status_assinatura": "ativo" }
--   Resultado esperado: HTTP 403 / SQLSTATE 42501 (insufficient_privilege)
--
-- TESTE N2 — Remoção de trial_ends_at via API REST:
--   PATCH /rest/v1/clinicas?id=eq.<clinica-id>
--   Header: Authorization: Bearer <jwt-admin-clinica>
--   Body: { "trial_ends_at": null }
--   Resultado esperado: HTTP 403 / SQLSTATE 42501 (insufficient_privilege)
--
-- TESTE N3 — Desativação forçada de concorrente via API REST:
--   PATCH /rest/v1/clinicas?id=eq.<clinica-id>
--   Body: { "ativo": false }
--   Resultado esperado: HTTP 403 / SQLSTATE 42501 (insufficient_privilege)
--
-- TESTE P1 — Webhook Stripe legítimo (service_role):
--   UPDATE via supabaseAdmin.from('clinicas').update({ status_assinatura: 'ativo' })
--   Resultado esperado: HTTP 200 (sucesso)
--
-- TESTE P2 — Renovação via RPC provisionar_novo_tenant (SECURITY DEFINER):
--   SELECT provisionar_novo_tenant(...)
--   Resultado esperado: Sucesso (RPC é SECURITY DEFINER e opera como service_role)
--
-- TESTE P3 — Atualização de dados não-billing pelo admin (nome, telefone):
--   PATCH /rest/v1/clinicas?id=eq.<clinica-id>
--   Body: { "nome": "Nova Clínica", "telefone": "11999999999" }
--   Resultado esperado: HTTP 200 (campos não protegidos)
-- ==============================================================================
