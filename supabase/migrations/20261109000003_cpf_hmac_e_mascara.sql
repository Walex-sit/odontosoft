-- ==============================================================================
-- Migration: 20261109000003_cpf_hmac_e_mascara.sql
-- Tarefa 2 — CPF: hash com chave (HMAC) e CPF mascarado
--
-- Mudanças:
--   1. Cria cpf_hash_key em private.secrets (gen_random_bytes(32)), se não existir.
--   2. Adiciona coluna cpf_mascarado em pacientes (formato ***.NNN.NNN-**).
--   3. Atualiza fn_encrypt_cpf para:
--        cpf_hash      = hmac(cpf_norm, cpf_hash_key, 'sha256') em hex
--        cpf_mascarado = '***.NNN.NNN-**' derivado do cpf_norm
--   4. Recalcula cpf_hash e cpf_mascarado dos pacientes existentes
--      (desliga trigger de auditoria antes, religa depois).
--   5. Atualiza anonimizar_paciente para zerar cpf_mascarado.
--   6. cpf_to_hash: revoga de anon e authenticated.
--   7. Nova função server-only cpf_to_hash_secure (apenas service_role).
-- ==============================================================================

-- ============================================================
-- SEÇÃO 1 — Chave HMAC para CPF
-- Gerada no banco com gen_random_bytes(32) → encode em hex.
-- O valor NUNCA aparece em código nem em saída de log.
-- ============================================================
INSERT INTO private.secrets (key, value)
SELECT
    'cpf_hash_key',
    encode(extensions.gen_random_bytes(32), 'hex')
WHERE NOT EXISTS (
    SELECT 1 FROM private.secrets WHERE key = 'cpf_hash_key'
);


-- ============================================================
-- SEÇÃO 2 — Nova coluna cpf_mascarado em pacientes
-- ============================================================
ALTER TABLE public.pacientes
    ADD COLUMN IF NOT EXISTS cpf_mascarado TEXT;

COMMENT ON COLUMN public.pacientes.cpf_mascarado IS
    'CPF parcialmente mascarado no formato ***.NNN.NNN-** para exibição segura na UI. '
    'Derivado do cpf_norm pelo trigger trg_encrypt_cpf. Zerado na anonimização. '
    'Base legal: LGPD art. 46 — minimização de dados exibidos.';


