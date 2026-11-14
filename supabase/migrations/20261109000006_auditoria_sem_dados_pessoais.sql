-- =============================================================================
-- Migration: 20261109000006_auditoria_sem_dados_pessoais.sql
-- Tarefa 5 — Auditoria sem dados pessoais
--
-- Alterações:
--   1. Reescreve private.fn_audit_trigger() para a tabela 'pacientes':
--      • Gravar SOMENTE ids e NOMES das colunas alteradas/inseridas,
--        sem valores de colunas identificáveis (nome, email, CPF, endereço, etc.).
--   2. Reescreve public.anonimizar_paciente(): remove 'nome_anterior' do
--      log de auditoria.
--   3. prontuários e evolução: NÃO alterar (aguardando decisão do advogado/DPO).
-- =============================================================================

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
        -- TAREFA 5: Para pacientes, gravar SOMENTE IDs e NOMES das colunas,
        -- sem NENHUM valor de dado pessoal identificável.

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

            -- Identifica apenas os NOMES das colunas que sofreram alteração
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

    ELSE
        -- Comportamento original para tabelas não-pacientes (prontuarios, evolucao, etc.)
        -- Decisão sobre prontuários e evolução mantida intacta até orientação jurídica/DPO.
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
    'Trigger de auditoria LGPD. Para "pacientes": grava SOMENTE IDs e NOMES das colunas alteradas/inseridas, '
    'sem qualquer valor pessoal identificável. Demais tabelas (prontuarios, etc.) permanecem intactas (Tarefa 5).';

REVOKE ALL ON FUNCTION private.fn_audit_trigger() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.fn_audit_trigger() TO service_role;


-- =============================================================================
-- SEÇÃO 2 — anonimizar_paciente(): remove 'nome_anterior' do log
-- =============================================================================

CREATE OR REPLACE FUNCTION public.anonimizar_paciente(
    p_paciente_id UUID,
    p_motivo      TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

    -- 2. Localiza o paciente garantindo pertencimento ao tenant
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

    -- 4. Substituição de dados identificáveis (Direito ao esquecimento sem corromper guarda legal)
    UPDATE public.pacientes
    SET
        nome                = v_nome_anonimizado,
        cpf_hash            = NULL,
        cpf_encrypted       = NULL,
        cpf_raw             = NULL,
        cpf_mascarado       = NULL,
        rg                  = NULL,
        data_nascimento     = NULL,
        genero              = NULL,
        telefone            = NULL,
        whatsapp            = false,
        email               = NULL,
        cep                 = NULL,
        rua                 = NULL,
        numero              = NULL,
        bairro              = NULL,
        cidade              = NULL,
        endereco            = NULL,
        convenio            = NULL,
        lgpd_aceite         = false,
        anonimizado         = true,
        anonimizado_em      = now(),
        motivo_anonimizacao = v_motivo_final
    WHERE id = p_paciente_id;

    -- 5. Revogação de consentimentos ativos associados
    UPDATE public.paciente_consentimentos
    SET
        status           = 'revogado',
        revogado_em      = now(),
        responsavel_nome = 'ANONIMIZADO'
    WHERE paciente_id = p_paciente_id
      AND status = 'ativo';

    -- 6. Registro de evento no log estrito — SEM nome_anterior nem dados identificáveis
    --    TAREFA 5: 'nome_anterior' removido.
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
            -- TAREFA 5: nome_anterior removido
            'cpf_existia', (v_paciente.cpf_hash IS NOT NULL)
        ),
        jsonb_build_object(
            'motivo', v_motivo_final,
            'anonimizado_em', now()
        ),
        now(),
        'rpc_anonimizar_paciente'
    );

    v_resultado := jsonb_build_object(
        'success',          true,
        'paciente_id',      p_paciente_id,
        'nome_anonimizado', v_nome_anonimizado,
        'anonimizado_em',   now(),
        'mensagem',         'Paciente anonimizado com sucesso conforme LGPD Art. 18 e CFO 198/2019.'
    );

    RETURN v_resultado;
END;
$$;

COMMENT ON FUNCTION public.anonimizar_paciente(UUID, TEXT) IS
    'Tarefa 5: Anonimiza dados identificáveis do paciente (LGPD art. 18, VI) sem gravar nome_anterior '
    'no log de auditoria. Preserva prontuários e movimentações de forma dissociada para guarda legal.';
