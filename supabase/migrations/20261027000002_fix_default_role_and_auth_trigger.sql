-- ==============================================================================
-- Migration: 20261027000002_fix_default_role_and_auth_trigger.sql
-- Description:
--  Corrige o DEFAULT da coluna user_profiles.role e o trigger on_auth_user_created
--  para garantir que qualquer novo utilizador criado via /register receba
--  imediatamente a role 'admin_clinica', sem janela de tempo onde a role seria
--  'dentista' (o DEFAULT anterior do schema inicial).
--
--  Problemas cobertos:
--    1. O DEFAULT 'dentista' em user_profiles.role (schema inicial) era a causa
--       raiz do utilizador nascer com role restrita caso o trigger corresse antes
--       do upsert em registrarNovaClinica().
--    2. O trigger handle_new_user / on_auth_user_created do Supabase Auth insere
--       o perfil inicial sem explicitar a role — corrigido aqui para usar
--       'admin_clinica' sempre que criado via registo público.
-- ==============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Alterar o DEFAULT da coluna role para 'admin_clinica'
--    (protege contra qualquer INSERT futuro que omita o campo role)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.user_profiles
    ALTER COLUMN role SET DEFAULT 'admin_clinica';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Criar / substituir o trigger on_auth_user_created
--    O Supabase cria automaticamente este trigger ao activar Auth.
--    Redefinimos a função para garantir que o perfil inicial tenha sempre
--    role = 'admin_clinica' (o provisionar_novo_tenant() converge o mesmo).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Insere o perfil com role 'admin_clinica' obrigatório.
    -- O campo nome e email são extraídos dos metadados do Auth quando disponíveis.
    INSERT INTO public.user_profiles (id, nome, email, role)
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'nome',
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            split_part(NEW.email, '@', 1)
        ),
        NEW.email,
        'admin_clinica'
    )
    ON CONFLICT (id) DO UPDATE
        SET
            email = EXCLUDED.email,
            -- Só actualiza a role se ainda não tiver sido provisionada com admin_clinica
            -- (evita fazer downgrade de um admin existente)
            role  = CASE
                        WHEN public.user_profiles.role::text IN ('dentista', 'recepcao', 'financeiro')
                        THEN 'admin_clinica'::public.user_role
                        ELSE public.user_profiles.role
                    END;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
    'Trigger AFTER INSERT em auth.users. Cria ou actualiza o perfil em user_profiles '
    'com role=admin_clinica. A role só é actualizada se o valor anterior for restrito '
    '(dentista/recepcao/financeiro), protegendo admins existentes de downgrade.';

-- Recria o trigger caso ainda não exista ou precise ser actualizado
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Correcção retroactiva: qualquer perfil sem clinica_id ainda com role
--    restrita é promovido a admin_clinica (utilizadores que registaram antes
--    desta migration e ficaram presos com role errada).
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE public.user_profiles
SET role = 'admin_clinica'
WHERE
    clinica_id IS NULL
    AND role::text IN ('dentista', 'recepcao', 'financeiro');

-- Log informativo
DO $$
DECLARE
    v_fixed INT;
BEGIN
    GET DIAGNOSTICS v_fixed = ROW_COUNT;
    IF v_fixed > 0 THEN
        RAISE NOTICE '[fix_default_role] % perfis sem clinica corrigidos para admin_clinica.', v_fixed;
    END IF;
END $$;
