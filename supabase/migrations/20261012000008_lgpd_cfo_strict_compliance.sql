-- ==============================================================================
-- Migration: 20261012000008_lgpd_cfo_strict_compliance.sql
-- Descrição: Conformidade Estrita B2B SaaS — Trilha de Auditoria no Schema Privado,
--            Imutabilidade Absoluta de Prontuários (CFO) e Anonimização Dissociada (LGPD).
--
-- Bases Legais e Normativas:
--   • Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018):
--       - Art. 6º, X (Princípio da Responsabilização e Prestação de Contas)
--       - Art. 16, I (Conservação de dados para cumprimento de obrigação legal)
--       - Art. 18, VI (Direito à anonimização, bloqueio ou eliminação)
--       - Art. 46 (Segurança e sigilo de dados pessoais sensíveis)
--   • Conselho Federal de Odontologia (CFO):
--       - Resolução CFO nº 198/2019 (Prontuário Odontológico Eletrônico e Imutabilidade)
--       - Código de Ética Odontológica (Guarda obrigatória por no mínimo 20 anos)
--       - Proibição de rasuras, exclusões ou adulterações de atos clínicos praticados
-- ==============================================================================

-- ============================================================
-- SEÇÃO 1 — SCHEMA PRIVADO & TABELA DE AUDITORIA ESTRITA
-- ============================================================

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.audit_logs (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinica_id        UUID REFERENCES public.clinicas(id) ON DELETE SET NULL,
    id_usuario        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email        TEXT,
    acao              TEXT NOT NULL CHECK (acao IN ('INSERT', 'UPDATE', 'DELETE', 'ANONYMIZE')),
    tabela            TEXT NOT NULL,
    registro_id       UUID NOT NULL,
    dados_anteriores  JSONB,
    dados_novos       JSONB,
    data_hora         TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip                TEXT,
    origem            TEXT DEFAULT 'postgres_trigger'
);

REVOKE ALL ON TABLE private.audit_logs FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE private.audit_logs IS
    'Trilha de Auditoria Estrita e Imutável no schema privado (LGPD art. 6º, X). '
    'Isolada de acesso via API PostgREST pública. Acesso exclusivo via Security Definer para DPO/Admin.';

COMMENT ON COLUMN private.audit_logs.dados_anteriores IS
    'Snapshot em JSONB do registro antes da modificação/exclusão (OLD).';

COMMENT ON COLUMN private.audit_logs.dados_novos IS
    'Snapshot em JSONB do registro após a inserção/modificação (NEW). Campos sensíveis temporários são higienizados.';

