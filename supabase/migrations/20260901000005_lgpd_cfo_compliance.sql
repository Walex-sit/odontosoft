-- ==============================================================================
-- Migration: 20260901000005_lgpd_cfo_compliance.sql
-- Descrição: Módulo de Conformidade LGPD e CFO — Consentimento estruturado,
--            imutabilidade de prontuários e segurança por linha (RLS).
--
-- Base legal:
--   • Lei nº 13.709/2018 (LGPD) — arts. 7º, 8º e 9º (consentimento)
--   • Resolução CFO nº 198/2019 — prontuário eletrônico odontológico
--   • CFO 2022 — integridade e rastreabilidade de registros clínicos
--
-- Compatibilidade: PostgreSQL 14+ / Supabase (pgaudit, RLS nativo)
-- ==============================================================================

-- ============================================================
-- SEÇÃO 1 — TIPOS ENUMERADOS (LGPD/TCLE)
-- ============================================================

DO $$ BEGIN
    CREATE TYPE public.tipo_termo AS ENUM (
        'LGPD',
        'TCLE',
        'TCLE_MENOR'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.meio_consentimento AS ENUM (
        'eletronico_interno',
        'upload_legado',
        'email_confirmado',
        'whatsapp_confirmado'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.status_consentimento AS ENUM (
        'ativo',
        'revogado',
        'expirado',
        'pendente'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.status_prontuario AS ENUM (
        'registrada',
        'retificada',
        'cancelada'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.tipo_responsavel AS ENUM (
        'proprio_paciente',
        'pai_mae',
        'tutor_legal',
        'curador'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================
-- SEÇÃO 2 — MODELAGEM DE CONSENTIMENTO LGPD / TCLE
-- ============================================================

-- 2.1 termos_privacidade
CREATE TABLE IF NOT EXISTS public.termos_privacidade (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinica_id    UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
    tipo          public.tipo_termo NOT NULL,
    versao        TEXT NOT NULL,
    texto_hash    TEXT NOT NULL,
    publicado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
    ativo         BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT termos_privacidade_clinica_tipo_versao_unique
        UNIQUE (clinica_id, tipo, versao)
);

COMMENT ON TABLE  public.termos_privacidade IS
    'Catálogo versionado de termos de privacidade (LGPD) e TCLE da clínica. O hash SHA-256 garante prova de integridade do texto publicado. Base legal: LGPD art. 9º (transparência) e Res. CFO 198/2019.';
COMMENT ON COLUMN public.termos_privacidade.texto_hash IS
    'SHA-256 em hexadecimal do conteúdo integral do termo. Calculado antes de gravar e reconferido na auditoria para detectar adulteração.';
COMMENT ON COLUMN public.termos_privacidade.ativo IS
    'Apenas um registro por (clinica_id, tipo) deve estar ativo=true. Versões anteriores são mantidas para rastreabilidade histórica.';
COMMENT ON COLUMN public.termos_privacidade.versao IS
    'Identificador de versão legível pelo humano. Ex: "2024.1", "3.0.0-TCLE". Combinado com clinica_id e tipo forma chave única.';


-- 2.2 paciente_consentimentos
CREATE TABLE IF NOT EXISTS public.paciente_consentimentos (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id            UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE RESTRICT,
    clinica_id             UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
    termo_id               UUID NOT NULL REFERENCES public.termos_privacidade(id) ON DELETE RESTRICT,
    status                 public.status_consentimento NOT NULL DEFAULT 'pendente',
    manifestado_em         TIMESTAMPTZ,
    revogado_em            TIMESTAMPTZ,
    meio                   public.meio_consentimento NOT NULL DEFAULT 'eletronico_interno',
    responsavel_nome       TEXT,
    responsavel_tipo       public.tipo_responsavel NOT NULL DEFAULT 'proprio_paciente',
    registrado_por_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pc_paciente_termo_ativo_unique
        UNIQUE NULLS NOT DISTINCT (paciente_id, termo_id, revogado_em)
);

COMMENT ON TABLE  public.paciente_consentimentos IS
    'Registro de cada manifestação de consentimento do paciente ao termo de privacidade ou TCLE, conforme exigido pelo art. 8º da LGPD. Suporta revogação rastreável (art. 8º, §5º) e delegação a responsável legal.';
COMMENT ON COLUMN public.paciente_consentimentos.manifestado_em IS
    'Data/hora em que o paciente (ou responsável) registrou a manifestação expressa de vontade. NULL indica consentimento ainda pendente.';
COMMENT ON COLUMN public.paciente_consentimentos.revogado_em IS
    'Data/hora da revogação do consentimento pelo titular. A revogação não apaga dados já processados com base em consentimento válido anterior (LGPD art. 8º, §5º).';
COMMENT ON COLUMN public.paciente_consentimentos.responsavel_nome IS
    'Nome completo do responsável legal quando paciente é menor de 18 anos ou juridicamente incapaz. Obrigatório quando responsavel_tipo != proprio_paciente.';
COMMENT ON COLUMN public.paciente_consentimentos.registrado_por_user_id IS
    'Usuário do sistema que registrou/validou o consentimento. Compõe a cadeia de custódia exigida pela auditoria LGPD.';


-- 2.3 consentimento_finalidades
CREATE TABLE IF NOT EXISTS public.consentimento_finalidades (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_consentimento_id UUID NOT NULL REFERENCES public.paciente_consentimentos(id) ON DELETE CASCADE,
    clinica_id                UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
    finalidade                TEXT NOT NULL,
    autorizado                BOOLEAN NOT NULL DEFAULT false,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT cf_consentimento_finalidade_unique
        UNIQUE (paciente_consentimento_id, finalidade)
);

COMMENT ON TABLE  public.consentimento_finalidades IS
    'Detalhamento das finalidades específicas autorizadas dentro de um consentimento (princípio da finalidade — LGPD art. 6º, I). Permite controle granular por canal (WhatsApp, e-mail, pesquisa, etc.).';
COMMENT ON COLUMN public.consentimento_finalidades.finalidade IS
    'Identificador semântico da finalidade. Valores sugeridos: "whatsapp", "email_marketing", "pesquisa_clinica", "compartilhamento_plano_saude", "imagens_redes_sociais".';
COMMENT ON COLUMN public.consentimento_finalidades.autorizado IS
    'true = paciente autorizou esta finalidade específica. false = paciente negou ou não respondeu a esta finalidade.';


-- 2.4 consentimento_evidencias
CREATE TABLE IF NOT EXISTS public.consentimento_evidencias (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_consentimento_id UUID NOT NULL REFERENCES public.paciente_consentimentos(id) ON DELETE RESTRICT,
    clinica_id                UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
    tipo                      TEXT NOT NULL,
    storage_path              TEXT,
    hash_sha256               TEXT,
    ip                        INET,
    user_agent                TEXT,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.consentimento_evidencias IS
    'Evidências de autenticidade de consentimentos: cópia do PDF, hash de integridade, IP e user-agent no momento do ato. Suporta contestações judiciais e responde ao requisito de rastreabilidade da LGPD.';
COMMENT ON COLUMN public.consentimento_evidencias.storage_path IS
    'Caminho no bucket privado do Supabase Storage. Nunca expor ao cliente sem URL assinada de curto prazo (signed URL).';
COMMENT ON COLUMN public.consentimento_evidencias.hash_sha256 IS
    'SHA-256 do arquivo evidência. Verificar periodicamente para detectar adulteração (integridade da cadeia de custódia).';
COMMENT ON COLUMN public.consentimento_evidencias.ip IS
    'Endereço IP do solicitante no momento do consentimento. Classificado como dado pessoal pela LGPD; coletado apenas para fins de segurança e rastreabilidade.';
COMMENT ON COLUMN public.consentimento_evidencias.tipo IS
    'Tipo de evidência. Ex: "pdf_assinado", "screenshot_tela", "log_whatsapp", "email_confirmacao".';


-- ============================================================
-- SEÇÃO 3 — IMUTABILIDADE DO PRONTUÁRIO CLÍNICO (CFO/LGPD)
-- ============================================================

-- 3.1 Novas colunas na tabela prontuarios (idempotente)
ALTER TABLE public.prontuarios
    ADD COLUMN IF NOT EXISTS status
        public.status_prontuario NOT NULL DEFAULT 'registrada',
    ADD COLUMN IF NOT EXISTS motivo_alteracao TEXT,
    ADD COLUMN IF NOT EXISTS versao_anterior_id UUID
        REFERENCES public.prontuarios(id) ON DELETE RESTRICT;

COMMENT ON TABLE  public.prontuarios IS
    'Tabela de evoluções e registros clínicos odontológicos. Imutável por exigência da Resolução CFO nº 198/2019: DELETE físico é bloqueado por trigger. Use UPDATE de status para retificação/cancelamento. Prazo mínimo de guarda: 20 anos (CFO) / 5 anos após término do tratamento.';
COMMENT ON COLUMN public.prontuarios.status IS
    'Ciclo de vida do registro clínico conforme Res. CFO 198/2019: "registrada" (original), "retificada" (corrigida via adendo — original PRESERVADO), "cancelada" (erro com motivo justificado). DELETE físico é PROIBIDO — use UPDATE de status.';
COMMENT ON COLUMN public.prontuarios.motivo_alteracao IS
    'Justificativa obrigatória ao alterar status para "retificada" ou "cancelada". Deve conter: descrição do erro/correção, CRO do responsável e data da ciência. Exigência da Res. CFO 198/2019.';
COMMENT ON COLUMN public.prontuarios.versao_anterior_id IS
    'Self-reference ao registro original que esta entrada retifica ou cancela. Permite reconstrução de toda a cadeia histórica de um prontuário (padrão append-only versioned recomendado pela CFO).';


-- 3.2 CHECK CONSTRAINT — motivo obrigatório ao alterar status
ALTER TABLE public.prontuarios
    DROP CONSTRAINT IF EXISTS prontuarios_motivo_obrigatorio;

ALTER TABLE public.prontuarios
    ADD CONSTRAINT prontuarios_motivo_obrigatorio
    CHECK (
        status = 'registrada'
        OR (
            status IN ('retificada', 'cancelada')
            AND motivo_alteracao IS NOT NULL
            AND length(trim(motivo_alteracao)) > 10
        )
    );

COMMENT ON CONSTRAINT prontuarios_motivo_obrigatorio ON public.prontuarios IS
    'Impede que um prontuário seja marcado como retificado ou cancelado sem motivo justificado (mínimo 11 caracteres). Resolução CFO 198/2019.';


-- 3.3 Função + Trigger que bloqueia DELETE físico
CREATE OR REPLACE FUNCTION public.bloquear_delete_prontuario()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RAISE EXCEPTION
        '[CFO/LGPD] Exclusão física de prontuários é PROIBIDA. '
        'Para invalidar um registro, execute: '
        'UPDATE prontuarios '
        'SET status = ''cancelada'', motivo_alteracao = ''<justificativa com >= 11 chars>'' '
        'WHERE id = ''%''; '
        'Base legal: Resolução CFO nº 198/2019, art. 5º.',
        OLD.id
    USING ERRCODE = 'restrict_violation';
    RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.bloquear_delete_prontuario() IS
    'Trigger BEFORE DELETE que impede exclusão física de prontuários. Conforme Res. CFO 198/2019 e LGPD art. 16 (conservação de dados pelo prazo legal), registros clínicos devem ser CANCELADOS, nunca deletados. O erro retornado orienta o desenvolvedor ao fluxo correto.';

DROP TRIGGER IF EXISTS trg_bloquear_delete_prontuario ON public.prontuarios;
CREATE TRIGGER trg_bloquear_delete_prontuario
    BEFORE DELETE ON public.prontuarios
    FOR EACH ROW
    EXECUTE FUNCTION public.bloquear_delete_prontuario();


-- ============================================================
-- SEÇÃO 4 — ROW LEVEL SECURITY (RLS) NAS NOVAS TABELAS
-- ============================================================

ALTER TABLE public.termos_privacidade        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paciente_consentimentos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consentimento_finalidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consentimento_evidencias  ENABLE ROW LEVEL SECURITY;

-- ---- termos_privacidade ----
DROP POLICY IF EXISTS "tp_select_tenant" ON public.termos_privacidade;
DROP POLICY IF EXISTS "tp_insert_admin"  ON public.termos_privacidade;
DROP POLICY IF EXISTS "tp_update_admin"  ON public.termos_privacidade;

CREATE POLICY "tp_select_tenant" ON public.termos_privacidade
    FOR SELECT USING (clinica_id = public.get_my_clinica_id());

CREATE POLICY "tp_insert_admin" ON public.termos_privacidade
    FOR INSERT WITH CHECK (clinica_id = public.get_my_clinica_id() AND public.is_admin());

CREATE POLICY "tp_update_admin" ON public.termos_privacidade
    FOR UPDATE USING (clinica_id = public.get_my_clinica_id() AND public.is_admin());


-- ---- paciente_consentimentos ----
DROP POLICY IF EXISTS "pc_select_tenant" ON public.paciente_consentimentos;
DROP POLICY IF EXISTS "pc_insert_tenant" ON public.paciente_consentimentos;
DROP POLICY IF EXISTS "pc_update_tenant" ON public.paciente_consentimentos;

CREATE POLICY "pc_select_tenant" ON public.paciente_consentimentos
    FOR SELECT USING (clinica_id = public.get_my_clinica_id());

CREATE POLICY "pc_insert_tenant" ON public.paciente_consentimentos
    FOR INSERT WITH CHECK (clinica_id = public.get_my_clinica_id());

CREATE POLICY "pc_update_tenant" ON public.paciente_consentimentos
    FOR UPDATE USING (clinica_id = public.get_my_clinica_id());


-- ---- consentimento_finalidades ----
DROP POLICY IF EXISTS "cf_select_tenant" ON public.consentimento_finalidades;
DROP POLICY IF EXISTS "cf_insert_tenant" ON public.consentimento_finalidades;
DROP POLICY IF EXISTS "cf_update_tenant" ON public.consentimento_finalidades;

CREATE POLICY "cf_select_tenant" ON public.consentimento_finalidades
    FOR SELECT USING (clinica_id = public.get_my_clinica_id());

CREATE POLICY "cf_insert_tenant" ON public.consentimento_finalidades
    FOR INSERT WITH CHECK (clinica_id = public.get_my_clinica_id());

CREATE POLICY "cf_update_tenant" ON public.consentimento_finalidades
    FOR UPDATE USING (clinica_id = public.get_my_clinica_id());


-- ---- consentimento_evidencias (IMUTÁVEL — sem UPDATE/DELETE) ----
DROP POLICY IF EXISTS "ce_select_tenant" ON public.consentimento_evidencias;
DROP POLICY IF EXISTS "ce_insert_tenant" ON public.consentimento_evidencias;

CREATE POLICY "ce_select_tenant" ON public.consentimento_evidencias
    FOR SELECT USING (clinica_id = public.get_my_clinica_id());

CREATE POLICY "ce_insert_tenant" ON public.consentimento_evidencias
    FOR INSERT WITH CHECK (clinica_id = public.get_my_clinica_id());


-- ============================================================
-- SEÇÃO 5 — AUTO-PREENCHIMENTO DE clinica_id
-- ============================================================

DROP TRIGGER IF EXISTS trg_set_clinica_id ON public.termos_privacidade;
CREATE TRIGGER trg_set_clinica_id BEFORE INSERT ON public.termos_privacidade
    FOR EACH ROW EXECUTE FUNCTION public.set_clinica_id();

DROP TRIGGER IF EXISTS trg_set_clinica_id ON public.paciente_consentimentos;
CREATE TRIGGER trg_set_clinica_id BEFORE INSERT ON public.paciente_consentimentos
    FOR EACH ROW EXECUTE FUNCTION public.set_clinica_id();

DROP TRIGGER IF EXISTS trg_set_clinica_id ON public.consentimento_finalidades;
CREATE TRIGGER trg_set_clinica_id BEFORE INSERT ON public.consentimento_finalidades
    FOR EACH ROW EXECUTE FUNCTION public.set_clinica_id();

DROP TRIGGER IF EXISTS trg_set_clinica_id ON public.consentimento_evidencias;
CREATE TRIGGER trg_set_clinica_id BEFORE INSERT ON public.consentimento_evidencias
    FOR EACH ROW EXECUTE FUNCTION public.set_clinica_id();


-- ============================================================
-- SEÇÃO 6 — ÍNDICES DE PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_termos_clinica_tipo_ativo
    ON public.termos_privacidade(clinica_id, tipo, ativo);

CREATE INDEX IF NOT EXISTS idx_pc_paciente
    ON public.paciente_consentimentos(paciente_id);

CREATE INDEX IF NOT EXISTS idx_pc_clinica_status
    ON public.paciente_consentimentos(clinica_id, status);

CREATE INDEX IF NOT EXISTS idx_pc_termo
    ON public.paciente_consentimentos(termo_id);

CREATE INDEX IF NOT EXISTS idx_cf_consentimento
    ON public.consentimento_finalidades(paciente_consentimento_id);

CREATE INDEX IF NOT EXISTS idx_cf_clinica_finalidade
    ON public.consentimento_finalidades(clinica_id, finalidade, autorizado);

CREATE INDEX IF NOT EXISTS idx_ce_consentimento
    ON public.consentimento_evidencias(paciente_consentimento_id);

CREATE INDEX IF NOT EXISTS idx_prontuarios_status
    ON public.prontuarios(clinica_id, status);

CREATE INDEX IF NOT EXISTS idx_prontuarios_versao_anterior
    ON public.prontuarios(versao_anterior_id)
    WHERE versao_anterior_id IS NOT NULL;


-- ============================================================
-- SEÇÃO 7 — VIEW DE CONFORMIDADE (PAINEL DO DPO)
-- ============================================================

CREATE OR REPLACE VIEW public.vw_conformidade_consentimentos AS
SELECT
    p.id                       AS paciente_id,
    p.nome                     AS paciente_nome,
    p.clinica_id,
    tp.tipo                    AS tipo_termo,
    tp.versao                  AS versao_termo,
    pc.id                      AS consentimento_id,
    pc.status,
    pc.manifestado_em,
    pc.revogado_em,
    pc.meio,
    pc.responsavel_nome,
    pc.responsavel_tipo,
    jsonb_object_agg(
        cf.finalidade,
        cf.autorizado
    ) FILTER (WHERE cf.finalidade IS NOT NULL) AS finalidades,
    EXISTS (
        SELECT 1 FROM public.consentimento_evidencias ce
        WHERE ce.paciente_consentimento_id = pc.id
    )                          AS possui_evidencia,
    pc.created_at              AS registrado_em
FROM
    public.paciente_consentimentos pc
    JOIN public.pacientes           p  ON p.id = pc.paciente_id
    JOIN public.termos_privacidade  tp ON tp.id = pc.termo_id
    LEFT JOIN public.consentimento_finalidades cf
        ON cf.paciente_consentimento_id = pc.id
GROUP BY
    p.id, p.nome, p.clinica_id,
    tp.tipo, tp.versao,
    pc.id, pc.status, pc.manifestado_em, pc.revogado_em,
    pc.meio, pc.responsavel_nome, pc.responsavel_tipo, pc.created_at;

COMMENT ON VIEW public.vw_conformidade_consentimentos IS
    'View consolidada para o painel de conformidade LGPD (DPO). Apresenta o estado atual dos consentimentos por paciente, desagregando finalidades e indicando presença de evidências documentais.';


-- ============================================================
-- SEÇÃO 8 — FUNÇÃO HELPER: registrar_revogacao_consentimento()
-- ============================================================

CREATE OR REPLACE FUNCTION public.registrar_revogacao_consentimento(
    p_paciente_consentimento_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clinica_id UUID;
BEGIN
    SELECT clinica_id INTO v_clinica_id
    FROM public.paciente_consentimentos
    WHERE id = p_paciente_consentimento_id
      AND clinica_id = public.get_my_clinica_id();

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Consentimento não encontrado ou não pertence à sua clínica.'
            USING ERRCODE = 'no_data_found';
    END IF;

    UPDATE public.paciente_consentimentos
    SET
        status      = 'revogado',
        revogado_em = now()
    WHERE id = p_paciente_consentimento_id
      AND status = 'ativo';

    INSERT INTO public.system_logs (clinica_id, user_id, action, entity, details)
    VALUES (
        v_clinica_id,
        auth.uid(),
        'LGPD_REVOGACAO_CONSENTIMENTO',
        'paciente_consentimentos',
        jsonb_build_object(
            'paciente_consentimento_id', p_paciente_consentimento_id,
            'revogado_em',               now()
        )
    );
END;
$$;

COMMENT ON FUNCTION public.registrar_revogacao_consentimento(UUID) IS
    'Revoga um consentimento LGPD de forma segura e auditável. Valida pertencimento ao tenant, atualiza o status e grava entrada no system_logs. Chamada pela camada de aplicação; nunca fazer UPDATE direto no consentimento sem passar por aqui.';


-- ============================================================
-- VERIFICAÇÃO FINAL (descomente para conferir após execução)
-- ============================================================
/*
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'termos_privacidade','paciente_consentimentos',
    'consentimento_finalidades','consentimento_evidencias'
  );

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'prontuarios'
  AND column_name IN ('status','motivo_alteracao','versao_anterior_id');

SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'prontuarios'
  AND trigger_name = 'trg_bloquear_delete_prontuario';
*/
