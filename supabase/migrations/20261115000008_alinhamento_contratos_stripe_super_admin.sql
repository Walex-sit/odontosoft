-- ================================================================================
-- Migration: 20261115000008_alinhamento_contratos_stripe_super_admin.sql
-- Descrição:
--   1. public.stripe_apply_checkout_completed:
--      - Bloqueia incondicionalmente a substituição de assinatura quando a clínica
--        estiver em qualquer estado diferente de 'cancelado' (incluindo 'inadimplente', 'trial', 'pendente').
--      - Valida divergência entre p_customer_id e stripe_customer_id registrado.
--        Se divergente, rejeita retornando applied = false, sem disparar exceção fatal.
--      - Nunca sobrescreve o Customer ID existente (COALESCE(existente, novo)).
--   2. public.stripe_apply_subscription_update:
--      - Valida divergência entre p_customer_id e stripe_customer_id registrado.
--        Retorna applied = false quando divergente.
--      - Nunca sobrescreve o Customer ID existente.
--   3. public.stripe_apply_invoice_payment_succeeded:
--      - Valida divergência entre p_customer_id e stripe_customer_id registrado.
--        Retorna applied = false quando divergente.
--      - Nunca sobrescreve o Customer ID existente.
--   4. public.stripe_should_activate_on_invoice:
--      - Valida divergência de customer_id e bloqueia substituição para clínica não cancelada.
--   5. public.provisionar_novo_tenant:
--      - Bloqueia explicitamente a execução caso o usuário seja 'super_admin'
--        antes de qualquer inserção ou alteração de dados.
--      - Preserva o Customer ID existente no fluxo idempotente.
--   6. Preservação integral de:
--      - Locks transacionais FOR UPDATE.
--      - Validações temporais anti-regressão e comprovantes pós-cancelamento.
--      - Definições SECURITY DEFINER com search_path = ''.
--      - Permissões restritas a service_role.
-- ================================================================================

BEGIN;

