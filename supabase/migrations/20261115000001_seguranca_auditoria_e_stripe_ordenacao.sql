-- ================================================================================
-- Migration: 20261115000001_seguranca_auditoria_e_stripe_ordenacao.sql
-- Descrição:
--   1. LGPD & Prontuários: Atualiza private.fn_audit_trigger() para garantir que
--      registros de prontuários e evolução não dupliquem 'descricao', 'tratamento',
--      ou qualquer dado clínico sensível nos logs genéricos (private.audit_logs).
--      Registra SOMENTE metadados estritamente necessários para rastreabilidade.
--      Preserva integralmente o histórico clínico no armazenamento original (public.prontuarios).
--   2. Stripe Idempotência e Ordenação Temporal:
--      Atualiza public.stripe_should_activate_on_invoice() para exigir a data real
--      de criação da assinatura (p_subscription_created), descartando event.created
--      e invoice_period_end como comprovação de criação.
--      Remove o fallback sem comprovação temporal.
--      Bloqueia assinaturas criadas antes ou durante o cancelamento.
--      Permite reativação exclusivamente com comprovação de assinatura criada após cancelamento.
-- ================================================================================

BEGIN;

-- ── 1. Atualização do Trigger de Auditoria (private.fn_audit_trigger) ──────────
CREATE OR REPLACE FUNCTION private.fn_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_clinica_id  UUID;
    v_id_usuario  UUID;
    v_user_email  TEXT;
    v_registro_id UUID;
    v_dados_ant   JSONB := NULL;
    v_dados_nov   JSONB := NULL;
    v_tabela      TEXT  := TG_TABLE_NAME;
    v_acao        TEXT  := TG_OP;
    v_ip          TEXT;
    v_colunas     TEXT[];
