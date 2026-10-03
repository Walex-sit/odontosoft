-- ==============================================================================
-- Migration: 20260923000007_cpf_encryption.sql
-- Descrição: Criptografia de CPF para conformidade LGPD (art. 46 — segurança)
--
-- Estratégia dual de armazenamento (padrão recomendado para dados sensíveis):
--   • cpf_hash    : SHA-256 em hex do CPF normalizado (só dígitos).
--                   Usado para buscas determinísticas (WHERE cpf_hash = digest(...)).
--                   Não reversível — não expõe o CPF real.
--
--   • cpf_encrypted : CPF cifrado com AES-256-CBC via pgp_sym_encrypt().
--                     Reversível apenas com a chave armazenada em private.secrets.
--                     Armazenado em TEXT (saída base64 do pgcrypto).
--
-- Chave de criptografia:
--   Armazenada na tabela privada private.secrets (key = 'cpf_key').
--   O schema private não é exposto via API PostgREST.
--   Em desenvolvimento local, o seed.sql insere a chave de teste local.
--   Em produção, inserir no SQL Editor:
--     INSERT INTO private.secrets (key, value) VALUES ('cpf_key', '<chave-segura>')
--     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
--
-- Base legal: LGPD art. 46 (segurança); CFO 198/2019 (proteção de dados clínicos).
-- ==============================================================================

