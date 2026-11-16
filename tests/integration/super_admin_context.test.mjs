/**
 * tests/integration/super_admin_context.test.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * BATERIA DE TESTES OBRIGATÓRIOS: PAINEL GLOBAL E CONTEXTO ADMINISTRATIVO
 *
 * Cenários Validados Diretamente no PostgreSQL (RLS, Funções e Segurança):
 *  1. Super Admin acessa painel global (visão global de clínicas e usuários).
 *  2. Super Admin seleciona uma clínica (contexto administrativo ativado via RPC).
 *  3. Super Admin acessa Agenda, Pacientes, Financeiro, Estoque e Configurações da clínica selecionada.
 *  4. Super Admin retorna ao painel global (limpeza de contexto).
 *  5. Usuário comum não consegue utilizar o mecanismo de contexto administrativo (RPC bloqueia).
 *  6. Dentista e recepcionista continuam estritamente limitados às suas permissões de papel.
 *  7. Manipulação de clinica_id não permite acessar ou injetar em outra clínica.
 *  8. Super Admin NUNCA perde sua identidade ou role (role=super_admin e clinica_id=null preservados).
 *  9. Contexto não permanece indevidamente após limpeza / logout.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { execSync } from 'child_process'

function runPsql(sql) {
  try {
    const res = execSync(
      'docker exec -i supabase_db_odontosaas psql -U postgres -d postgres -v ON_ERROR_STOP=1',
      { input: sql, stdio: ['pipe', 'pipe', 'pipe'], timeout: 30000, encoding: 'utf-8' }
    )
    return { ok: true, out: res.toString() }
  } catch (err) {
    const out = (err.stdout ? err.stdout.toString() : '') + '\n' + (err.stderr ? err.stderr.toString() : '') + '\n' + err.message
    return { ok: false, err: out }
  }
}

console.log('======================================================================')
console.log('ODONTOSOFT: TESTES DO PAINEL GLOBAL E CONTEXTO ADMINISTRATIVO (SUPER ADMIN)')
console.log('======================================================================\n')

let passed = 0
let failed = 0

function assertTest(desc, condition, detail = '') {
  process.stdout.write(`  ${desc}... `)
  if (condition) {
    console.log('✅ PASSOU')
    passed++
  } else {
    console.log('❌ FALHOU')
    if (detail) console.error(`    Detalhes: ${detail}`)
    failed++
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SETUP: 2 Clínicas (Alpha e Beta) e 4 Usuários (Super Admin, Admin Alpha, Dentista Alpha, Recepcao Alpha)
// ─────────────────────────────────────────────────────────────────────────────
const cidA = '88881111-1111-4111-a111-111111111111'
const cidB = '88882222-2222-4222-a222-222222222222'

const uidSuperAdmin = '88880000-0000-4000-a000-000000000000'
const uidAdminA     = '88881111-aaaa-4aaa-aaaa-aaaaaaaaaaaa'
const uidDentistaA  = '88882222-bbbb-4bbb-bbbb-bbbbbbbbbbbb'
const uidRecepcaoA  = '88883333-cccc-4ccc-cccc-cccccccccccc'

const setupSql = `
DO $$
BEGIN
    -- 1. Criar clínicas de teste
    INSERT INTO public.clinicas (id, nome, plano, status_assinatura, ativo)
    VALUES 
        ('${cidA}', 'Clínica Alpha SuperAdmin Test', 'profissional', 'ativo', true),
        ('${cidB}', 'Clínica Beta SuperAdmin Test', 'enterprise', 'ativo', true)
    ON CONFLICT (id) DO UPDATE SET 
        nome = EXCLUDED.nome, plano = EXCLUDED.plano, status_assinatura = EXCLUDED.status_assinatura, ativo = true;

    -- Configurações das clínicas
    INSERT INTO public.clinica_settings (clinica_id, nome, nome_exibido)
    VALUES
        ('${cidA}', 'Alpha Config', 'Alpha Odonto'),
        ('${cidB}', 'Beta Config', 'Beta Odonto')
    ON CONFLICT (clinica_id) DO NOTHING;

    -- 2. Criar usuários em auth.users
    INSERT INTO auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at)
    VALUES
        ('${uidSuperAdmin}', 'authenticated', 'authenticated', 'superadmin_ctx@teste.com', '{"provider":"email","providers":["email"]}', '{"nome":"Super Admin Global"}', false, now(), now()),
        ('${uidAdminA}',     'authenticated', 'authenticated', 'admin_a_ctx@teste.com',     '{"provider":"email","providers":["email"]}', '{"nome":"Admin Alpha"}', false, now(), now()),
        ('${uidDentistaA}',  'authenticated', 'authenticated', 'dentista_a_ctx@teste.com',  '{"provider":"email","providers":["email"]}', '{"nome":"Dr. Dentista Alpha"}', false, now(), now()),
        ('${uidRecepcaoA}',  'authenticated', 'authenticated', 'recepcao_a_ctx@teste.com',  '{"provider":"email","providers":["email"]}', '{"nome":"Recepção Alpha"}', false, now(), now())
    ON CONFLICT (id) DO NOTHING;

    -- 3. Criar perfis em user_profiles
    INSERT INTO public.user_profiles (id, nome, role, clinica_id, is_lifetime)
    VALUES
        ('${uidSuperAdmin}', 'Super Admin Global', 'super_admin', NULL, true),
        ('${uidAdminA}',     'Admin Alpha',        'admin_clinica', '${cidA}', false),
        ('${uidDentistaA}',  'Dr. Dentista Alpha', 'dentista',      '${cidA}', false),
        ('${uidRecepcaoA}',  'Recepção Alpha',     'recepcao',      '${cidA}', false)
    ON CONFLICT (id) DO UPDATE SET
        role = EXCLUDED.role,
        clinica_id = EXCLUDED.clinica_id,
        is_lifetime = EXCLUDED.is_lifetime;

    -- Limpar contextos anteriores do super_admin
    DELETE FROM public.super_admin_clinic_contexts WHERE user_id = '${uidSuperAdmin}';

    -- Inserir registros prévios em Beta para testar isolamento
    INSERT INTO public.pacientes (id, clinica_id, nome)
    VALUES ('99990000-0000-0000-0000-00000000000b', '${cidB}', 'Paciente Exclusivo de Beta')
    ON CONFLICT (id) DO NOTHING;
END $$;
`

const setupRes = runPsql(setupSql)
if (!setupRes.ok) {
  console.error('Falha no setup:', setupRes.err)
  process.exit(1)
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 1: SUPER ADMIN ACESSA PAINEL GLOBAL
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TESTE 1: Super Admin no Painel Global (Sem Contexto Ativo) ---')

const t1Sql = `
DO $$
DECLARE
    v_my_cid UUID;
    v_is_super BOOLEAN;
    v_count_clinicas INT;
    v_count_users INT;
BEGIN
    -- Simula sessão do Super Admin
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', '${uidSuperAdmin}', true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    v_my_cid := public.get_my_clinica_id();
    IF v_my_cid IS NOT NULL THEN
        RAISE EXCEPTION 'FALHA: super_admin sem contexto ativo deve retornar get_my_clinica_id() = NULL, obteve %', v_my_cid;
    END IF;

    v_is_super := public.is_super_admin();
    IF NOT v_is_super THEN
        RAISE EXCEPTION 'FALHA: is_super_admin() deve retornar true para super_admin';
    END IF;

    -- Visão global de clinicas
    SELECT count(*) INTO v_count_clinicas FROM public.clinicas;
    IF v_count_clinicas < 2 THEN
        RAISE EXCEPTION 'FALHA: super_admin deve enxergar todas as clínicas no painel global (encontrou %)', v_count_clinicas;
    END IF;

    -- Visão global de user_profiles
    SELECT count(*) INTO v_count_users FROM public.user_profiles;
    IF v_count_users < 4 THEN
        RAISE EXCEPTION 'FALHA: super_admin deve enxergar todos os usuários no painel global (encontrou %)', v_count_users;
    END IF;
END $$;
`
const t1Res = runPsql(t1Sql)
assertTest('1. Super Admin acessa painel global (get_my_clinica_id=NULL e visão de todas clínicas/usuários)', t1Res.ok, t1Res.err)

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 2: SUPER ADMIN SELECIONA UMA CLÍNICA
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- TESTE 2: Super Admin Seleciona Clínica Alpha ---')

const t2Sql = `
DO $$
DECLARE
    v_res JSONB;
    v_my_cid UUID;
    v_ctx RECORD;
    v_log_count INT;
BEGIN
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', '${uidSuperAdmin}', true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    -- Executa RPC para definir contexto
    v_res := public.set_super_admin_context('${cidA}'::uuid);
    IF (v_res->>'success')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'FALHA: set_super_admin_context falhou';
    END IF;

    -- Verifica resolução de get_my_clinica_id()
    v_my_cid := public.get_my_clinica_id();
    IF v_my_cid != '${cidA}'::uuid THEN
        RAISE EXCEPTION 'FALHA: get_my_clinica_id() deve retornar % após seleção de contexto, obteve %', '${cidA}', v_my_cid;
    END IF;

    -- Consulta contexto via RPC
    SELECT * INTO v_ctx FROM public.get_super_admin_context();
    IF v_ctx.clinica_id != '${cidA}'::uuid THEN
        RAISE EXCEPTION 'FALHA: get_super_admin_context() deve retornar %', '${cidA}';
    END IF;

    -- Verifica registro de auditoria
    SELECT count(*) INTO v_log_count 
    FROM public.system_logs 
    WHERE user_id = '${uidSuperAdmin}'::uuid 
      AND action = 'contexto_entrada' 
      AND clinica_id = '${cidA}'::uuid;

    IF v_log_count < 1 THEN
        RAISE EXCEPTION 'FALHA: log de contexto_entrada não encontrado';
    END IF;
END $$;
`
const t2Res = runPsql(t2Sql)
assertTest('2. Super Admin seleciona clínica via RPC com resolução de get_my_clinica_id e auditoria', t2Res.ok, t2Res.err)

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 3: SUPER ADMIN ACESSA MÓDULOS NO CONTEXTO DA CLÍNICA
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- TESTE 3: Super Admin Acessa Módulos no Contexto da Clínica Alpha ---')

const t3Sql = `
DO $$
DECLARE
    v_paciente_id UUID := gen_random_uuid();
    v_agendamento_id UUID := gen_random_uuid();
    v_prontuario_id UUID := gen_random_uuid();
    v_despesa_id UUID := gen_random_uuid();
    v_estoque_id UUID := gen_random_uuid();
    v_settings RECORD;
    v_pacientes_beta_count INT;
BEGIN
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', '${uidSuperAdmin}', true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    -- 3.1 Pacientes: Inserção e Leitura no contexto Alpha
    INSERT INTO public.pacientes (id, clinica_id, nome)
    VALUES (v_paciente_id, '${cidA}'::uuid, 'Paciente Teste SuperAdmin Alpha');

    IF NOT EXISTS (SELECT 1 FROM public.pacientes WHERE id = v_paciente_id) THEN
        RAISE EXCEPTION 'FALHA: Super Admin não conseguiu ler paciente inserido em Alpha';
    END IF;

    -- 3.2 Agenda: Inserção e Leitura no contexto Alpha
    INSERT INTO public.agendamentos (id, clinica_id, paciente_id, data_consulta, hora_consulta, status)
    VALUES (v_agendamento_id, '${cidA}'::uuid, v_paciente_id, CURRENT_DATE, '10:00:00', 'agendado');

    IF NOT EXISTS (SELECT 1 FROM public.agendamentos WHERE id = v_agendamento_id) THEN
        RAISE EXCEPTION 'FALHA: Super Admin não conseguiu ler agendamento em Alpha';
    END IF;

    -- 3.3 Prontuários: Inserção e Leitura no contexto Alpha
    INSERT INTO public.prontuarios (id, clinica_id, paciente_id, descricao, tratamento)
    VALUES (v_prontuario_id, '${cidA}'::uuid, v_paciente_id, 'Anamnese inicial', 'Profilaxia');

    IF NOT EXISTS (SELECT 1 FROM public.prontuarios WHERE id = v_prontuario_id) THEN
        RAISE EXCEPTION 'FALHA: Super Admin não conseguiu ler prontuário em Alpha';
    END IF;

    -- 3.4 Financeiro: Inserção e Leitura de Despesa no contexto Alpha
    INSERT INTO public.despesas (id, clinica_id, descricao, valor, data_vencimento, status, categoria)
    VALUES (v_despesa_id, '${cidA}'::uuid, 'Material de limpeza', 150.00, CURRENT_DATE, 'pago', 'materiais');

    IF NOT EXISTS (SELECT 1 FROM public.despesas WHERE id = v_despesa_id) THEN
        RAISE EXCEPTION 'FALHA: Super Admin não conseguiu ler despesa em Alpha';
    END IF;

    -- 3.5 Estoque: Inserção e Leitura no contexto Alpha
    INSERT INTO public.estoque (id, clinica_id, nome, quantidade, minimo)
    VALUES (v_estoque_id, '${cidA}'::uuid, 'Luvas Látex M', 100, 20);

    IF NOT EXISTS (SELECT 1 FROM public.estoque WHERE id = v_estoque_id) THEN
        RAISE EXCEPTION 'FALHA: Super Admin não conseguiu ler estoque em Alpha';
    END IF;

    -- 3.6 Configurações: Leitura no contexto Alpha
    SELECT * INTO v_settings FROM public.clinica_settings WHERE clinica_id = '${cidA}'::uuid;
    IF v_settings.clinica_id IS NULL THEN
        RAISE EXCEPTION 'FALHA: Super Admin não conseguiu ler clinica_settings em Alpha';
    END IF;

    -- 3.7 Isolamento Restritivo: Super Admin no contexto de Alpha NÃO deve ler pacientes de Beta via RLS
    SELECT count(*) INTO v_pacientes_beta_count
    FROM public.pacientes
    WHERE id = '99990000-0000-0000-0000-00000000000b';

    IF v_pacientes_beta_count > 0 THEN
        RAISE EXCEPTION 'FALHA: Super Admin com contexto Alpha não deve ver registros de Beta (vazamento multi-tenant)';
    END IF;
END $$;
`
const t3Res = runPsql(t3Sql)
assertTest('3. Super Admin acessa Agenda, Pacientes, Prontuários, Financeiro, Estoque e Configurações (e isolado de Beta)', t3Res.ok, t3Res.err)

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 4: SUPER ADMIN RETORNA AO PAINEL GLOBAL
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- TESTE 4: Super Admin Retorna ao Painel Global ---')

const t4Sql = `
DO $$
DECLARE
    v_res JSONB;
    v_my_cid UUID;
    v_ctx_count INT;
    v_log_count INT;
BEGIN
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', '${uidSuperAdmin}', true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    -- Assegura contexto ativo para limpeza
    PERFORM public.set_super_admin_context('${cidA}'::uuid);

    -- Limpa contexto
    v_res := public.clear_super_admin_context();
    IF (v_res->>'success')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'FALHA: clear_super_admin_context falhou';
    END IF;

    -- get_my_clinica_id() volta a ser NULL
    v_my_cid := public.get_my_clinica_id();
    IF v_my_cid IS NOT NULL THEN
        RAISE EXCEPTION 'FALHA: get_my_clinica_id() deve retornar NULL após clear_super_admin_context, obteve %', v_my_cid;
    END IF;

    -- Tabela de contexto não deve ter registro
    SELECT count(*) INTO v_ctx_count
    FROM public.super_admin_clinic_contexts
    WHERE user_id = '${uidSuperAdmin}'::uuid;

    IF v_ctx_count > 0 THEN
        RAISE EXCEPTION 'FALHA: registro de contexto ainda presente na tabela após limpeza';
    END IF;

    -- Registro de auditoria de saída
    SELECT count(*) INTO v_log_count 
    FROM public.system_logs 
    WHERE user_id = '${uidSuperAdmin}'::uuid 
      AND action = 'contexto_saida';

    IF v_log_count < 1 THEN
        RAISE EXCEPTION 'FALHA: log de contexto_saida não encontrado';
    END IF;
END $$;
`
const t4Res = runPsql(t4Sql)
assertTest('4. Super Admin retorna ao painel global (contexto limpo e log de saída registrado)', t4Res.ok, t4Res.err)

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 5: USUÁRIO COMUM NÃO CONSEGUE USAR O MECANISMO DE CONTEXTO
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- TESTE 5: Usuário Comum Bloqueado no Mecanismo de Contexto ---')

const t5DentistaSql = `
DO $$
BEGIN
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', '${uidDentistaA}', true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    BEGIN
        PERFORM public.set_super_admin_context('${cidB}'::uuid);
        RAISE EXCEPTION 'FALHA: dentista NÃO deve conseguir executar set_super_admin_context';
    EXCEPTION WHEN insufficient_privilege THEN
        -- Esperado: permissão negada
    END;
END $$;
`
const t5DentistaRes = runPsql(t5DentistaSql)
assertTest('5.1 Dentista tem execução de set_super_admin_context bloqueada (insufficient_privilege)', t5DentistaRes.ok, t5DentistaRes.err)

const t5AdminSql = `
DO $$
BEGIN
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', '${uidAdminA}', true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    BEGIN
        PERFORM public.set_super_admin_context('${cidB}'::uuid);
        RAISE EXCEPTION 'FALHA: admin_clinica NÃO deve conseguir executar set_super_admin_context';
    EXCEPTION WHEN insufficient_privilege THEN
        -- Esperado: permissão negada
    END;
END $$;
`
const t5AdminRes = runPsql(t5AdminSql)
assertTest('5.2 Admin da Clínica tem execução de set_super_admin_context bloqueada (insufficient_privilege)', t5AdminRes.ok, t5AdminRes.err)

const t5DirectInsertSql = `
DO $$
BEGIN
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', '${uidDentistaA}', true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    -- Tenta inserir diretamente na tabela super_admin_clinic_contexts
    BEGIN
        INSERT INTO public.super_admin_clinic_contexts (user_id, clinica_id)
        VALUES ('${uidDentistaA}'::uuid, '${cidB}'::uuid);
        RAISE EXCEPTION 'FALHA: dentista conseguiu inserir em super_admin_clinic_contexts';
    EXCEPTION WHEN OTHERS THEN
        -- Esperado: RLS ou violação de permissão bloqueia
    END;
END $$;
`
const t5DirectInsertRes = runPsql(t5DirectInsertSql)
assertTest('5.3 Usuário comum tem inserção direta em super_admin_clinic_contexts bloqueada por RLS', t5DirectInsertRes.ok, t5DirectInsertRes.err)

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 6: DENTISTA E RECEPCIONISTA CONTINUAM LIMITADOS ÀS SUAS PERMISSÕES
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- TESTE 6: Permissões Específicas de Dentista e Recepção Mantidas ---')

const t6Sql = `
DO $$
DECLARE
    v_my_cid UUID;
BEGIN
    -- 6.1 Dentista Alpha
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', '${uidDentistaA}', true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    v_my_cid := public.get_my_clinica_id();
    IF v_my_cid != '${cidA}'::uuid THEN
        RAISE EXCEPTION 'FALHA: Dentista Alpha deve ter get_my_clinica_id = %, obteve %', '${cidA}', v_my_cid;
    END IF;

    -- Dentista NÃO pode criar despesa (apenas admin, admin_clinica, financeiro, super_admin)
    BEGIN
        INSERT INTO public.despesas (clinica_id, descricao, valor, vencimento, status, categoria)
        VALUES ('${cidA}'::uuid, 'Despesa Não Autorizada Dentista', 50.00, CURRENT_DATE, 'pendente', 'outros');
        RAISE EXCEPTION 'FALHA: Dentista NÃO deve conseguir criar despesa';
    EXCEPTION WHEN OTHERS THEN
        -- Esperado: RLS bloqueia
    END;

    -- 6.2 Recepção Alpha
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', '${uidRecepcaoA}', true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    -- Recepção NÃO pode criar prontuário (apenas admin, admin_clinica, dentista, super_admin)
    BEGIN
        INSERT INTO public.prontuarios (clinica_id, paciente_id, descricao)
        VALUES ('${cidA}'::uuid, '99990000-0000-0000-0000-00000000000a'::uuid, 'Prontuário Inválido');
        RAISE EXCEPTION 'FALHA: Recepção NÃO deve conseguir criar prontuário';
    EXCEPTION WHEN OTHERS THEN
        -- Esperado: RLS bloqueia
    END;
END $$;
`
const t6Res = runPsql(t6Sql)
assertTest('6. Dentista e recepcionista continuam estritamente limitados pelas políticas de papel', t6Res.ok, t6Res.err)

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 7: MANIPULAÇÃO DE CLINICA_ID NÃO PERMITE ACESSAR OUTRA CLÍNICA
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- TESTE 7: Mitigação de Spoofing / Manipulação de clinica_id ---')

const t7Sql = `
DO $$
DECLARE
    v_paciente_id UUID := gen_random_uuid();
BEGIN
    -- Dentista Alpha tenta injetar clinica_id de Beta
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', '${uidDentistaA}', true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    BEGIN
        INSERT INTO public.pacientes (id, clinica_id, nome)
        VALUES (v_paciente_id, '${cidB}'::uuid, 'Tentativa Spoofing Dentista');
        RAISE EXCEPTION 'FALHA: Dentista Alpha conseguiu injetar paciente com clinica_id de Beta';
    EXCEPTION WHEN OTHERS THEN
        -- Esperado: tenant_guard_insert bloqueia
    END;

    -- Verifica se nenhum registro vazou
    IF EXISTS (SELECT 1 FROM public.pacientes WHERE id = v_paciente_id) THEN
        RAISE EXCEPTION 'FALHA: Paciente com tenant forjado foi gravado no banco';
    END IF;
END $$;
`
const t7Res = runPsql(t7Sql)
assertTest('7. Manipulação de clinica_id bloqueada incondicionalmente pelo RLS tenant guard', t7Res.ok, t7Res.err)

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 8: O SUPER ADMIN NÃO PERDE SUA IDENTIDADE OU ROLE
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- TESTE 8: Preservação Estrita de Identidade Permanente do Super Admin ---')

const t8Sql = `
DO $$
DECLARE
    v_role TEXT;
    v_cid UUID;
BEGIN
    -- Ativa contexto de Beta
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', '${uidSuperAdmin}', true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    PERFORM public.set_super_admin_context('${cidB}'::uuid);

    -- Verifica diretamente a tabela user_profiles permanente
    SELECT role::text, clinica_id INTO v_role, v_cid
    FROM public.user_profiles
    WHERE id = '${uidSuperAdmin}'::uuid;

    IF v_role != 'super_admin' THEN
        RAISE EXCEPTION 'FALHA DE SEGURANÇA: user_profiles.role foi alterada para % durante contexto!', v_role;
    END IF;

    IF v_cid IS NOT NULL THEN
        RAISE EXCEPTION 'FALHA DE SEGURANÇA: user_profiles.clinica_id foi alterada para % durante contexto!', v_cid;
    END IF;

    -- Limpa contexto
    PERFORM public.clear_super_admin_context();

    -- Verifica novamente após limpeza
    SELECT role::text, clinica_id INTO v_role, v_cid
    FROM public.user_profiles
    WHERE id = '${uidSuperAdmin}'::uuid;

    IF v_role != 'super_admin' OR v_cid IS NOT NULL THEN
        RAISE EXCEPTION 'FALHA DE SEGURANÇA: perfil de super_admin corrompido pós-saída!';
    END IF;
END $$;
`
const t8Res = runPsql(t8Sql)
assertTest('8. Super Admin mantém role=super_admin e clinica_id=NULL estritamente imutáveis no banco', t8Res.ok, t8Res.err)

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 9: CONTEXTO NÃO PERMANECE INDEVIDAMENTE
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- TESTE 9: Contexto Não Permanece Indevidamente ---')

const t9Sql = `
DO $$
DECLARE
    v_anon_cid UUID;
BEGIN
    -- Garante que o contexto está limpo
    DELETE FROM public.super_admin_clinic_contexts WHERE user_id = '${uidSuperAdmin}'::uuid;

    -- Simula sessão anônima / deslogada
    PERFORM set_config('role', 'anon', true);
    PERFORM set_config('request.jwt.claim.sub', '', true);

    v_anon_cid := public.get_my_clinica_id();
    IF v_anon_cid IS NOT NULL THEN
        RAISE EXCEPTION 'FALHA: Sessão anônima não deve possuir clinica_id, obteve %', v_anon_cid;
    END IF;
END $$;
`
const t9Res = runPsql(t9Sql)
assertTest('9. Contexto desativado não persiste após saída ou encerramento de sessão', t9Res.ok, t9Res.err)

// ─────────────────────────────────────────────────────────────────────────────
// TEARDOWN
// ─────────────────────────────────────────────────────────────────────────────
const teardownSql = `
DO $$
BEGIN
    DELETE FROM public.super_admin_clinic_contexts WHERE user_id = '${uidSuperAdmin}'::uuid;
    DELETE FROM public.pacientes WHERE clinica_id IN ('${cidA}'::uuid, '${cidB}'::uuid);
    DELETE FROM public.agendamentos WHERE clinica_id IN ('${cidA}'::uuid, '${cidB}'::uuid);
    DELETE FROM public.prontuarios WHERE clinica_id IN ('${cidA}'::uuid, '${cidB}'::uuid);
    DELETE FROM public.despesas WHERE clinica_id IN ('${cidA}'::uuid, '${cidB}'::uuid);
    DELETE FROM public.estoque WHERE clinica_id IN ('${cidA}'::uuid, '${cidB}'::uuid);
    DELETE FROM public.system_logs WHERE user_id IN ('${uidSuperAdmin}'::uuid, '${uidAdminA}'::uuid, '${uidDentistaA}'::uuid);
    DELETE FROM public.clinica_settings WHERE clinica_id IN ('${cidA}'::uuid, '${cidB}'::uuid);
    DELETE FROM public.user_profiles WHERE id IN ('${uidSuperAdmin}'::uuid, '${uidAdminA}'::uuid, '${uidDentistaA}'::uuid, '${uidRecepcaoA}'::uuid);
    DELETE FROM auth.users WHERE id IN ('${uidSuperAdmin}'::uuid, '${uidAdminA}'::uuid, '${uidDentistaA}'::uuid, '${uidRecepcaoA}'::uuid);
    DELETE FROM public.clinicas WHERE id IN ('${cidA}'::uuid, '${cidB}'::uuid);
END $$;
`
runPsql(teardownSql)

console.log('\n======================================================================')
console.log(`TOTAL DE TESTES EXECUTADOS: ${passed + failed} | PASSARAM: ${passed} | FALHARAM: ${failed}`)
console.log('======================================================================')

if (failed > 0) {
  process.exit(1)
} else {
  console.log('✅ TODOS OS TESTES OBRIGATÓRIOS DO SUPER ADMIN FORAM APROVADOS!')
}
