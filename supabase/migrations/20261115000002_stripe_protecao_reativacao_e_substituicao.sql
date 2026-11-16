-- ================================================================================
-- Migration: 20261115000002_stripe_protecao_reativacao_e_substituicao.sql
-- Descrição:
--   Atualiza public.stripe_should_activate_on_invoice() para impedir que um
--   evento antigo de assinatura anterior (ex: Assinatura A) sobrescreva uma
--   clínica que já foi reativada com uma assinatura nova (ex: Assinatura B).
--   Bloqueia explicitamente substituições quando a clínica já estiver ativa com
--   outra assinatura ou quando a assinatura da fatura tiver sido criada antes do
--   cancelamento histórico da clínica.
-- ================================================================================

BEGIN;

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
    c.cancelamento_em,
    c.periodo_fim
  INTO v_clinica
  FROM public.clinicas c
  WHERE c.stripe_subscription_id = p_subscription_id
  LIMIT 1;

  -- Fallback por customer_id se não encontrou pela subscription (outra sub para mesmo cliente)
  IF NOT FOUND AND p_customer_id IS NOT NULL THEN
    SELECT
      c.id,
      c.status_assinatura,
      c.stripe_subscription_id,
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

  -- 2. Se a assinatura da fatura for DIFERENTE da assinatura registrada na clínica:
  IF v_clinica.stripe_subscription_id IS NOT NULL AND v_clinica.stripe_subscription_id != p_subscription_id THEN
    -- Se a clínica já está ativa com outra assinatura, bloqueia substituição por fatura de assinatura antiga/diferente
    IF v_clinica.status_assinatura = 'ativo' THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Clínica já possui assinatura ativa diferente da informada na fatura — substituição bloqueada';
      RETURN;
    END IF;

    -- Se a clínica já esteve ou está cancelada e a assinatura recebida não comprova criação após cancelamento:
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

  -- 3. Tratamento estrito quando a clínica está cancelada
  IF v_clinica.status_assinatura = 'cancelado' THEN
    -- Bloqueio 1: Fatura pertence à MESMA assinatura já cancelada → NUNCA reativa (terminal)
    IF v_clinica.stripe_subscription_id IS NOT NULL AND v_clinica.stripe_subscription_id = p_subscription_id THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Assinatura da fatura já foi cancelada no sistema — reativação bloqueada';
      RETURN;
    END IF;

    -- Bloqueio 2: Período da fatura é anterior ao cancelamento registrado
    IF p_invoice_period_end IS NOT NULL
       AND v_clinica.cancelamento_em IS NOT NULL
       AND p_invoice_period_end < v_clinica.cancelamento_em THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Fatura pertence a período anterior ao cancelamento — evento fora de ordem bloqueado';
      RETURN;
    END IF;

    -- Bloqueio 3: Ausência de comprovação temporal de subscription.created confiável
    IF p_subscription_created IS NULL THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Ausência de comprovação temporal de subscription.created confiável — reativação bloqueada';
      RETURN;
    END IF;

    -- Bloqueio 4: Assinatura criada antes ou durante o cancelamento registrado
    IF v_clinica.cancelamento_em IS NOT NULL AND p_subscription_created <= v_clinica.cancelamento_em THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Assinatura foi criada antes ou durante o cancelamento — reativação bloqueada';
      RETURN;
    END IF;

    -- Liberação 5: Nova assinatura comprovadamente criada DEPOIS do cancelamento registrado
    IF v_clinica.cancelamento_em IS NOT NULL AND p_subscription_created > v_clinica.cancelamento_em THEN
      RETURN QUERY SELECT v_clinica.id, TRUE, NULL::TEXT;
      RETURN;
    END IF;

    -- Bloqueio padrão para qualquer outro caso pós-cancelamento não comprovado
    RETURN QUERY SELECT
      v_clinica.id,
      FALSE,
      'Reativação não comprovada temporalmente após cancelamento';
    RETURN;
  END IF;

  -- Clínica com assinatura não cancelada (ativo, trial, inadimplente) e mesma sub: fatura autorizada
  RETURN QUERY SELECT v_clinica.id, TRUE, NULL::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.stripe_should_activate_on_invoice(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stripe_should_activate_on_invoice(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ)
  TO service_role;

COMMENT ON FUNCTION public.stripe_should_activate_on_invoice IS
  'Valida se fatura pode ativar/reativar a clínica. Impede substituição de assinatura ativa por assinatura antiga via fallback.';

COMMIT;