-- ── 1. RPC: stripe_apply_checkout_completed (Proteção Anti-Substituição e Customer ID) ──
CREATE OR REPLACE FUNCTION public.stripe_apply_checkout_completed(
  p_clinica_id           UUID,
  p_customer_id          TEXT,
  p_subscription_id      TEXT,
  p_plano                TEXT,
  p_event_created        TIMESTAMPTZ DEFAULT NULL,
  p_subscription_created TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  clinica_id      UUID,
  applied         BOOLEAN,
  motivo_bloqueio TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_clinica RECORD;
  v_is_replacement BOOLEAN;
  v_new_last_event_at TIMESTAMPTZ;
  v_valid_plano TEXT;
BEGIN
  -- 1. Bloqueia linha da clínica sob SELECT ... FOR UPDATE
  SELECT
    c.id,
    c.status_assinatura,
    c.stripe_subscription_id,
    c.stripe_customer_id,
    c.stripe_last_event_at,
    c.stripe_subscription_created,
    c.cancelamento_em,
    c.plano,
    c.ativo
  INTO v_clinica
  FROM public.clinicas c
  WHERE c.id = p_clinica_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Clínica não encontrada para o id informado';
    RETURN;
  END IF;

  -- 2. Validação de divergência de Customer ID: nunca permite alterar customer já registrado
  IF v_clinica.stripe_customer_id IS NOT NULL AND p_customer_id IS NOT NULL AND v_clinica.stripe_customer_id != p_customer_id THEN
    RETURN QUERY SELECT
      v_clinica.id,
      FALSE,
      'Divergência de Stripe Customer ID: não é permitido alterar o customer registrado';
    RETURN;
  END IF;

  v_is_replacement := (v_clinica.stripe_subscription_id IS NOT NULL AND p_subscription_id IS NOT NULL AND v_clinica.stripe_subscription_id != p_subscription_id);

  -- 3. Concorrência e integridade: bloqueia substituição para clínica em qualquer estado não cancelado
  IF v_is_replacement THEN
    IF v_clinica.status_assinatura != 'cancelado' THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Clínica possui assinatura vinculada em estado não cancelado — substituição bloqueada';
      RETURN;
    END IF;

    -- Quando a clínica está cancelada, exige cancelamento_em e comprovação temporal confiável
    IF v_clinica.cancelamento_em IS NULL THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Clínica cancelada sem registro de cancelamento_em — reativação/substituição bloqueada';
      RETURN;
    END IF;

    IF p_subscription_created IS NULL THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Reativação pós-cancelamento exige comprovação temporal de criação da assinatura';
      RETURN;
    END IF;

    IF p_subscription_created <= v_clinica.cancelamento_em THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Checkout com assinatura criada antes ou durante o cancelamento rejeitado';
      RETURN;
    END IF;

    IF p_event_created IS NOT NULL AND p_event_created <= v_clinica.cancelamento_em THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Evento gerado antes ou durante o cancelamento — evento fora de ordem bloqueado';
      RETURN;
    END IF;
  END IF;

  -- 4. Validações estritas quando a clínica está cancelada e o evento é para a MESMA assinatura
  IF NOT v_is_replacement AND v_clinica.status_assinatura = 'cancelado' THEN
    IF v_clinica.stripe_subscription_id IS NOT NULL AND p_subscription_id IS NOT NULL AND v_clinica.stripe_subscription_id = p_subscription_id THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Assinatura do checkout já foi cancelada no sistema — reativação bloqueada';
      RETURN;
    END IF;

    IF p_event_created IS NOT NULL AND v_clinica.cancelamento_em IS NOT NULL AND p_event_created <= v_clinica.cancelamento_em THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Evento gerado antes ou durante o cancelamento — evento fora de ordem bloqueado';
      RETURN;
    END IF;
  END IF;

  -- 5. Proteção anti-regressão temporal para a MESMA assinatura
  IF NOT v_is_replacement AND v_clinica.stripe_last_event_at IS NOT NULL AND p_event_created IS NOT NULL THEN
    IF p_event_created < v_clinica.stripe_last_event_at THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Evento antigo descartado: timestamp do evento anterior ao último processado';
      RETURN;
    END IF;

    IF p_event_created = v_clinica.stripe_last_event_at AND v_clinica.status_assinatura = 'cancelado' THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Regressão descartada: cancelamento não pode ser revertido no mesmo timestamp';
      RETURN;
    END IF;
  END IF;

  -- Normaliza plano aceito
  v_valid_plano := CASE
    WHEN lower(trim(COALESCE(p_plano, 'profissional'))) IN ('enterprise', 'premium') THEN 'enterprise'
    WHEN lower(trim(COALESCE(p_plano, 'profissional'))) IN ('basico', 'essencial') THEN 'basico'
    ELSE 'profissional'
  END;

  -- 6. Aplica ativação e atualiza billing atomicamente na mesma transação sob FOR UPDATE
  v_new_last_event_at := CASE
    WHEN v_is_replacement THEN COALESCE(p_event_created, now())
    ELSE GREATEST(COALESCE(v_clinica.stripe_last_event_at, '-infinity'::timestamptz), COALESCE(p_event_created, now()))
  END;

  UPDATE public.clinicas
  SET
    stripe_customer_id          = COALESCE(v_clinica.stripe_customer_id, p_customer_id),
    stripe_subscription_id      = COALESCE(p_subscription_id, v_clinica.stripe_subscription_id),
    status_assinatura           = 'ativo',
    plano                       = v_valid_plano,
    ativo                       = true,
    cancelamento_em             = NULL,
    stripe_last_event_at        = v_new_last_event_at,
    stripe_subscription_created = COALESCE(p_subscription_created, v_clinica.stripe_subscription_created),
    atualizado_em               = now()
  WHERE id = v_clinica.id;

  RETURN QUERY SELECT v_clinica.id, TRUE, NULL::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.stripe_apply_checkout_completed(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stripe_apply_checkout_completed(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;


-- ── 2. RPC: stripe_apply_subscription_update (Proteção Anti-Substituição e Customer ID) ──
CREATE OR REPLACE FUNCTION public.stripe_apply_subscription_update(
  p_subscription_id      TEXT,
  p_customer_id          TEXT,
  p_status               TEXT,
  p_period_end           TIMESTAMPTZ DEFAULT NULL,
  p_event_created        TIMESTAMPTZ DEFAULT NULL,
  p_subscription_created TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  clinica_id      UUID,
  applied         BOOLEAN,
  motivo_bloqueio TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_clinica RECORD;
  v_is_replacement BOOLEAN;
  v_new_last_event_at TIMESTAMPTZ;
BEGIN
  -- 1. Bloqueia linha da clínica com SELECT ... FOR UPDATE (mesma transação)
  SELECT
    c.id,
    c.status_assinatura,
    c.stripe_subscription_id,
    c.stripe_customer_id,
    c.cancelamento_em,
    c.periodo_fim,
    c.ativo,
    c.stripe_last_event_at,
    c.stripe_subscription_created
  INTO v_clinica
  FROM public.clinicas c
  WHERE c.stripe_subscription_id = p_subscription_id
  FOR UPDATE;

  -- Fallback concorrente seguro por customer_id
  IF NOT FOUND AND p_customer_id IS NOT NULL THEN
    SELECT
      c.id,
      c.status_assinatura,
      c.stripe_subscription_id,
      c.stripe_customer_id,
      c.cancelamento_em,
      c.periodo_fim,
      c.ativo,
      c.stripe_last_event_at,
      c.stripe_subscription_created
    INTO v_clinica
    FROM public.clinicas c
    WHERE c.stripe_customer_id = p_customer_id
    FOR UPDATE;
  END IF;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Clínica não encontrada para subscription/customer informado';
    RETURN;
  END IF;

  -- 2. Validação de divergência de Customer ID: nunca permite alterar customer já registrado
  IF v_clinica.stripe_customer_id IS NOT NULL AND p_customer_id IS NOT NULL AND v_clinica.stripe_customer_id != p_customer_id THEN
    RETURN QUERY SELECT
      v_clinica.id,
      FALSE,
      'Divergência de Stripe Customer ID: não é permitido alterar o customer registrado';
    RETURN;
  END IF;

  v_is_replacement := (v_clinica.stripe_subscription_id IS NOT NULL AND p_subscription_id IS NOT NULL AND v_clinica.stripe_subscription_id != p_subscription_id);

  -- 3. Vinculação inicial quando stripe_subscription_id IS NULL
  IF v_clinica.stripe_subscription_id IS NULL AND p_subscription_id IS NOT NULL THEN
    IF p_subscription_created IS NULL THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Vinculação de assinatura exige comprovação temporal confiável de subscription.created';
      RETURN;
    END IF;

    IF v_clinica.status_assinatura = 'cancelado' THEN
      IF v_clinica.cancelamento_em IS NULL THEN
        RETURN QUERY SELECT
          v_clinica.id,
          FALSE,
          'Clínica cancelada sem registro de cancelamento_em — vinculação bloqueada';
        RETURN;
      END IF;

      IF p_subscription_created <= v_clinica.cancelamento_em THEN
        RETURN QUERY SELECT
          v_clinica.id,
          FALSE,
          'Assinatura foi criada antes ou durante o cancelamento — vinculação bloqueada';
        RETURN;
      END IF;

      IF p_event_created IS NOT NULL AND p_event_created <= v_clinica.cancelamento_em THEN
        RETURN QUERY SELECT
          v_clinica.id,
          FALSE,
          'Evento gerado antes ou durante o cancelamento — evento fora de ordem bloqueado';
        RETURN;
      END IF;
    END IF;
  END IF;

  -- 4. Concorrência e integridade: assinatura diferente da atual registrada
  IF v_is_replacement THEN
    IF v_clinica.status_assinatura = 'ativo' THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Clínica já possui assinatura ativa diferente da informada — substituição bloqueada';
      RETURN;
    END IF;

    IF v_clinica.status_assinatura = 'inadimplente' THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Clínica inadimplente com outra assinatura vinculada — substituição não autorizada bloqueada';
      RETURN;
    END IF;

    IF v_clinica.status_assinatura != 'cancelado' THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Clínica possui assinatura vinculada em estado não cancelado — substituição bloqueada';
      RETURN;
    END IF;

    -- Quando a clínica está cancelada:
    IF v_clinica.status_assinatura = 'cancelado' THEN
      IF v_clinica.cancelamento_em IS NULL THEN
        RETURN QUERY SELECT
          v_clinica.id,
          FALSE,
          'Clínica cancelada sem registro de cancelamento_em — reativação/substituição bloqueada';
        RETURN;
      END IF;

      IF p_subscription_created IS NULL THEN
        RETURN QUERY SELECT
          v_clinica.id,
          FALSE,
          'Reativação pós-cancelamento exige comprovação temporal de criação da assinatura';
        RETURN;
      END IF;

      IF p_subscription_created <= v_clinica.cancelamento_em THEN
        RETURN QUERY SELECT
          v_clinica.id,
          FALSE,
          'Assinatura foi criada antes ou durante o cancelamento — reativação bloqueada';
        RETURN;
      END IF;

      IF p_event_created IS NOT NULL AND p_event_created <= v_clinica.cancelamento_em THEN
        RETURN QUERY SELECT
          v_clinica.id,
          FALSE,
          'Evento gerado antes ou durante o cancelamento — evento fora de ordem bloqueado';
        RETURN;
      END IF;

      IF p_status != 'ativo' THEN
        RETURN QUERY SELECT
          v_clinica.id,
          FALSE,
          'Reativação pós-cancelamento requer assinatura em estado ativo';
        RETURN;
      END IF;
    END IF;
  END IF;

  -- 5. Validações estritas quando a clínica está cancelada e o evento é para a MESMA assinatura
  IF NOT v_is_replacement AND v_clinica.status_assinatura = 'cancelado' THEN
    IF v_clinica.stripe_subscription_id IS NOT NULL AND v_clinica.stripe_subscription_id = p_subscription_id AND p_status = 'ativo' THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Assinatura do evento já foi cancelada no sistema — reativação bloqueada';
      RETURN;
    END IF;

    IF p_event_created IS NOT NULL AND v_clinica.cancelamento_em IS NOT NULL AND p_event_created <= v_clinica.cancelamento_em AND p_status = 'ativo' THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Evento gerado antes ou durante o cancelamento — evento fora de ordem bloqueado';
      RETURN;
    END IF;
  END IF;

  -- 6. Proteção anti-regressão temporal para a MESMA assinatura
  IF NOT v_is_replacement AND v_clinica.stripe_last_event_at IS NOT NULL AND p_event_created IS NOT NULL THEN
    IF p_event_created < v_clinica.stripe_last_event_at THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Evento antigo descartado: timestamp do evento anterior ao último processado';
      RETURN;
    END IF;

    IF p_event_created = v_clinica.stripe_last_event_at THEN
      IF v_clinica.status_assinatura = 'cancelado' AND p_status != 'cancelado' THEN
        RETURN QUERY SELECT v_clinica.id, FALSE, 'Regressão descartada: cancelamento não pode ser revertido no mesmo timestamp';
        RETURN;
      END IF;
      IF v_clinica.status_assinatura = 'ativo' AND p_status IN ('trial', 'pendente') THEN
        RETURN QUERY SELECT v_clinica.id, FALSE, 'Regressão descartada: assinatura ativa não retrocede no mesmo timestamp';
        RETURN;
      END IF;
    END IF;
  END IF;

  -- 7. Atualização atômica na mesma transação PostgreSQL sob FOR UPDATE
  v_new_last_event_at := CASE
    WHEN v_is_replacement THEN COALESCE(p_event_created, now())
    ELSE GREATEST(COALESCE(v_clinica.stripe_last_event_at, '-infinity'::timestamptz), COALESCE(p_event_created, now()))
  END;

  UPDATE public.clinicas
  SET
    status_assinatura           = p_status,
    stripe_subscription_id      = p_subscription_id,
    stripe_customer_id          = COALESCE(v_clinica.stripe_customer_id, p_customer_id),
    periodo_fim                 = COALESCE(p_period_end, v_clinica.periodo_fim),
    cancelamento_em             = CASE
      WHEN p_status = 'cancelado' THEN COALESCE(p_event_created, now())
      WHEN p_status = 'ativo' THEN NULL
      ELSE v_clinica.cancelamento_em
    END,
    ativo                       = CASE
      WHEN p_status = 'ativo' THEN true
      WHEN p_status = 'cancelado' THEN false
      ELSE v_clinica.ativo
    END,
    stripe_last_event_at        = v_new_last_event_at,
    stripe_subscription_created = COALESCE(p_subscription_created, v_clinica.stripe_subscription_created),
    atualizado_em               = now()
  WHERE id = v_clinica.id;

  RETURN QUERY SELECT v_clinica.id, TRUE, NULL::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.stripe_apply_subscription_update(TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stripe_apply_subscription_update(TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;


-- ── 3. RPC: stripe_apply_invoice_payment_succeeded (Proteção Anti-Substituição e Customer ID) ──
CREATE OR REPLACE FUNCTION public.stripe_apply_invoice_payment_succeeded(
  p_subscription_id      TEXT,
  p_customer_id          TEXT,
  p_invoice_period_end   TIMESTAMPTZ DEFAULT NULL,
  p_event_created        TIMESTAMPTZ DEFAULT NULL,
  p_subscription_created TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  clinica_id      UUID,
  applied         BOOLEAN,
  motivo_bloqueio TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_clinica RECORD;
  v_is_replacement BOOLEAN;
  v_new_last_event_at TIMESTAMPTZ;
BEGIN
  -- 1. Bloqueia linha da clínica com SELECT ... FOR UPDATE
  SELECT
    c.id,
    c.status_assinatura,
    c.stripe_subscription_id,
    c.stripe_customer_id,
    c.cancelamento_em,
    c.periodo_fim,
    c.ativo,
    c.stripe_last_event_at,
    c.stripe_subscription_created
  INTO v_clinica
  FROM public.clinicas c
  WHERE c.stripe_subscription_id = p_subscription_id
  FOR UPDATE;

  -- Fallback atômico por customer_id
  IF NOT FOUND AND p_customer_id IS NOT NULL THEN
    SELECT
      c.id,
      c.status_assinatura,
      c.stripe_subscription_id,
      c.stripe_customer_id,
      c.cancelamento_em,
      c.periodo_fim,
      c.ativo,
      c.stripe_last_event_at,
      c.stripe_subscription_created
    INTO v_clinica
    FROM public.clinicas c
    WHERE c.stripe_customer_id = p_customer_id
    FOR UPDATE;
  END IF;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Clínica não encontrada para subscription/customer informado';
    RETURN;
  END IF;

  -- 2. Validação de divergência de Customer ID: nunca permite alterar customer já registrado
  IF v_clinica.stripe_customer_id IS NOT NULL AND p_customer_id IS NOT NULL AND v_clinica.stripe_customer_id != p_customer_id THEN
    RETURN QUERY SELECT
      v_clinica.id,
      FALSE,
      'Divergência de Stripe Customer ID: não é permitido alterar o customer registrado';
    RETURN;
  END IF;

  v_is_replacement := (v_clinica.stripe_subscription_id IS NOT NULL AND p_subscription_id IS NOT NULL AND v_clinica.stripe_subscription_id != p_subscription_id);

  -- 3. Vinculação inicial quando stripe_subscription_id IS NULL
  IF v_clinica.stripe_subscription_id IS NULL AND p_subscription_id IS NOT NULL THEN
    IF p_subscription_created IS NULL THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Vinculação de nova assinatura via fatura exige comprovação temporal confiável de subscription.created';
      RETURN;
    END IF;

    IF v_clinica.status_assinatura = 'cancelado' THEN
      IF v_clinica.cancelamento_em IS NULL THEN
        RETURN QUERY SELECT
          v_clinica.id,
          FALSE,
          'Clínica cancelada sem registro de cancelamento_em — vinculação bloqueada';
        RETURN;
      END IF;

      IF p_subscription_created <= v_clinica.cancelamento_em THEN
        RETURN QUERY SELECT
          v_clinica.id,
          FALSE,
          'Assinatura foi criada antes ou durante o cancelamento — vinculação bloqueada';
        RETURN;
      END IF;

      IF p_event_created IS NOT NULL AND p_event_created <= v_clinica.cancelamento_em THEN
        RETURN QUERY SELECT
          v_clinica.id,
          FALSE,
          'Evento gerado antes ou durante o cancelamento — evento fora de ordem bloqueado';
        RETURN;
      END IF;
    END IF;
  END IF;

  -- 4. Concorrência e integridade: fatura pertence a assinatura DIFERENTE da atual
  IF v_is_replacement THEN
    IF v_clinica.status_assinatura = 'ativo' THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Clínica já possui assinatura ativa diferente da informada na fatura — substituição bloqueada';
      RETURN;
    END IF;

    IF v_clinica.status_assinatura = 'inadimplente' THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Clínica inadimplente com outra assinatura vinculada — substituição não autorizada bloqueada';
      RETURN;
    END IF;

    IF v_clinica.status_assinatura != 'cancelado' THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Clínica possui assinatura vinculada em estado não cancelado — substituição bloqueada';
      RETURN;
    END IF;

    IF v_clinica.status_assinatura = 'cancelado' THEN
      IF v_clinica.cancelamento_em IS NULL THEN
        RETURN QUERY SELECT
          v_clinica.id,
          FALSE,
          'Clínica cancelada sem registro de cancelamento_em — reativação/substituição bloqueada';
        RETURN;
      END IF;

      IF p_subscription_created IS NULL THEN
        RETURN QUERY SELECT
          v_clinica.id,
          FALSE,
          'Ausência de comprovação temporal de subscription.created confiável — reativação bloqueada';
        RETURN;
      END IF;

      IF p_subscription_created <= v_clinica.cancelamento_em THEN
        RETURN QUERY SELECT
          v_clinica.id,
          FALSE,
          'Assinatura foi criada antes ou durante o cancelamento — reativação bloqueada';
        RETURN;
      END IF;

      IF p_invoice_period_end IS NOT NULL AND p_invoice_period_end < v_clinica.cancelamento_em THEN
        RETURN QUERY SELECT
          v_clinica.id,
          FALSE,
          'Fatura pertence a período anterior ao cancelamento — evento fora de ordem bloqueado';
        RETURN;
      END IF;

      IF p_event_created IS NOT NULL AND p_event_created <= v_clinica.cancelamento_em THEN
        RETURN QUERY SELECT
          v_clinica.id,
          FALSE,
          'Evento gerado antes ou durante o cancelamento — evento fora de ordem bloqueado';
        RETURN;
      END IF;
    END IF;
  END IF;

  -- 5. Tratamento quando a clínica se encontra cancelada e o evento é para a MESMA assinatura
  IF NOT v_is_replacement AND v_clinica.status_assinatura = 'cancelado' THEN
    IF v_clinica.stripe_subscription_id IS NOT NULL AND v_clinica.stripe_subscription_id = p_subscription_id THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Assinatura da fatura já foi cancelada no sistema — reativação bloqueada';
      RETURN;
    END IF;

    IF p_invoice_period_end IS NOT NULL AND v_clinica.cancelamento_em IS NOT NULL AND p_invoice_period_end < v_clinica.cancelamento_em THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Fatura pertence a período anterior ao cancelamento — evento fora de ordem bloqueado';
      RETURN;
    END IF;
  END IF;

  -- 6. Evento antigo descartado para mesma assinatura
  IF NOT v_is_replacement AND v_clinica.stripe_last_event_at IS NOT NULL AND p_event_created IS NOT NULL THEN
    IF p_event_created < v_clinica.stripe_last_event_at THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Evento antigo descartado: timestamp do evento anterior ao último processado';
      RETURN;
    END IF;
  END IF;

  -- 7. Atualiza a clínica na mesma transação atômica
  v_new_last_event_at := CASE
    WHEN v_is_replacement THEN COALESCE(p_event_created, now())
    ELSE GREATEST(COALESCE(v_clinica.stripe_last_event_at, '-infinity'::timestamptz), COALESCE(p_event_created, now()))
  END;

  UPDATE public.clinicas
  SET
    status_assinatura           = 'ativo',
    ativo                       = true,
    stripe_subscription_id      = p_subscription_id,
    stripe_customer_id          = COALESCE(v_clinica.stripe_customer_id, p_customer_id),
    periodo_fim                 = COALESCE(p_invoice_period_end, v_clinica.periodo_fim),
    cancelamento_em             = NULL,
    stripe_last_event_at        = v_new_last_event_at,
    stripe_subscription_created = COALESCE(p_subscription_created, v_clinica.stripe_subscription_created),
    atualizado_em               = now()
  WHERE id = v_clinica.id;

  RETURN QUERY SELECT v_clinica.id, TRUE, NULL::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.stripe_apply_invoice_payment_succeeded(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stripe_apply_invoice_payment_succeeded(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;


-- ── 4. RPC: stripe_should_activate_on_invoice (Validação Alinhada) ─────────────
DROP FUNCTION IF EXISTS public.stripe_should_activate_on_invoice(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION public.stripe_should_activate_on_invoice(
  p_subscription_id      TEXT,
  p_customer_id          TEXT,
  p_invoice_period_end   TIMESTAMPTZ DEFAULT NULL,
  p_event_created        TIMESTAMPTZ DEFAULT NULL,
  p_subscription_created TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  clinica_id              UUID,
  deve_ativar             BOOLEAN,
  motivo_bloqueio         TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_clinica RECORD;
BEGIN
  -- 1. Busca clínica por subscription_id atual
  SELECT
    c.id,
    c.status_assinatura,
    c.stripe_subscription_id,
    c.stripe_customer_id,
    c.cancelamento_em,
    c.periodo_fim
  INTO v_clinica
  FROM public.clinicas c
  WHERE c.stripe_subscription_id = p_subscription_id
  LIMIT 1;

  -- Fallback por customer_id
  IF NOT FOUND AND p_customer_id IS NOT NULL THEN
    SELECT
      c.id,
      c.status_assinatura,
      c.stripe_subscription_id,
      c.stripe_customer_id,
      c.cancelamento_em,
      c.periodo_fim
    INTO v_clinica
    FROM public.clinicas c
    WHERE c.stripe_customer_id = p_customer_id
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Clínica não encontrada para subscription/customer';
    RETURN;
  END IF;

  -- Validação de divergência de Customer ID
  IF v_clinica.stripe_customer_id IS NOT NULL AND p_customer_id IS NOT NULL AND v_clinica.stripe_customer_id != p_customer_id THEN
    RETURN QUERY SELECT v_clinica.id, FALSE, 'Divergência de Stripe Customer ID: não é permitido alterar o customer registrado';
    RETURN;
  END IF;

  -- 2. Se a assinatura da fatura for DIFERENTE da assinatura registrada na clínica:
  IF v_clinica.stripe_subscription_id IS NOT NULL AND v_clinica.stripe_subscription_id != p_subscription_id THEN
    IF v_clinica.status_assinatura != 'cancelado' THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Clínica possui assinatura vinculada em estado não cancelado — substituição bloqueada';
      RETURN;
    END IF;

    IF v_clinica.cancelamento_em IS NOT NULL THEN
      IF p_subscription_created IS NULL THEN
        RETURN QUERY SELECT
          v_clinica.id,
          FALSE,
          'Assinatura diferente da atual sem comprovação temporal de criação — substituição bloqueada';
        RETURN;
      END IF;

      IF p_subscription_created <= v_clinica.cancelamento_em THEN
        RETURN QUERY SELECT
          v_clinica.id,
          FALSE,
          'Assinatura foi criada antes ou durante o cancelamento — reativação bloqueada';
        RETURN;
      END IF;
    END IF;
  END IF;

  -- 3. Tratamento quando a clínica está cancelada
  IF v_clinica.status_assinatura = 'cancelado' THEN
    IF v_clinica.stripe_subscription_id IS NOT NULL AND v_clinica.stripe_subscription_id = p_subscription_id THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Assinatura da fatura já foi cancelada no sistema — reativação bloqueada';
      RETURN;
    END IF;

    IF p_invoice_period_end IS NOT NULL AND v_clinica.cancelamento_em IS NOT NULL AND p_invoice_period_end < v_clinica.cancelamento_em THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Fatura pertence a período anterior ao cancelamento — evento fora de ordem bloqueado';
      RETURN;
    END IF;

    IF p_subscription_created IS NULL THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Ausência de comprovação temporal de subscription.created confiável — reativação bloqueada';
      RETURN;
    END IF;

    IF v_clinica.cancelamento_em IS NOT NULL AND p_subscription_created <= v_clinica.cancelamento_em THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Assinatura foi criada antes ou durante o cancelamento — reativação bloqueada';
      RETURN;
    END IF;

    IF v_clinica.cancelamento_em IS NOT NULL AND p_subscription_created > v_clinica.cancelamento_em THEN
      RETURN QUERY SELECT v_clinica.id, TRUE, NULL::TEXT;
      RETURN;
    END IF;

    RETURN QUERY SELECT
      v_clinica.id,
      FALSE,
      'Reativação não comprovada temporalmente após cancelamento';
      RETURN;
  END IF;

  RETURN QUERY SELECT v_clinica.id, TRUE, NULL::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.stripe_should_activate_on_invoice(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stripe_should_activate_on_invoice(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ)
  TO service_role;


-- ── 5. RPC: provisionar_novo_tenant (Bloqueio de super_admin e Preservação de Customer ID) ──
CREATE OR REPLACE FUNCTION public.provisionar_novo_tenant(
    p_user_id                UUID,
    p_nome_clinica           TEXT,
    p_plano                  TEXT DEFAULT 'profissional',
    p_stripe_customer_id     TEXT DEFAULT NULL,
    p_stripe_subscription_id TEXT DEFAULT NULL,
    p_plano_preco_id         TEXT DEFAULT NULL,
    p_subscription_created   TIMESTAMPTZ DEFAULT NULL,
    p_event_created          TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_clinica_id     UUID;
    v_clean_nome     TEXT;
    v_valid_plano    TEXT;
    v_jwt_role       TEXT;
    v_setting_role   TEXT;
    v_user_nome      TEXT;
    v_existing_cid   UUID;
    v_clinica        RECORD;
    v_user_rows      INTEGER;
    v_is_replacement BOOLEAN;
BEGIN
    -- 1. Verificação de privilégios de execução estrita
    v_jwt_role     := (auth.jwt() ->> 'role');
    v_setting_role := current_setting('role', true);

    IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
        IF session_user NOT IN ('postgres', 'supabase_admin') OR v_setting_role IN ('anon', 'authenticated') THEN
            RAISE EXCEPTION '[OdontoSoft Security] Execução não autorizada da RPC de provisionamento. Operação restrita a service_role (Stripe Webhook).'
                USING ERRCODE = 'insufficient_privilege';
        END IF;
    END IF;

    -- 2. Validação estrita de p_user_id em auth.users
    IF p_user_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM auth.users WHERE id = p_user_id
    ) THEN
        RAISE EXCEPTION '[OdontoSoft Security] p_user_id (%) inválido ou inexistente em auth.users.', p_user_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    -- 3. Bloqueio estrito de super_admin: nunca pode ser provisionado como admin de clínica
    IF EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = p_user_id AND role = 'super_admin'
    ) THEN
        RAISE EXCEPTION '[OdontoSoft Security] Usuário super_admin não pode ser provisionado como admin_clinica.'
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;

    -- Validação estrita do plano aceito
    v_valid_plano := CASE
        WHEN lower(trim(COALESCE(p_plano, 'profissional'))) IN ('enterprise', 'premium') THEN 'enterprise'
        WHEN lower(trim(COALESCE(p_plano, 'profissional'))) IN ('basico', 'essencial') THEN 'basico'
        WHEN lower(trim(COALESCE(p_plano, 'profissional'))) = 'profissional' THEN 'profissional'
        ELSE NULL
    END;

    IF v_valid_plano IS NULL THEN
        RAISE EXCEPTION '[OdontoSoft Security] Plano informado (%) é inválido. Valores aceitos: basico, profissional, enterprise.', p_plano
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    -- 4. Concorrência: Assegura existência do perfil e aplica SELECT ... FOR UPDATE
    INSERT INTO public.user_profiles (id, nome, role)
    SELECT
        p_user_id,
        COALESCE(raw_user_meta_data->>'nome', raw_user_meta_data->>'full_name', split_part(email, '@', 1), 'Administrador'),
        'admin_clinica'::public.user_role
    FROM auth.users
    WHERE id = p_user_id
    ON CONFLICT (id) DO NOTHING;

    SELECT clinica_id INTO v_existing_cid
    FROM public.user_profiles
    WHERE id = p_user_id
    FOR UPDATE;

    -- 5. Tratamento Idempotente Seguro para Usuário já Vinculado
    IF v_existing_cid IS NOT NULL THEN
        SELECT
            c.id,
            c.status_assinatura,
            c.stripe_subscription_id,
            c.stripe_customer_id,
            c.cancelamento_em,
            c.stripe_last_event_at,
            c.stripe_subscription_created
        INTO v_clinica
        FROM public.clinicas c
        WHERE c.id = v_existing_cid
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION '[OdontoSoft Security] Inconsistência: clínica % vinculada ao perfil % não existe.', v_existing_cid, p_user_id
                USING ERRCODE = 'data_exception';
        END IF;

        -- Validação de divergência de Customer ID: preserva o existente
        v_is_replacement := (v_clinica.stripe_subscription_id IS NOT NULL AND p_stripe_subscription_id IS NOT NULL AND v_clinica.stripe_subscription_id != p_stripe_subscription_id);

        -- Se a clínica estiver cancelada: NUNCA reativa sem comprovação temporal válida pós-cancelamento
        IF v_clinica.status_assinatura = 'cancelado' THEN
            IF p_stripe_subscription_id IS NOT NULL
               AND (v_clinica.stripe_subscription_id IS NULL OR v_clinica.stripe_subscription_id != p_stripe_subscription_id)
               AND v_clinica.cancelamento_em IS NOT NULL
               AND p_subscription_created IS NOT NULL
               AND p_subscription_created > v_clinica.cancelamento_em
               AND (p_event_created IS NULL OR p_event_created > v_clinica.cancelamento_em) THEN

                -- Nunca sobrescreve customer_id existente
                UPDATE public.clinicas
                SET stripe_customer_id          = COALESCE(v_clinica.stripe_customer_id, p_stripe_customer_id),
                    stripe_subscription_id      = p_stripe_subscription_id,
                    plano                       = v_valid_plano,
                    plano_preco_id              = COALESCE(p_plano_preco_id, plano_preco_id),
                    status_assinatura           = 'ativo',
                    ativo                       = true,
                    cancelamento_em             = NULL,
                    stripe_last_event_at        = COALESCE(p_event_created, now()),
                    stripe_subscription_created = p_subscription_created,
                    atualizado_em               = now()
                WHERE id = v_existing_cid;
            ELSE
                NULL;
            END IF;

            RETURN v_existing_cid;
        END IF;

        -- Se a clínica já possui outra assinatura (ativo, inadimplente, pendente, trial, etc.): bloqueia substituição
        IF v_is_replacement THEN
            RETURN v_existing_cid;
        END IF;

        -- Vinculação inicial exige comprovação temporal
        IF v_clinica.stripe_subscription_id IS NULL AND p_stripe_subscription_id IS NOT NULL THEN
            IF p_subscription_created IS NULL THEN
                RAISE EXCEPTION '[OdontoSoft Security] Vinculação de assinatura Stripe exige comprovação temporal confiável (p_subscription_created).'
                    USING ERRCODE = 'invalid_parameter_value';
            END IF;
        END IF;

        -- Proteção contra eventos atrasados para a mesma assinatura
        IF NOT v_is_replacement AND v_clinica.stripe_last_event_at IS NOT NULL AND p_event_created IS NOT NULL THEN
            IF p_event_created < v_clinica.stripe_last_event_at THEN
                RETURN v_existing_cid;
            END IF;
        END IF;

        -- Atualização idempotente segura preservando Customer ID existente
        UPDATE public.clinicas
        SET stripe_customer_id          = COALESCE(v_clinica.stripe_customer_id, p_stripe_customer_id),
            stripe_subscription_id      = COALESCE(p_stripe_subscription_id, stripe_subscription_id),
            plano_preco_id              = COALESCE(p_plano_preco_id, plano_preco_id),
            stripe_last_event_at        = GREATEST(COALESCE(v_clinica.stripe_last_event_at, '-infinity'::timestamptz), COALESCE(p_event_created, now())),
            stripe_subscription_created = COALESCE(p_subscription_created, v_clinica.stripe_subscription_created),
            atualizado_em               = now()
        WHERE id = v_existing_cid;

        RETURN v_existing_cid;
    END IF;

    -- 6. Integração Temporal no Provisionamento de Novo Tenant:
    IF p_stripe_subscription_id IS NOT NULL AND p_subscription_created IS NULL THEN
        RAISE EXCEPTION '[OdontoSoft Security] Provisionamento com assinatura Stripe exige comprovação temporal confiável (p_subscription_created).'
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    v_clinica_id := gen_random_uuid();
    v_clean_nome := COALESCE(NULLIF(trim(p_nome_clinica), ''), 'Minha Clínica');

    -- 7. Criação da Clínica
    INSERT INTO public.clinicas (
        id, nome, plano, status_assinatura,
        stripe_customer_id, stripe_subscription_id, plano_preco_id, ativo,
        stripe_last_event_at, stripe_subscription_created
    ) VALUES (
        v_clinica_id, v_clean_nome,
        v_valid_plano, 'ativo',
        p_stripe_customer_id, p_stripe_subscription_id, p_plano_preco_id, true,
        COALESCE(p_event_created, now()), p_subscription_created
    );

    -- 8. Configurações da clínica
    INSERT INTO public.clinica_settings (clinica_id, nome, nome_exibido)
    VALUES (v_clinica_id, v_clean_nome, v_clean_nome)
    ON CONFLICT (clinica_id) DO UPDATE
        SET nome = EXCLUDED.nome, nome_exibido = EXCLUDED.nome_exibido;

    -- 9. Extração defensiva de nome do usuário
    SELECT COALESCE(raw_user_meta_data->>'nome', raw_user_meta_data->>'full_name', split_part(email, '@', 1), 'Administrador')
    INTO v_user_nome
    FROM auth.users
    WHERE id = p_user_id;

    -- 10. Vinculação do perfil do usuário como admin_clinica
    UPDATE public.user_profiles
    SET clinica_id = v_clinica_id,
        role       = 'admin_clinica',
        nome       = COALESCE(nome, v_user_nome, 'Administrador')
    WHERE id = p_user_id;

    GET DIAGNOSTICS v_user_rows = ROW_COUNT;
    IF v_user_rows != 1 THEN
        RAISE EXCEPTION '[OdontoSoft Security] Falha ao vincular usuário % ao tenant %: exatamente 1 linha esperada, afetados: %', p_user_id, v_clinica_id, v_user_rows
            USING ERRCODE = 'data_exception';
    END IF;

    RETURN v_clinica_id;
END;
$$;

REVOKE ALL ON FUNCTION public.provisionar_novo_tenant(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provisionar_novo_tenant(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;

COMMENT ON FUNCTION public.provisionar_novo_tenant(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) IS
  'Provisiona novo tenant B2B com bloqueio estrito de super_admin, proteção de Customer ID, concorrência serializada via FOR UPDATE e vinculação atômica.';

COMMIT;