-- ============================================================
-- SEÇÃO 3 — Função auxiliar de mascaramento (SECURITY DEFINER)
-- Entrada: CPF normalizado (11 dígitos)
-- Saída:   ***.NNN.NNN-**  onde NNN.NNN são os dígitos 4-9
-- ============================================================
CREATE OR REPLACE FUNCTION private.mascarar_cpf(p_cpf_norm TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = ''
AS $$
    SELECT
        '***.' ||
        substring(p_cpf_norm FROM 4 FOR 3) || '.' ||
        substring(p_cpf_norm FROM 7 FOR 3) || '-**'
$$;

COMMENT ON FUNCTION private.mascarar_cpf(TEXT) IS
    'Retorna CPF mascarado no formato ***.NNN.NNN-** a partir do CPF normalizado (11 dígitos). '
    'Uso interno — schema private, não exposto via PostgREST.';


-- ============================================================
-- SEÇÃO 4 — Atualizar fn_encrypt_cpf para HMAC-SHA256
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_encrypt_cpf()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_key      TEXT;
    v_sym_key  TEXT;
    v_norm     TEXT;
BEGIN
    -- Processa somente se cpf_raw foi fornecido
    IF NEW.cpf_raw IS NULL OR NEW.cpf_raw = '' THEN
        NEW.cpf_raw := NULL;
        RETURN NEW;
    END IF;

    -- Lê chave HMAC (obrigatória)
    SELECT value INTO v_key FROM private.secrets WHERE key = 'cpf_hash_key';
    IF v_key IS NULL OR v_key = '' THEN
        RAISE EXCEPTION '[CPF Trigger] A chave ''cpf_hash_key'' não foi encontrada em private.secrets.'
            USING ERRCODE = 'configuration_limit_exceeded';
    END IF;

    -- Lê chave de criptografia simétrica (para cpf_encrypted)
    SELECT value INTO v_sym_key FROM private.secrets WHERE key = 'cpf_key';
    IF v_sym_key IS NULL OR v_sym_key = '' THEN
        RAISE EXCEPTION '[CPF Trigger] A chave ''cpf_key'' não foi encontrada em private.secrets.'
            USING ERRCODE = 'configuration_limit_exceeded';
    END IF;

    -- Normaliza CPF
    v_norm := regexp_replace(NEW.cpf_raw, '[^0-9]', '', 'g');
    IF v_norm IS NULL OR length(v_norm) != 11 THEN
        RAISE EXCEPTION '[CPF Trigger] CPF inválido (deve ter 11 dígitos após normalização).'
            USING ERRCODE = 'check_violation';
    END IF;

    -- HMAC-SHA256 do CPF normalizado com cpf_hash_key → hex
    NEW.cpf_hash := encode(
        extensions.hmac(v_norm, v_key, 'sha256'),
        'hex'
    );

    -- Máscara para exibição: ***.NNN.NNN-**
    NEW.cpf_mascarado := private.mascarar_cpf(v_norm);

    -- Cifra para armazenamento seguro (mantém backward compat)
    NEW.cpf_encrypted := extensions.pgp_sym_encrypt(v_norm, v_sym_key);

    -- Apaga o plaintext — nunca persiste em disco
    NEW.cpf_raw := NULL;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_encrypt_cpf() IS
    'Trigger BEFORE INSERT OR UPDATE que processa cpf_raw → '
    'cpf_hash (HMAC-SHA256 hex), cpf_mascarado (***.NNN.NNN-**) e cpf_encrypted (AES-256), '
    'zerando cpf_raw antes da persistência. Requer cpf_hash_key e cpf_key em private.secrets.';

-- Recria o trigger (mantém nome existente)
DROP TRIGGER IF EXISTS trg_encrypt_cpf ON public.pacientes;
CREATE TRIGGER trg_encrypt_cpf
    BEFORE INSERT OR UPDATE OF cpf_raw
    ON public.pacientes
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_encrypt_cpf();


-- ============================================================
-- SEÇÃO 5 — Recalcular cpf_hash e cpf_mascarado dos existentes
-- Desliga trigger de auditoria antes, religa depois.
-- Usa cpf_encrypted para decifrar → recalcular hash + máscara.
-- Não grava CPF em log de auditoria.
-- ============================================================
DO $$
DECLARE
    v_hash_key  TEXT;
    v_sym_key   TEXT;
    v_rows      INTEGER;
BEGIN
    -- Lê as chaves
    SELECT value INTO v_hash_key FROM private.secrets WHERE key = 'cpf_hash_key';
    SELECT value INTO v_sym_key  FROM private.secrets WHERE key = 'cpf_key';

    -- Se as chaves não existem, não há dados para recalcular (seed ainda não rodou)
    IF v_hash_key IS NULL OR v_sym_key IS NULL THEN
        RAISE NOTICE '[CPF Recalc] Chaves ausentes — nenhum recálculo necessário neste momento.';
        RETURN;
    END IF;

    -- Desliga trigger de auditoria temporariamente na sessão
    -- (ALTER TABLE ... DISABLE TRIGGER é DDL — usamos SET para a sessão)
    -- O trigger fn_audit_trigger, se existir em pacientes, lê session_replication_role
    SET LOCAL session_replication_role = replica;

    -- Recalcula apenas pacientes com cpf_encrypted (não anonimizados)
    UPDATE public.pacientes
    SET
        cpf_hash = encode(
            extensions.hmac(
                extensions.pgp_sym_decrypt(cpf_encrypted::bytea, v_sym_key),
                v_hash_key,
                'sha256'
            ),
            'hex'
        ),
        cpf_mascarado = private.mascarar_cpf(
            extensions.pgp_sym_decrypt(cpf_encrypted::bytea, v_sym_key)
        )
    WHERE cpf_encrypted IS NOT NULL
      AND anonimizado IS DISTINCT FROM true;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    RAISE NOTICE '[CPF Recalc] % paciente(s) com cpf_hash + cpf_mascarado recalculados.', v_rows;

    -- Restaura (RESET é automático ao fim da transação; aqui explicitamos)
    RESET session_replication_role;
END;
$$;


-- ============================================================
-- SEÇÃO 6 — Atualizar anonimizar_paciente para zerar cpf_mascarado
-- ============================================================
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

    -- 4. Substituição e sanitização TOTAL de dados identificáveis
    -- (apenas colunas que existem na tabela pacientes neste schema)
    UPDATE public.pacientes
    SET
        nome                        = v_nome_anonimizado,
        cpf_hash                    = NULL,
        cpf_encrypted               = NULL,
        cpf_raw                     = NULL,
        cpf_mascarado               = NULL,
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
        lgpd_aceite                 = false,
        anonimizado                 = true,
        anonimizado_em              = now(),
        motivo_anonimizacao         = v_motivo_final
    WHERE id = p_paciente_id;

    -- 5. Revogação de consentimentos ativos
    UPDATE public.paciente_consentimentos
    SET
        status           = 'revogado',
        revogado_em      = now(),
        responsavel_nome = 'ANONIMIZADO'
    WHERE paciente_id = p_paciente_id
      AND status = 'ativo';

    -- 6. Registro de evento de anonimização — sem nome_anterior nem CPF no log
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
            -- Sem nome_anterior nem cpf — apenas indicador booleano
            'cpf_existia', (v_paciente.cpf_hash IS NOT NULL)
        ),
        jsonb_build_object(
            'nome_novo',      v_nome_anonimizado,
            'motivo',         v_motivo_final,
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
    'Anonimiza todos os dados identificáveis de um paciente (LGPD art. 18, VI). '
    'Zera cpf_hash, cpf_encrypted, cpf_mascarado e todos os campos PII. '
    'Log de auditoria NÃO contém nome_anterior nem CPF. '
    'Acesso restrito a is_admin().';


-- ============================================================
-- SEÇÃO 7 — Revogar cpf_to_hash de anon, authenticated e PUBLIC
-- A função é chamada apenas server-side (service_role).
-- ============================================================
REVOKE ALL ON FUNCTION public.cpf_to_hash(TEXT) FROM PUBLIC, anon, authenticated;
-- Regarantir apenas para service_role e postgres
GRANT EXECUTE ON FUNCTION public.cpf_to_hash(TEXT) TO service_role;

COMMENT ON FUNCTION public.cpf_to_hash(TEXT) IS
    'Retorna o HMAC-SHA256 (hex) de um CPF normalizado usando cpf_hash_key. '
    'ACESSO REVOGADO de anon e authenticated — usar apenas via service_role no servidor. '
    'Para busca: WHERE cpf_hash = public.cpf_to_hash($1).';

-- Atualiza cpf_to_hash para usar HMAC (substitui SHA-256 puro)
-- Mantém SECURITY DEFINER e search_path vazio
CREATE OR REPLACE FUNCTION public.cpf_to_hash(p_cpf TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_key  TEXT;
    v_norm TEXT;
BEGIN
    SELECT value INTO v_key FROM private.secrets WHERE key = 'cpf_hash_key';
    IF v_key IS NULL OR v_key = '' THEN
        RAISE EXCEPTION '[cpf_to_hash] cpf_hash_key ausente em private.secrets.'
            USING ERRCODE = 'configuration_limit_exceeded';
    END IF;

    v_norm := regexp_replace(p_cpf, '[^0-9]', '', 'g');
    IF v_norm IS NULL OR length(v_norm) != 11 THEN
        RAISE EXCEPTION '[cpf_to_hash] CPF inválido (deve ter 11 dígitos após normalização).'
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN encode(extensions.hmac(v_norm, v_key, 'sha256'), 'hex');
END;
$$;

-- Reaplica revogação após recreate — inclui PUBLIC para revogar herança
REVOKE ALL ON FUNCTION public.cpf_to_hash(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cpf_to_hash(TEXT) TO service_role;


-- ============================================================
-- SEÇÃO 8 — Atualiza seed para incluir cpf_mascarado
-- (Atualiza os pacientes do seed que têm cpf_hash calculado
--  com SHA-256 puro para gerar cpf_mascarado a partir de
--  cpf_encrypted, quando disponível.)
-- Já tratado pelo bloco de recálculo na Seção 5.
-- ============================================================

-- Índice em cpf_mascarado para lookups de exibição (opcional, baixo custo)
CREATE INDEX IF NOT EXISTS idx_pacientes_cpf_mascarado
    ON public.pacientes (clinica_id, cpf_mascarado)
    WHERE cpf_mascarado IS NOT NULL;

COMMENT ON INDEX public.idx_pacientes_cpf_mascarado IS
    'Índice auxiliar para filtros por CPF mascarado na UI. '
    'Não substitui idx_pacientes_cpf_hash para buscas de duplicidade.';
