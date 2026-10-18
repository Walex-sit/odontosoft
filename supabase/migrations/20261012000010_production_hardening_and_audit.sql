-- ==============================================================================
-- Migration: 20261012000010_production_hardening_and_audit.sql
-- Descrição: Hardening de Produção, Idempotência de Webhooks,
--            Blindagem Total de Anonimização (LGPD) e Imutabilidade CFO em Evoluções
-- ==============================================================================

-- ============================================================
-- SEÇÃO 1 — IDEMPOTÊNCIA DE WEBHOOKS STRIPE (MOTOR FINANCEIRO)
-- ============================================================

CREATE TABLE IF NOT EXISTS private.stripe_webhook_events (
    id           TEXT PRIMARY KEY,
    event_type   TEXT NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

REVOKE ALL ON TABLE private.stripe_webhook_events FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE private.stripe_webhook_events IS
    'Tabela de controle de idempotência para webhooks do gateway de pagamentos. '
    'Evita reprocessamento de eventos duplicados (at-least-once delivery da Stripe).';


-- ============================================================
-- SEÇÃO 2 — BLINDAGEM TOTAL DA ANONIMIZAÇÃO (LGPD ART. 18)
-- ============================================================

-- Atualiza a RPC anonimizar_paciente para limpar 100% dos dados identificáveis,
-- incluindo contatos de emergência, responsáveis, fotos e telefones adicionais
CREATE OR REPLACE FUNCTION public.anonimizar_paciente(
    p_paciente_id UUID,
    p_motivo      TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, extensions
AS $$
DECLARE
    v_clinica_id        UUID;
    v_paciente          RECORD;
    v_nome_anonimizado  TEXT;
    v_motivo_final      TEXT;
    v_resultado         JSONB;
BEGIN
    -- 1. Verificação estrita de autorização
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Apenas administradores da clínica ou o DPO podem realizar anonimização de dados.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    v_clinica_id := public.get_my_clinica_id();
    IF v_clinica_id IS NULL THEN
        RAISE EXCEPTION 'Clínica não identificada para o usuário autenticado.'
            USING ERRCODE = 'data_exception';
    END IF;

    -- 2. Localiza o paciente garantindo isolamento do tenant
    SELECT * INTO v_paciente
    FROM public.pacientes
    WHERE id = p_paciente_id
      AND clinica_id = v_clinica_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Paciente não encontrado na clínica.'
            USING ERRCODE = 'no_data_found';
    END IF;

    IF v_paciente.anonimizado = true THEN
        RAISE EXCEPTION 'Este paciente já foi anonimizado em %.', v_paciente.anonimizado_em
            USING ERRCODE = 'duplicate_object';
    END IF;

    -- 3. Prepara pseudônimo e justificativa legal
    v_nome_anonimizado := 'PACIENTE ANONIMIZADO #' || UPPER(SUBSTRING(p_paciente_id::text FROM 1 FOR 8));
    v_motivo_final := COALESCE(
        p_motivo,
        'Exercício de Direito do Titular (LGPD art. 18, VI). Registros clínicos e fiscais preservados de forma dissociada para conformidade com a Resolução CFO nº 198/2019 e Lei nº 5.081/1966.'
    );

    -- 4. Substituição e sanitização TOTAL de dados identificáveis diretos e indiretos
    UPDATE public.pacientes
    SET
        nome                        = v_nome_anonimizado,
        cpf_hash                    = NULL,
        cpf_encrypted               = NULL,
        cpf_raw                     = NULL,
        rg                          = NULL,
        data_nascimento             = NULL,
        genero                      = NULL,
        telefone                    = NULL,
        whatsapp                    = false,
        email                       = NULL,
        cep                         = NULL,
        rua                         = NULL,
        numero                      = NULL,
        bairro                      = NULL,
        cidade                      = NULL,
        endereco                    = NULL,
        convenio                    = NULL,
        celular                     = NULL,
        ddi                         = NULL,
        ddd                         = NULL,
        telefone_fixo               = NULL,
        lembrete_automatico         = NULL,
        como_conheceu               = NULL,
        profissao                   = NULL,
        estrangeiro                 = false,
        observacoes                 = NULL,
        categoria                   = NULL,
        categoria_id                = NULL,
        contato_emergencia_nome     = NULL,
        contato_emergencia_telefone = NULL,
        contato_emerg_nome          = NULL,
        contato_emerg_telefone      = NULL,
        complemento                 = NULL,
        estado                      = NULL,
        responsavel_nome            = NULL,
        responsavel_cpf             = NULL,
        responsavel_nascimento      = NULL,
        titular_convenio            = NULL,
        numero_carteirinha          = NULL,
        cpf_responsavel_convenio    = NULL,
        lembretes                   = NULL,
        foto_url                    = NULL,
        lgpd_aceite                 = false,
        anonimizado                 = true,
        anonimizado_em              = now(),
        motivo_anonimizacao         = v_motivo_final
    WHERE id = p_paciente_id;

    -- 5. Revogação de consentimentos ativos associados
    UPDATE public.paciente_consentimentos
    SET
        status           = 'revogado',
        revogado_em      = now(),
        responsavel_nome = 'ANONIMIZADO'
    WHERE paciente_id = p_paciente_id
      AND status = 'ativo';

    -- 6. Registro de evento específico de anonimização no log estrito privado
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
        origem
    ) VALUES (
        v_clinica_id,
        auth.uid(),
        (SELECT email FROM auth.users WHERE id = auth.uid()),
        'ANONYMIZE',
        'pacientes',
        p_paciente_id,
        jsonb_build_object(
            'nome_anterior', v_paciente.nome,
            'cpf_existia', (v_paciente.cpf_hash IS NOT NULL)
        ),
        jsonb_build_object(
            'nome_novo', v_nome_anonimizado,
            'motivo', v_motivo_final,
            'anonimizado_em', now()
        ),
        now(),
        'rpc_anonimizar_paciente'
    );

    v_resultado := jsonb_build_object(
        'success', true,
        'paciente_id', p_paciente_id,
        'nome_anonimizado', v_nome_anonimizado,
        'anonimizado_em', now(),
        'mensagem', 'Paciente anonimizado com sucesso conforme LGPD Art. 18 e CFO 198/2019.'
    );

    RETURN v_resultado;
END;
$$;


-- ============================================================
-- SEÇÃO 3 — IMUTABILIDADE DA TABELA EVOLUCAO (CFO 198/2019)
-- ============================================================

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'evolucao') THEN
        CREATE OR REPLACE FUNCTION public.bloquear_delete_evolucao()
        RETURNS TRIGGER
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public
        AS $inner$
        BEGIN
            RAISE EXCEPTION
                '[CFO 198/2019] Exclusão física de registros de evolução clínica é expressamente proibida. '
                'Base legal: Resolução CFO nº 198/2019.'
            USING ERRCODE = 'restrict_violation';
            RETURN NULL;
        END;
        $inner$;

        DROP TRIGGER IF EXISTS trg_bloquear_delete_evolucao ON public.evolucao;
        CREATE TRIGGER trg_bloquear_delete_evolucao
            BEFORE DELETE ON public.evolucao
            FOR EACH ROW
            EXECUTE FUNCTION public.bloquear_delete_evolucao();

        -- RLS Delete proibido em evolucao
        DROP POLICY IF EXISTS "evolucao_delete_proibido" ON public.evolucao;
        CREATE POLICY "evolucao_delete_proibido" ON public.evolucao
            FOR DELETE USING (false);
    END IF;
END $$;


-- ============================================================
-- SEÇÃO 4 — POLÍTICA RLS PARA TABELA ROLES
-- ============================================================

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'roles') THEN
        DROP POLICY IF EXISTS "roles_read_authenticated" ON public.roles;
        CREATE POLICY "roles_read_authenticated" ON public.roles
            FOR SELECT TO authenticated
            USING (true);
    END IF;
END $$;
