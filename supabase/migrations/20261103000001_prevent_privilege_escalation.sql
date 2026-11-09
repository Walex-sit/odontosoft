-- ==============================================================================
-- Migration: 20261103000001_prevent_privilege_escalation.sql
-- Descrição: Impede auto-elevação de privilégios e alteração não autorizada de
--            is_lifetime, role e clinica_id na tabela public.user_profiles.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.protect_user_profiles_privileges()
RETURNS TRIGGER AS $$
BEGIN
    -- Permitir que operações do sistema (service_role ou supabaseAdmin) prossigam
    IF (auth.jwt() ->> 'role') = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- 1. Bloqueio de alteração de is_lifetime por usuários autenticados normais
    IF NEW.is_lifetime IS DISTINCT FROM OLD.is_lifetime THEN
        RAISE EXCEPTION 'Acesso negado: a flag is_lifetime não pode ser alterada diretamente.';
    END IF;

    -- 2. Bloqueio de auto-elevação de role ou promoção para super_admin
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        -- Nenhum usuário comum pode se auto-promover para outro papel
        IF OLD.id = auth.uid() AND OLD.role::text != 'super_admin' THEN
            RAISE EXCEPTION 'Acesso negado: auto-alteração de nível de privilégio (role) não permitida.';
        END IF;

        -- Apenas super_admin pode atribuir o papel super_admin
        IF NEW.role::text = 'super_admin' THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.user_profiles
                WHERE id = auth.uid() AND role::text = 'super_admin'
            ) THEN
                RAISE EXCEPTION 'Acesso negado: apenas o Super Admin pode atribuir a função super_admin.';
            END IF;
        END IF;
    END IF;

    -- 3. Bloqueio de troca de clínica não autorizada
    IF NEW.clinica_id IS DISTINCT FROM OLD.clinica_id AND OLD.clinica_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role::text = 'super_admin'
        ) THEN
            RAISE EXCEPTION 'Acesso negado: alteração de tenant (clinica_id) não permitida.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_protect_user_profiles_privileges ON public.user_profiles;
CREATE TRIGGER tr_protect_user_profiles_privileges
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_user_profiles_privileges();
