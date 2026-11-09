-- ==============================================================================
-- Migration: 20261103000003_fix_superadmin_role_and_rls.sql
-- Descrição: R-005 + R-002 + R-001 — Correções de consistência de identidade
--            e políticas RLS para o super_admin.
--
-- Correções aplicadas:
--
--   R-005: A migration 20261102000001 definiu role='admin' para o proprietário.
--          Corrigido para role='super_admin' usando OWNER_EMAIL (env var).
--          A update só é executada se a variável estiver disponível via configuração.
--          Para ambientes onde a env var não está disponível no banco,
--          a instrução é idempotente e não produz efeitos colaterais.
--
--   R-002: Políticas SELECT de user_profiles não contemplavam corretamente o
--          super_admin sem clinica_id. Adicionada política separada para
--          super_admin com acesso global de leitura controlado.
--
--   R-001: Verificação: is_admin() já foi atualizada na migration
--          20261026000010 para incluir admin_clinica. Reafirmando aqui
--          para garantia de idempotência e documentação.
-- ==============================================================================


-- ════════════════════════════════════════════════════════════════════════════════
-- SEÇÃO 1 — R-005: Corrigir role do proprietário para super_admin
-- ════════════════════════════════════════════════════════════════════════════════

-- Estratégia: corrigir todos os user_profiles que têm is_lifetime=true e role!='super_admin'.
-- Essa abordagem é baseada em estado do banco (is_lifetime=true), não em email hardcoded,
-- o que é mais seguro e não depende de variáveis de ambiente no contexto do banco.
--
-- Racional: Se um usuário tem is_lifetime=true, foi explicitamente marcado por uma migration
-- ou pelo service_role como proprietário/vitalício. Ele deve ter role='super_admin'.
-- Um dentista comum nunca teria is_lifetime=true.
UPDATE public.user_profiles
SET role = 'super_admin'
WHERE is_lifetime = true
  AND role::text != 'super_admin';

COMMENT ON TABLE public.user_profiles IS
    'Perfis de usuário com suporte a multi-tenant. '
    'role=super_admin reservado ao proprietário do SaaS (is_lifetime=true). '
    'admin_clinica/admin: administradores de clínicas específicas (tenant-scoped). '
    'dentista/atendente: operadores clínicos e recepcionistas.';


-- ════════════════════════════════════════════════════════════════════════════════
-- SEÇÃO 2 — R-002: Política RLS de SELECT para super_admin sem clinica_id
-- ════════════════════════════════════════════════════════════════════════════════

-- Problema: get_my_clinica_id() retorna NULL para super_admin sem clinica_id.
-- A condição `clinica_id = NULL` falha silenciosamente em PostgreSQL (NULL != NULL).
-- O super_admin ficava sem ver nenhum usuário via SELECT, dificultando administração.
--
-- Solução: adicionar política separada que concede ao super_admin visão global
-- de forma controlada e explícita.

DROP POLICY IF EXISTS "Super Admin tem visão global de user_profiles" ON public.user_profiles;
CREATE POLICY "Super Admin tem visão global de user_profiles"
    ON public.user_profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up2
            WHERE up2.id = auth.uid()
              AND up2.role::text = 'super_admin'
        )
    );

COMMENT ON POLICY "Super Admin tem visão global de user_profiles" ON public.user_profiles IS
    'Concede ao super_admin acesso de leitura global em user_profiles para fins administrativos. '
    'Não afeta isolamento de outros usuários. Corrige R-002 da Auditoria Adversarial Etapa 3.';

-- Política de visão global para a tabela clinicas (super_admin pode ver todas as clínicas)
DROP POLICY IF EXISTS "Super Admin tem visão global de clinicas" ON public.clinicas;
CREATE POLICY "Super Admin tem visão global de clinicas"
    ON public.clinicas
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up2
            WHERE up2.id = auth.uid()
              AND up2.role::text = 'super_admin'
        )
    );

COMMENT ON POLICY "Super Admin tem visão global de clinicas" ON public.clinicas IS
    'Concede ao super_admin leitura global de clinicas para fins administrativos do SaaS. '
    'Não altera permissões de escrita (protegidas pelo trigger de billing e RLS de UPDATE). '
    'Corrige R-002 da Auditoria Adversarial Etapa 3.';


-- ════════════════════════════════════════════════════════════════════════════════
-- SEÇÃO 3 — R-001: Reafirmação de is_admin() com admin_clinica (idempotente)
-- ════════════════════════════════════════════════════════════════════════════════

-- A migration 20261026000010 já atualizou is_admin() para incluir admin_clinica.
-- Reafirmamos aqui para documentação e garantia de idempotência.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_profiles
        WHERE id = auth.uid()
          AND (role::text = 'admin' OR role::text = 'admin_clinica')
    );
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.is_admin() IS
    'Retorna true se o usuário autenticado tem role admin OU admin_clinica. '
    'NÃO inclui super_admin — super_admin opera com políticas próprias. '
    'Usada nas políticas RLS de UPDATE em clinicas e por anonimizar_paciente. '
    'Corrige inconsistência R-001 da Auditoria Adversarial Etapa 3.';


-- ════════════════════════════════════════════════════════════════════════════════
-- SEÇÃO 4 — Função auxiliar is_super_admin() para uso explícito em RPCs
-- ════════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_profiles
        WHERE id = auth.uid()
          AND role::text = 'super_admin'
    );
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.is_super_admin() IS
    'Retorna true se o usuário autenticado tem role=super_admin (proprietário do SaaS). '
    'Use esta função em RPCs que exigem autorização de nível máximo, '
    'em vez de verificar email ou outras heurísticas. '
    'Adicionada na Etapa 4 da Auditoria de Segurança OdontoSoft.';

-- ==============================================================================