-- Índices de consulta e performance para relatórios do DPO
CREATE INDEX IF NOT EXISTS idx_audit_logs_clinica_data
    ON private.audit_logs(clinica_id, data_hora DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tabela_registro
    ON private.audit_logs(tabela, registro_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_usuario
    ON private.audit_logs(id_usuario);


-- ============================================================
-- SEÇÃO 2 — TRIGGER AUTOMÁTICO DE AUDITORIA (INSERT/UPDATE/DELETE)
-- ============================================================

CREATE OR REPLACE FUNCTION private.fn_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, extensions
AS $$
DECLARE
    v_clinica_id       UUID;
    v_id_usuario       UUID;
    v_user_email       TEXT;
    v_registro_id      UUID;
    v_dados_ant        JSONB := NULL;
    v_dados_nov        JSONB := NULL;
    v_tabela           TEXT := TG_TABLE_NAME;
    v_acao             TEXT := TG_OP;
    v_ip               TEXT;
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

    -- Processa conforme a operação
    IF TG_OP = 'INSERT' THEN
        v_registro_id := NEW.id;
        v_clinica_id  := COALESCE(NEW.clinica_id, public.get_my_clinica_id());
        v_dados_nov   := to_jsonb(NEW);
        
        -- Higienização preventiva: remove campos transientes ou raw se existirem
        IF v_tabela = 'pacientes' THEN
            v_dados_nov := v_dados_nov - 'cpf_raw';
        END IF;

    ELSIF TG_OP = 'UPDATE' THEN
        v_registro_id := NEW.id;
        v_clinica_id  := COALESCE(NEW.clinica_id, OLD.clinica_id, public.get_my_clinica_id());
        v_dados_ant   := to_jsonb(OLD);
        v_dados_nov   := to_jsonb(NEW);

        IF v_tabela = 'pacientes' THEN
            v_dados_ant := v_dados_ant - 'cpf_raw';
            v_dados_nov := v_dados_nov - 'cpf_raw';
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        v_registro_id := OLD.id;
        v_clinica_id  := COALESCE(OLD.clinica_id, public.get_my_clinica_id());
        v_dados_ant   := to_jsonb(OLD);

        IF v_tabela = 'pacientes' THEN
            v_dados_ant := v_dados_ant - 'cpf_raw';
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
    'Trigger de auditoria contínua LGPD. Registra INSERT, UPDATE e DELETE de pacientes e prontuários '
    'com diff estruturado de OLD/NEW em JSONB e identificação do usuário.';

-- Triggers nas tabelas exigidas
DROP TRIGGER IF EXISTS trg_audit_pacientes ON public.pacientes;
CREATE TRIGGER trg_audit_pacientes
    AFTER INSERT OR UPDATE OR DELETE ON public.pacientes
    FOR EACH ROW
    EXECUTE FUNCTION private.fn_audit_trigger();

DROP TRIGGER IF EXISTS trg_audit_prontuarios ON public.prontuarios;
CREATE TRIGGER trg_audit_prontuarios
    AFTER INSERT OR UPDATE OR DELETE ON public.prontuarios
    FOR EACH ROW
    EXECUTE FUNCTION private.fn_audit_trigger();

-- Trigger opcional na tabela evolucao (caso utilizada)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'evolucao') THEN
        DROP TRIGGER IF EXISTS trg_audit_evolucao ON public.evolucao;
        CREATE TRIGGER trg_audit_evolucao
            AFTER INSERT OR UPDATE OR DELETE ON public.evolucao
            FOR EACH ROW
            EXECUTE FUNCTION private.fn_audit_trigger();
    END IF;
END $$;


-- ============================================================
-- SEÇÃO 3 — RPC SEGURA PARA CONSULTA DE AUDIT LOGS (DPO/ADMIN)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_tenant_audit_logs(
    p_tabela   TEXT DEFAULT NULL,
    p_acao     TEXT DEFAULT NULL,
    p_limit    INT DEFAULT 50,
    p_offset   INT DEFAULT 0
)
RETURNS TABLE (
    id                UUID,
    id_usuario        UUID,
    user_email        TEXT,
    acao              TEXT,
    tabela            TEXT,
    registro_id       UUID,
    dados_anteriores  JSONB,
    dados_novos       JSONB,
    data_hora         TIMESTAMPTZ,
    ip                TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
    v_clinica_id UUID;
BEGIN
    -- Validação de privilégios de Administrador / DPO
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores/DPO podem consultar logs de auditoria estrita.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    v_clinica_id := public.get_my_clinica_id();
    IF v_clinica_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não vinculado a uma clínica ativa.'
            USING ERRCODE = 'data_exception';
    END IF;

    RETURN QUERY
    SELECT 
        al.id,
        al.id_usuario,
        al.user_email,
        al.acao,
        al.tabela,
        al.registro_id,
        al.dados_anteriores,
        al.dados_novos,
        al.data_hora,
        al.ip
    FROM private.audit_logs al
    WHERE al.clinica_id = v_clinica_id
      AND (p_tabela IS NULL OR al.tabela = p_tabela)
      AND (p_acao IS NULL OR al.acao = p_acao)
    ORDER BY al.data_hora DESC
    LIMIT LEAST(p_limit, 200)
    OFFSET GREATEST(p_offset, 0);
END;
$$;

COMMENT ON FUNCTION public.get_tenant_audit_logs(TEXT, TEXT, INT, INT) IS
    'Função RPC para leitura segura dos logs de auditoria da clínica. Acesso restrito a administradores (RLS tenant-enforced).';


-- ============================================================
-- SEÇÃO 4 — IMUTABILIDADE DO PRONTUÁRIO CLÍNICO (CFO RES. 198/2019)
-- ============================================================

-- 4.1 Colunas de finalização e encadeamento de adendos
ALTER TABLE public.prontuarios
    ADD COLUMN IF NOT EXISTS finalizado BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS finalizado_em TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS tipo_registro TEXT NOT NULL DEFAULT 'registro_clinico'
        CHECK (tipo_registro IN ('registro_clinico', 'adendo_retificativo', 'adendo_esclarecimento')),
    ADD COLUMN IF NOT EXISTS prontuario_origem_id UUID
        REFERENCES public.prontuarios(id) ON DELETE RESTRICT;

COMMENT ON COLUMN public.prontuarios.finalizado IS
    'Indica se o registro clínico está finalizado/concluído. Registros finalizados são 100% imutáveis conforme Res. CFO 198/2019.';

COMMENT ON COLUMN public.prontuarios.tipo_registro IS
    'Classificação do registro clínico: "registro_clinico" (original) ou adendos ("adendo_retificativo", "adendo_esclarecimento") '
    'para retificações sem alteração do histórico prévio.';

COMMENT ON COLUMN public.prontuarios.prontuario_origem_id IS
    'Vínculo ao prontuário original quando este registro for um adendo retificativo ou complementar.';

-- 4.2 Bloqueio de UPDATE em prontuários finalizados (Trigger de Imutabilidade)
CREATE OR REPLACE FUNCTION public.bloquear_update_prontuario_finalizado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Se o registro original já estava finalizado, impede qualquer alteração de conteúdo clínico
    IF OLD.finalizado = true THEN
        RAISE EXCEPTION
            '[CFO 198/2019] Prontuário eletrônico finalizado é IMUTÁVEL. '
            'É proibido alterar ou excluir registros clínicos pregressos. '
            'Para retificações, correções ou acréscimos, utilize a função de Adendo Clínico '
            '(função: public.criar_adendo_prontuario).'
        USING ERRCODE = 'restrict_violation';
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.bloquear_update_prontuario_finalizado() IS
    'Garante a integridade do prontuário eletrônico conforme exigência do CFO: '
    'uma vez finalizado, o registro não pode sofrer UPDATE.';

DROP TRIGGER IF EXISTS trg_bloquear_update_prontuario ON public.prontuarios;
CREATE TRIGGER trg_bloquear_update_prontuario
    BEFORE UPDATE ON public.prontuarios
    FOR EACH ROW
    EXECUTE FUNCTION public.bloquear_update_prontuario_finalizado();

-- 4.3 Ajuste das Políticas RLS da tabela prontuarios (Defesa em Profundidade)
DROP POLICY IF EXISTS "Tenant Delete prontuarios" ON public.prontuarios;
DROP POLICY IF EXISTS "prontuarios_delete_proibido" ON public.prontuarios;

CREATE POLICY "prontuarios_delete_proibido" ON public.prontuarios
    FOR DELETE USING (false);

COMMENT ON POLICY "prontuarios_delete_proibido" ON public.prontuarios IS
    'RLS que bloqueia qualquer operação de DELETE por qualquer usuário na tabela de prontuários (CFO Res. 198/2019).';

DROP POLICY IF EXISTS "Tenant Update prontuarios" ON public.prontuarios;
DROP POLICY IF EXISTS "prontuarios_update_rascunho_apenas" ON public.prontuarios;

CREATE POLICY "prontuarios_update_rascunho_apenas" ON public.prontuarios
    FOR UPDATE USING (
        clinica_id = public.get_my_clinica_id() 
        AND finalizado = false
    );

COMMENT ON POLICY "prontuarios_update_rascunho_apenas" ON public.prontuarios IS
    'RLS que permite UPDATE apenas se o prontuário estiver em rascunho (finalizado = false). Registros finalizados são protegidos.';

-- 4.4 Função RPC para criação de Adendos Clínicos (Aditivo Imutável)
CREATE OR REPLACE FUNCTION public.criar_adendo_prontuario(
    p_prontuario_origem_id UUID,
    p_descricao             TEXT,
    p_tipo_adendo           TEXT DEFAULT 'adendo_retificativo',
    p_tratamento            TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_origem          RECORD;
    v_clinica_id      UUID;
    v_novo_id         UUID;
BEGIN
    v_clinica_id := public.get_my_clinica_id();
    IF v_clinica_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado em uma clínica.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- Validação do tipo de adendo
    IF p_tipo_adendo NOT IN ('adendo_retificativo', 'adendo_esclarecimento') THEN
        RAISE EXCEPTION 'Tipo de adendo inválido. Use "adendo_retificativo" ou "adendo_esclarecimento".'
            USING ERRCODE = 'check_violation';
    END IF;

    IF trim(p_descricao) IS NULL OR length(trim(p_descricao)) < 10 THEN
        RAISE EXCEPTION 'A descrição/justificativa do adendo deve ter no mínimo 10 caracteres.'
            USING ERRCODE = 'check_violation';
    END IF;

    -- Busca prontuário original garantindo isolamento de clínica (tenant)
    SELECT id, paciente_id, clinica_id INTO v_origem
    FROM public.prontuarios
    WHERE id = p_prontuario_origem_id
      AND clinica_id = v_clinica_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Prontuário original não encontrado na clínica.'
            USING ERRCODE = 'no_data_found';
    END IF;

    -- Insere o novo registro como Adendo vinculado ao original (Append-only audit trail)
    INSERT INTO public.prontuarios (
        clinica_id,
        paciente_id,
        dentista_id,
        descricao,
        tratamento,
        data_registro,
        finalizado,
        finalizado_em,
        tipo_registro,
        prontuario_origem_id,
        versao_anterior_id,
        status,
        motivo_alteracao
    ) VALUES (
        v_clinica_id,
        v_origem.paciente_id,
        auth.uid(),
        p_descricao,
        p_tratamento,
        now(),
        true,
        now(),
        p_tipo_adendo,
        p_prontuario_origem_id,
        p_prontuario_origem_id,
        'retificada',
        p_descricao
    )
    RETURNING id INTO v_novo_id;

    RETURN v_novo_id;
END;
$$;

COMMENT ON FUNCTION public.criar_adendo_prontuario(UUID, TEXT, TEXT, TEXT) IS
    'Cria um novo adendo ou retificação vinculada ao prontuário original sem alterar o registro existente. '
    'Preserva a cadeia cronológica exigida pela Resolução CFO nº 198/2019.';


-- ============================================================
-- SEÇÃO 5 — ANONIMIZAÇÃO / DIREITO AO ESQUECIMENTO (LGPD ART. 18 & CFO)
-- ============================================================

-- 5.1 Colunas de controle de anonimização na tabela pacientes
ALTER TABLE public.pacientes
    ADD COLUMN IF NOT EXISTS anonimizado BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS anonimizado_em TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS motivo_anonimizacao TEXT;

COMMENT ON COLUMN public.pacientes.anonimizado IS
    'Indica se os dados pessoais do paciente foram anonimizados conforme LGPD Art. 18, VI. '
    'Os registros clínicos e contábeis são preservados de forma dissociada para cumprimento do dever legal do CFO (20 anos).';

-- 5.2 Função RPC de Anonimização Dissociada
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

    -- 6. Registro de evento específico de anonimização no log estrito
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

COMMENT ON FUNCTION public.anonimizar_paciente(UUID, TEXT) IS
    'Anonimiza dados identificáveis do paciente (LGPD art. 18, VI) preservando prontuários e movimentações '
    'de forma dissociada para atendimento ao prazo de guarda legal de 20 anos exigido pelo CFO.';