-- ============================================================
-- SEÇÃO 1 — Habilitar extensão pgcrypto e Schema Privado
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.secrets (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
REVOKE ALL ON TABLE private.secrets FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE private.secrets IS
    'Tabela de segredos do sistema (chaves de encriptação, etc.). Schema privado protegido de acesso público / API.';


-- ============================================================
-- SEÇÃO 2 — Adicionar novas colunas na tabela pacientes
-- ============================================================

-- cpf_hash: SHA-256 do CPF normalizado (apenas dígitos), em hexadecimal
ALTER TABLE public.pacientes
    ADD COLUMN IF NOT EXISTS cpf_hash TEXT;

-- cpf_encrypted: CPF cifrado simetricamente com AES-256 (pgp_sym_encrypt)
ALTER TABLE public.pacientes
    ADD COLUMN IF NOT EXISTS cpf_encrypted TEXT;

COMMENT ON COLUMN public.pacientes.cpf_hash IS
    'SHA-256 (hex) do CPF normalizado (somente dígitos). Usado para busca determinística sem expor o dado real. Não reversível. Base legal: LGPD art. 46.';

COMMENT ON COLUMN public.pacientes.cpf_encrypted IS
    'CPF cifrado com AES-256-CBC (pgp_sym_encrypt). Decifrável apenas com a chave em private.secrets. Nunca expor diretamente em queries ou logs. Base legal: LGPD art. 46.';


-- ============================================================
-- SEÇÃO 3 — Migrar dados existentes da coluna cpf (plaintext)
--           para cpf_hash + cpf_encrypted
-- ============================================================

-- Normaliza CPF: remove caracteres não-dígitos (pontos, traços, espaços)
-- Calcula hash SHA-256 e cifra com a chave configurada em private.secrets
UPDATE public.pacientes
SET
    cpf_hash = encode(
        extensions.digest(
            regexp_replace(cpf, '[^0-9]', '', 'g'),
            'sha256'
        ),
        'hex'
    ),
    cpf_encrypted = extensions.pgp_sym_encrypt(
        regexp_replace(cpf, '[^0-9]', '', 'g'),
        (SELECT value FROM private.secrets WHERE key = 'cpf_key')
    )
WHERE cpf IS NOT NULL
  AND cpf != ''
  AND EXISTS (SELECT 1 FROM private.secrets WHERE key = 'cpf_key');


-- ============================================================
-- SEÇÃO 4 — Remover coluna cpf plaintext
-- ============================================================

DO $$
DECLARE
    v_sem_hash INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_sem_hash
    FROM public.pacientes
    WHERE cpf IS NOT NULL AND cpf != ''
      AND cpf_hash IS NULL;

    IF v_sem_hash > 0 THEN
        RAISE EXCEPTION
            '[CPF Encryption] % paciente(s) com CPF não foram migrados para cpf_hash. '
            'Verifique se a chave cpf_key está cadastrada em private.secrets antes de prosseguir.',
            v_sem_hash;
    END IF;
END;
$$;

-- Drop seguro da coluna plaintext
ALTER TABLE public.pacientes
    DROP COLUMN IF EXISTS cpf;


-- ============================================================
-- SEÇÃO 5 — Índice de busca por hash (substitui busca por cpf)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_pacientes_cpf_hash
    ON public.pacientes(clinica_id, cpf_hash);

COMMENT ON INDEX idx_pacientes_cpf_hash IS
    'Índice para busca determinística de paciente por CPF (via hash). '
    'Usar: WHERE clinica_id = get_my_clinica_id() AND cpf_hash = encode(extensions.digest(normalize_cpf($1), ''sha256''), ''hex'').';


-- ============================================================
-- SEÇÃO 6 — Funções auxiliares de criptografia/decifragem
-- ============================================================

-- 6.1 Normaliza CPF (remove não-dígitos)
CREATE OR REPLACE FUNCTION public.normalizar_cpf(p_cpf TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
STRICT
AS $$
    SELECT regexp_replace(p_cpf, '[^0-9]', '', 'g');
$$;

COMMENT ON FUNCTION public.normalizar_cpf(TEXT) IS
    'Remove pontos, traços e espaços de um CPF, retornando apenas os 11 dígitos. Usar antes de calcular hash ou cifrar.';


-- 6.2 Calcula o hash SHA-256 de um CPF normalizado (para buscas)
CREATE OR REPLACE FUNCTION public.cpf_to_hash(p_cpf TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
STRICT
AS $$
    SELECT encode(extensions.digest(public.normalizar_cpf(p_cpf), 'sha256'), 'hex');
$$;

COMMENT ON FUNCTION public.cpf_to_hash(TEXT) IS
    'Retorna o SHA-256 (hex) de um CPF normalizado. Usar em queries WHERE cpf_hash = public.cpf_to_hash($1). Nunca armazena o CPF real.';


-- 6.3 Cifra um CPF usando a chave em private.secrets
CREATE OR REPLACE FUNCTION public.cpf_encrypt(p_cpf TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, extensions
AS $$
DECLARE
    v_key TEXT;
    v_cpf_norm TEXT;
BEGIN
    SELECT value INTO v_key FROM private.secrets WHERE key = 'cpf_key';
    IF v_key IS NULL OR v_key = '' THEN
        RAISE EXCEPTION '[CPF Encrypt] A chave ''cpf_key'' não foi encontrada em private.secrets.'
            USING ERRCODE = 'configuration_limit_exceeded';
    END IF;

    v_cpf_norm := public.normalizar_cpf(p_cpf);
    IF v_cpf_norm IS NULL OR length(v_cpf_norm) != 11 THEN
        RAISE EXCEPTION '[CPF Encrypt] CPF inválido (deve ter 11 dígitos após normalização).'
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN extensions.pgp_sym_encrypt(v_cpf_norm, v_key);
END;
$$;

COMMENT ON FUNCTION public.cpf_encrypt(TEXT) IS
    'Cifra um CPF com AES-256 (pgp_sym_encrypt) usando a chave em private.secrets. '
    'SECURITY DEFINER para proteger a chave de acessos públicos. '
    'Retorna o texto cifrado em formato ASCII-armored do pgcrypto.';


-- 6.4 Decifra um CPF cifrado (acesso restrito — apenas SECURITY DEFINER internos)
CREATE OR REPLACE FUNCTION public.cpf_decrypt(p_cpf_encrypted TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, extensions
AS $$
DECLARE
    v_key TEXT;
BEGIN
    -- Apenas admins da clínica podem decifrar CPFs
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION '[CPF Decrypt] Acesso negado: apenas administradores podem decifrar CPFs.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    SELECT value INTO v_key FROM private.secrets WHERE key = 'cpf_key';
    IF v_key IS NULL OR v_key = '' THEN
        RAISE EXCEPTION '[CPF Decrypt] A chave ''cpf_key'' não foi encontrada em private.secrets.'
            USING ERRCODE = 'configuration_limit_exceeded';
    END IF;

    RETURN extensions.pgp_sym_decrypt(p_cpf_encrypted::bytea, v_key);
END;
$$;

COMMENT ON FUNCTION public.cpf_decrypt(TEXT) IS
    'Decifra um CPF armazenado em cpf_encrypted. Restrito a admins (is_admin()). '
    'Nunca expor o resultado em views públicas ou logs.';


-- ============================================================
-- SEÇÃO 7 — Trigger: auto-criptografia no INSERT/UPDATE
-- ============================================================

ALTER TABLE public.pacientes
    ADD COLUMN IF NOT EXISTS cpf_raw TEXT;

COMMENT ON COLUMN public.pacientes.cpf_raw IS
    'Campo de passagem temporária: recebe o CPF em texto puro na operação de INSERT/UPDATE. '
    'O trigger trg_encrypt_cpf processa este campo em cpf_hash e cpf_encrypted, '
    'e em seguida o define como NULL antes de persistir. NUNCA é armazenado em disco.';


CREATE OR REPLACE FUNCTION public.fn_encrypt_cpf()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, extensions
AS $$
DECLARE
    v_key  TEXT;
    v_norm TEXT;
BEGIN
    -- Processa somente se cpf_raw foi fornecido
    IF NEW.cpf_raw IS NULL OR NEW.cpf_raw = '' THEN
        NEW.cpf_raw := NULL;
        RETURN NEW;
    END IF;

    SELECT value INTO v_key FROM private.secrets WHERE key = 'cpf_key';
    IF v_key IS NULL OR v_key = '' THEN
        RAISE EXCEPTION '[CPF Trigger] A chave ''cpf_key'' não foi encontrada em private.secrets.'
            USING ERRCODE = 'configuration_limit_exceeded';
    END IF;

    v_norm := public.normalizar_cpf(NEW.cpf_raw);

    -- Calcula hash para busca determinística
    NEW.cpf_hash      := encode(extensions.digest(v_norm, 'sha256'), 'hex');

    -- Cifra para armazenamento seguro
    NEW.cpf_encrypted := extensions.pgp_sym_encrypt(v_norm, v_key);

    -- Apaga o plaintext — nunca persiste em disco
    NEW.cpf_raw := NULL;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_encrypt_cpf() IS
    'Trigger BEFORE INSERT OR UPDATE que processa cpf_raw → cpf_hash + cpf_encrypted, '
    'zerando cpf_raw antes da persistência. Garante que nenhum CPF em plaintext '
    'seja armazenado em disco. Aciona apenas quando cpf_raw IS NOT NULL.';

DROP TRIGGER IF EXISTS trg_encrypt_cpf ON public.pacientes;
CREATE TRIGGER trg_encrypt_cpf
    BEFORE INSERT OR UPDATE OF cpf_raw
    ON public.pacientes
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_encrypt_cpf();