BEGIN
    -- Captura identidade do usuário ativo
    v_id_usuario := auth.uid();

    -- Captura IP se disponível nos headers da sessão Supabase/PostgREST
    BEGIN
        v_ip := current_setting('request.headers', true)::json->>'x-forwarded-for';
    EXCEPTION WHEN OTHERS THEN
        v_ip := NULL;
    END;

    -- Extrai o e-mail do usuário se disponível
    IF v_id_usuario IS NOT NULL THEN
        SELECT email INTO v_user_email FROM auth.users WHERE id = v_id_usuario;
    END IF;

    -- ── Tratamento por tabela ─────────────────────────────────────────────────
    IF v_tabela = 'pacientes' THEN
        -- Para pacientes, gravar SOMENTE IDs e NOMES das colunas, sem valores identificáveis
        IF TG_OP = 'INSERT' THEN
            v_registro_id := NEW.id;
            v_clinica_id  := COALESCE(NEW.clinica_id, public.get_my_clinica_id());

            SELECT array_agg(key ORDER BY key)
            INTO v_colunas
            FROM jsonb_each(to_jsonb(NEW))
            WHERE value IS NOT NULL AND value != '""'::jsonb;

            v_dados_ant := NULL;
            v_dados_nov := jsonb_build_object(
                'id', NEW.id,
                'clinica_id', NEW.clinica_id,
                'colunas_inseridas', to_jsonb(COALESCE(v_colunas, '{}'::text[]))
            );

        ELSIF TG_OP = 'UPDATE' THEN
            v_registro_id := NEW.id;
            v_clinica_id  := COALESCE(NEW.clinica_id, OLD.clinica_id, public.get_my_clinica_id());

            SELECT array_agg(key ORDER BY key)
            INTO v_colunas
            FROM jsonb_each(to_jsonb(NEW)) n
            FULL OUTER JOIN jsonb_each(to_jsonb(OLD)) o USING (key)
            WHERE n.value IS DISTINCT FROM o.value;

            v_dados_ant := jsonb_build_object(
                'id', OLD.id,
                'clinica_id', OLD.clinica_id,
                'colunas_alteradas', to_jsonb(COALESCE(v_colunas, '{}'::text[]))
            );
            v_dados_nov := jsonb_build_object(
                'id', NEW.id,
                'clinica_id', NEW.clinica_id,
                'colunas_alteradas', to_jsonb(COALESCE(v_colunas, '{}'::text[]))
            );

        ELSIF TG_OP = 'DELETE' THEN
            v_registro_id := OLD.id;
            v_clinica_id  := COALESCE(OLD.clinica_id, public.get_my_clinica_id());

            v_dados_ant := jsonb_build_object(
                'id', OLD.id,
                'clinica_id', OLD.clinica_id
            );
            v_dados_nov := NULL;
        END IF;

    ELSIF v_tabela IN ('prontuarios', 'evolucao') THEN
        -- LGPD & CFO: Prontuários e evolução gravam APENAS metadados de rastreabilidade
        -- NENHUM conteúdo clínico (descricao, tratamento, dados do paciente) é gravado no log
        IF TG_OP = 'INSERT' THEN
            v_registro_id := NEW.id;
            v_clinica_id  := COALESCE(NEW.clinica_id, public.get_my_clinica_id());

            SELECT array_agg(key ORDER BY key)
            INTO v_colunas
            FROM jsonb_each(to_jsonb(NEW))
            WHERE value IS NOT NULL AND value != '""'::jsonb;

            v_dados_ant := NULL;
            IF v_tabela = 'prontuarios' THEN
                v_dados_nov := jsonb_build_object(
                    'id', NEW.id,
                    'clinica_id', NEW.clinica_id,
                    'paciente_id', NEW.paciente_id,
                    'dentista_id', NEW.dentista_id,
                    'tipo_registro', NEW.tipo_registro,
                    'status', NEW.status,
                    'data_registro', NEW.data_registro,
                    'finalizado', NEW.finalizado,
                    'finalizado_em', NEW.finalizado_em,
                    'prontuario_origem_id', NEW.prontuario_origem_id,
                    'versao_anterior_id', NEW.versao_anterior_id,
                    'colunas_inseridas', to_jsonb(COALESCE(v_colunas, '{}'::text[]))
                );
            ELSE
                v_dados_nov := jsonb_build_object(
                    'id', NEW.id,
                    'clinica_id', NEW.clinica_id,
                    'paciente_id', NEW.paciente_id,
                    'dentista_id', NEW.dentista_id,
                    'colunas_inseridas', to_jsonb(COALESCE(v_colunas, '{}'::text[]))
                );
            END IF;

        ELSIF TG_OP = 'UPDATE' THEN
            v_registro_id := NEW.id;
            v_clinica_id  := COALESCE(NEW.clinica_id, OLD.clinica_id, public.get_my_clinica_id());

            SELECT array_agg(key ORDER BY key)
            INTO v_colunas
            FROM jsonb_each(to_jsonb(NEW)) n
            FULL OUTER JOIN jsonb_each(to_jsonb(OLD)) o USING (key)
            WHERE n.value IS DISTINCT FROM o.value;

            IF v_tabela = 'prontuarios' THEN
                v_dados_ant := jsonb_build_object(
                    'id', OLD.id,
                    'clinica_id', OLD.clinica_id,
                    'paciente_id', OLD.paciente_id,
                    'status', OLD.status,
                    'colunas_alteradas', to_jsonb(COALESCE(v_colunas, '{}'::text[]))
                );
                v_dados_nov := jsonb_build_object(
                    'id', NEW.id,
                    'clinica_id', NEW.clinica_id,
                    'paciente_id', NEW.paciente_id,
                    'status', NEW.status,
                    'colunas_alteradas', to_jsonb(COALESCE(v_colunas, '{}'::text[]))
                );
            ELSE
                v_dados_ant := jsonb_build_object(
                    'id', OLD.id,
                    'clinica_id', OLD.clinica_id,
                    'paciente_id', OLD.paciente_id,
                    'colunas_alteradas', to_jsonb(COALESCE(v_colunas, '{}'::text[]))
                );
                v_dados_nov := jsonb_build_object(
                    'id', NEW.id,
                    'clinica_id', NEW.clinica_id,
                    'paciente_id', NEW.paciente_id,
                    'colunas_alteradas', to_jsonb(COALESCE(v_colunas, '{}'::text[]))
                );
            END IF;

        ELSIF TG_OP = 'DELETE' THEN
            v_registro_id := OLD.id;
            v_clinica_id  := COALESCE(OLD.clinica_id, public.get_my_clinica_id());

            v_dados_ant := jsonb_build_object(
                'id', OLD.id,
                'clinica_id', OLD.clinica_id,
                'paciente_id', OLD.paciente_id
            );
            v_dados_nov := NULL;
        END IF;

    ELSE
        -- Demais tabelas do sistema
        IF TG_OP = 'INSERT' THEN
            v_registro_id := NEW.id;
            v_clinica_id  := COALESCE(NEW.clinica_id, public.get_my_clinica_id());
            v_dados_nov   := to_jsonb(NEW);

        ELSIF TG_OP = 'UPDATE' THEN
            v_registro_id := NEW.id;
            v_clinica_id  := COALESCE(NEW.clinica_id, OLD.clinica_id, public.get_my_clinica_id());
            v_dados_ant   := to_jsonb(OLD);
            v_dados_nov   := to_jsonb(NEW);

        ELSIF TG_OP = 'DELETE' THEN
            v_registro_id := OLD.id;
            v_clinica_id  := COALESCE(OLD.clinica_id, public.get_my_clinica_id());
            v_dados_ant   := to_jsonb(OLD);
        END IF;
    END IF;

    -- Gravação inviolável na trilha de auditoria
    INSERT INTO private.audit_logs (
        clinica_id,
        id_usuario,
        user_email,
        acao,
        tabela,
        registro_id,
        dados_anteriores,
        dados_novos,
        data_hora,
        ip,
        origem
    ) VALUES (
        v_clinica_id,
        v_id_usuario,
        v_user_email,
        v_acao,
        v_tabela,
        v_registro_id,
        v_dados_ant,
        v_dados_nov,
        now(),
        v_ip,
        'postgres_trigger'
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

COMMENT ON FUNCTION private.fn_audit_trigger() IS
    'Trigger de auditoria LGPD. Para pacientes e prontuarios/evolucao: grava SOMENTE IDs e metadados '
    'de rastreabilidade, sem qualquer conteúdo clínico ou dado pessoal identificável.';

REVOKE ALL ON FUNCTION private.fn_audit_trigger() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.fn_audit_trigger() TO service_role;


-- ── 2. Atualização de stripe_should_activate_on_invoice ────────────────────────
DROP FUNCTION IF EXISTS public.stripe_should_activate_on_invoice(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ);

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

  -- Fallback por customer_id se não encontrou pela subscription (nova sub para mesmo cliente)
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

  -- 2. Tratamento estrito quando a clínica está cancelada
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
    -- (Não usa event.created nem invoice_period_end; remove fallback sem comprovação)
    IF p_subscription_created IS NULL THEN
      RETURN QUERY SELECT
        v_clinica.id,
        FALSE,
        'Ausência de comprovação temporal de subscription.created confiável — reativação bloqueada';
      RETURN;
    END IF;

    -- Bloqueio 4: Assinatura criada antes ou durante o cancelamento registrado
    -- Mesmo que seu evento de fatura seja gerado/recebido posteriormente
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

  -- Clínica com assinatura não cancelada (ativo, trial, inadimplente): fatura autorizada
  RETURN QUERY SELECT v_clinica.id, TRUE, NULL::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.stripe_should_activate_on_invoice(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stripe_should_activate_on_invoice(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ)
  TO service_role;

COMMENT ON FUNCTION public.stripe_should_activate_on_invoice IS
  'Valida se fatura pode reativar clínica cancelada. Exige comprovação temporal real de subscription.created '
  'posterior a cancelamento_em. Sem fallbacks sem timestamp.';

COMMIT;

