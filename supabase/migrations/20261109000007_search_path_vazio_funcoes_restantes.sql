-- ==============================================================================
-- Migration: 20261109000007_search_path_vazio_funcoes_restantes.sql
-- Tarefa 6: Configuração de search_path = '' em todas as funções SECURITY DEFINER restantes
-- Protege contra search_path hijacking garantindo qualificação explícita de schemas
-- ==============================================================================

-- 1. bloquear_delete_evolucao
CREATE OR REPLACE FUNCTION public.bloquear_delete_evolucao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
    RAISE EXCEPTION '[CFO/LGPD] Exclusão física de evolução de prontuário é PROIBIDA. Registros clínicos são imutáveis e permanentes.'
        USING ERRCODE = 'integrity_constraint_violation';
    RETURN NULL;
END;
$function$;

-- 2. bloquear_delete_prontuario
CREATE OR REPLACE FUNCTION public.bloquear_delete_prontuario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
    RAISE EXCEPTION '[CFO/LGPD] Exclusão física de prontuários é PROIBIDA (Resolução CFO nº 198/2019 e Art. 6º da Lei Geral de Proteção de Dados). Use o status "cancelada" ou registros retificadores.'
        USING ERRCODE = 'integrity_constraint_violation';
    RETURN NULL;
END;
$function$;

-- 3. bloquear_update_prontuario_finalizado
CREATE OR REPLACE FUNCTION public.bloquear_update_prontuario_finalizado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
    IF OLD.finalizado = true THEN
        RAISE EXCEPTION '[CFO/LGPD] Prontuário finalizado é IMUTÁVEL. Não é permitido alterar registros com status finalizado. Crie um adendo ou evolução retificadora.'
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$function$;

-- 4. set_clinica_id
CREATE OR REPLACE FUNCTION public.set_clinica_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_clinica_id uuid;
BEGIN
  IF NEW.clinica_id IS NULL THEN
    v_clinica_id := public.get_my_clinica_id();
    IF v_clinica_id IS NULL THEN
      RAISE EXCEPTION 'Não foi possível determinar a clínica do usuário autenticado';
    END IF;
    NEW.clinica_id := v_clinica_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- 5. protect_clinica_billing_fields
CREATE OR REPLACE FUNCTION public.protect_clinica_billing_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_jwt_role TEXT;
BEGIN
    -- Extrai o role do JWT atual (service_role, authenticated, anon, etc.)
    v_jwt_role := (auth.jwt() ->> 'role');

    -- service_role e supabase_admin têm acesso irrestrito
    -- (usado por: Stripe webhooks, RPCs autorizadas, migrations, supabaseAdmin)
    IF v_jwt_role = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- Para qualquer outro usuário (authenticated, anon):
    -- Bloquear alteração dos campos críticos de billing

    -- 1. Proteção de status_assinatura
    IF NEW.status_assinatura IS DISTINCT FROM OLD.status_assinatura THEN
        RAISE EXCEPTION
            '[OdontoSoft Security] Alteração de status_assinatura não autorizada. '
            'Esta operação é exclusiva de processos administrativos do SaaS (Stripe, service_role). '
            'Para alterar seu plano, utilize a interface de Configurações > Assinatura.'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- 2. Proteção de trial_ends_at
    IF NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at THEN
        RAISE EXCEPTION
            '[OdontoSoft Security] Alteração de trial_ends_at não autorizada. '
            'O período de avaliação só pode ser modificado por processos internos do SaaS.'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- 3. Proteção de ativo
    IF NEW.ativo IS DISTINCT FROM OLD.ativo THEN
        RAISE EXCEPTION
            '[OdontoSoft Security] Alteração do campo ativo não autorizada. '
            'A ativação/desativação de tenants é exclusiva de processos administrativos do SaaS.'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    RETURN NEW;
END;
$function$;

-- 6. handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
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
$function$;

-- 7. registrar_revogacao_consentimento
CREATE OR REPLACE FUNCTION public.registrar_revogacao_consentimento(
    p_paciente_consentimento_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

-- 8. criar_adendo_prontuario
CREATE OR REPLACE FUNCTION public.criar_adendo_prontuario(
    p_prontuario_origem_id UUID,
    p_descricao             TEXT,
    p_tipo_adendo           TEXT DEFAULT 'adendo_retificativo',
    p_tratamento            TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
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
$function$;

-- 9. cpf_encrypt
CREATE OR REPLACE FUNCTION public.cpf_encrypt(p_cpf TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
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
$function$;

-- 10. cpf_decrypt
CREATE OR REPLACE FUNCTION public.cpf_decrypt(p_cpf_encrypted TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
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
$function$;

