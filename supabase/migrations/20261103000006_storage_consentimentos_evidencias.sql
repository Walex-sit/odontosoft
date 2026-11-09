-- ==============================================================================
-- Migration: 20261103000006_storage_consentimentos_evidencias.sql
-- Descrição: AUD-09 (Etapa 6) — Bucket privado e políticas RLS para consentimentos
--            e evidências de conformidade LGPD / Resolução CFO nº 198/2019.
--
-- Características:
--   - Bucket PRIVADO (public = false): documentos clínicos e evidências de
--     consentimento nunca são acessíveis via URL pública. Exige signed URLs.
--   - Isolamento Multi-Tenant estrito no Storage:
--     O path deve seguir a convenção: <clinica_id>/<paciente_id>/<arquivo>
--   - SELECT (download): restrito aos membros da mesma clínica.
--   - INSERT (upload): restrito aos membros da mesma clínica.
--   - UPDATE: desabilitado (documentos probatórios com hash SHA-256 são imutáveis).
--   - DELETE: restrito aos administradores da clínica para expurgo regulatório.
-- ==============================================================================

-- ── 1. Criação do Bucket Privado de Evidências LGPD ───────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'consentimentos-evidencias',
    'consentimentos-evidencias',
    false, -- Bucket estritamente PRIVADO (LGPD art. 46)
    10485760, -- Limite de 10 MB por arquivo de evidência
    ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE
    SET public = false,
        file_size_limit = 10485760,
        allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png'];

-- ── 2. Remoção de Políticas Anteriores (Garantia de Idempotência) ─────────────
DROP POLICY IF EXISTS "consentimentos-evidencias: download restrito ao tenant" ON storage.objects;
DROP POLICY IF EXISTS "consentimentos-evidencias: upload restrito ao tenant" ON storage.objects;
DROP POLICY IF EXISTS "consentimentos-evidencias: delete restrito ao admin" ON storage.objects;

-- ── 3. Política de Leitura/Download: Apenas membros da mesma clínica ──────────
CREATE POLICY "consentimentos-evidencias: download restrito ao tenant"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'consentimentos-evidencias'
    AND (storage.foldername(name))[1] = (
        SELECT clinica_id::text
        FROM public.user_profiles
        WHERE id = auth.uid()
        LIMIT 1
    )
);

COMMENT ON POLICY "consentimentos-evidencias: download restrito ao tenant" ON storage.objects IS
    'Permite que profissionais de saúde e recepcionistas autorizados da clínica '
    'façam download/visualização de evidências de consentimento do seu próprio tenant via signed URL.';

-- ── 4. Política de Upload: Restrito ao tenant do usuário autenticado ──────────
CREATE POLICY "consentimentos-evidencias: upload restrito ao tenant"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'consentimentos-evidencias'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = (
        SELECT clinica_id::text
        FROM public.user_profiles
        WHERE id = auth.uid()
        LIMIT 1
    )
);

COMMENT ON POLICY "consentimentos-evidencias: upload restrito ao tenant" ON storage.objects IS
    'Garante que uploads de termos de consentimento sejam gravados exclusivamente '
    'sob o prefixo UUID da clínica do operador.';

-- ── 5. Política de Exclusão: Restrito aos administradores da clínica ──────────
CREATE POLICY "consentimentos-evidencias: delete restrito ao admin"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'consentimentos-evidencias'
    AND (storage.foldername(name))[1] = (
        SELECT clinica_id::text
        FROM public.user_profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'admin_clinica', 'super_admin')
        LIMIT 1
    )
);

COMMENT ON POLICY "consentimentos-evidencias: delete restrito ao admin" ON storage.objects IS
    'Apenas administradores de clínica podem realizar expurgo controlado de evidências.';
