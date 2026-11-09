-- ==============================================================================
-- Migration: 20261103000004_fix_storage_clinic_logos.sql
-- Descrição: R-003 — Auditoria e reforço das políticas de Storage.
--
-- Situação encontrada (Auditoria Adversarial Etapa 3):
--   O bucket 'clinic-logos' foi criado como PÚBLICO (public=true) na migration
--   20260824000002. As políticas de INSERT/UPDATE/DELETE aceitam qualquer
--   usuário autenticado em qualquer caminho, sem isolamento de tenant.
--
-- Riscos identificados:
--   1. Qualquer usuário autenticado pode fazer upload para o caminho de outra clínica
--      diretamente via API de Storage (sem passar pela Server Action).
--   2. Logos públicos são acessíveis por URL direta por qualquer pessoa na internet.
--      (Avaliação: aceitável para logos — são ativos públicos de marca).
--
-- Correções aplicadas:
--   - Manter o bucket como público (logos são ativos de marca, sem dados sensíveis).
--   - Substituir políticas de Storage genéricas por políticas com isolamento de tenant:
--     o caminho deve começar com o clinica_id do usuário autenticado.
--   - INSERT/UPDATE/DELETE: exigir que o caminho pertença ao tenant do usuário.
--   - SELECT: manter público (logos de clínicas são destinados a uso público).
-- ==============================================================================

-- ── Remoção das políticas anteriores (garantia de idempotência) ───────────────
DROP POLICY IF EXISTS "Logos publicamente acessíveis" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload de logos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar logos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar logos" ON storage.objects;
DROP POLICY IF EXISTS "clinic-logos: leitura pública" ON storage.objects;
DROP POLICY IF EXISTS "clinic-logos: upload isolado por tenant" ON storage.objects;
DROP POLICY IF EXISTS "clinic-logos: update isolado por tenant" ON storage.objects;
DROP POLICY IF EXISTS "clinic-logos: delete isolado por tenant" ON storage.objects;

-- ── Acesso público de leitura (mantido — logos são ativos públicos de marca) ──
CREATE POLICY "clinic-logos: leitura pública"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'clinic-logos');

COMMENT ON POLICY "clinic-logos: leitura pública" ON storage.objects IS
    'Logos de clínicas são publicamente acessíveis por URL. '
    'Logos não contêm dados sensíveis de pacientes — são ativos de marca. '
    'Avaliação de impacto: aceitável conforme política de privacidade do OdontoSoft.';

-- ── Upload isolado por tenant ─────────────────────────────────────────────────
-- Exige que o caminho do arquivo comece com o clinica_id do usuário autenticado.
-- Formato esperado: <clinica_id>/logo.<ext>
-- Isso impede que um admin da Clínica A faça upload em /clinica-B-uuid/logo.png.
CREATE POLICY "clinic-logos: upload isolado por tenant"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'clinic-logos'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = (
            SELECT clinica_id::text
            FROM public.user_profiles
            WHERE id = auth.uid()
            LIMIT 1
        )
    );

COMMENT ON POLICY "clinic-logos: upload isolado por tenant" ON storage.objects IS
    'Restringe upload de logos ao caminho do próprio tenant. '
    'Formato: <clinica_id>/logo.<ext>. Um admin da Clínica A não pode '
    'fazer upload no caminho da Clínica B. Corrige R-003 — Etapa 4.';

-- ── Atualização isolada por tenant ────────────────────────────────────────────
CREATE POLICY "clinic-logos: update isolado por tenant"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'clinic-logos'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = (
            SELECT clinica_id::text
            FROM public.user_profiles
            WHERE id = auth.uid()
            LIMIT 1
        )
    );

-- ── Deleção isolada por tenant ────────────────────────────────────────────────
CREATE POLICY "clinic-logos: delete isolado por tenant"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'clinic-logos'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = (
            SELECT clinica_id::text
            FROM public.user_profiles
            WHERE id = auth.uid()
            LIMIT 1
        )
    );

-- ── Nota sobre buckets sensíveis ──────────────────────────────────────────────
-- Revisão de todos os buckets existentes:
--   1. 'clinic-logos'       → público (logos são ativos de marca) ✅ tratado acima
--
-- Os demais buckets (prontuários, receituários, consentimentos) devem ser
-- criados como PRIVADOS com URLs assinadas (signed URLs com expiração) se/quando
-- forem implementados. Não existem buckets adicionais no momento desta migration.
-- ==============================================================================
