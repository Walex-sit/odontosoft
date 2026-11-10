import { execSync } from 'child_process'

function runPsql(sql) {
  try {
    const res = execSync('docker exec -i supabase_db_odontosaas psql -U postgres -d postgres -v ON_ERROR_STOP=1', {
      input: sql,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 15000
    })
    const output = (res.stdout ? res.stdout.toString() : '') + (res.stderr ? res.stderr.toString() : '') + res.toString()
    return { success: true, output }
  } catch (err) {
    const output = (err.stdout ? err.stdout.toString() : '') + '\n' + (err.stderr ? err.stderr.toString() : '') + '\n' + err.message
    return { success: false, output, error: output }
  }
}

console.log('======================================================================')
console.log('AUDITORIA DE SEGURANÇA AO VIVO: RLS, MULTI-TENANCY, RPC E STORAGE')
console.log('======================================================================\n')

let passed = 0
let failed = 0

function runTest(name, sqlCheck) {
  process.stdout.write(`[TESTE] ${name}... `)
  const res = runPsql(sqlCheck)
  if (res.success && res.output.includes('TEST_OK')) {
    console.log('✅ PASSOU')
    passed++
  } else {
    console.log('❌ FALHOU')
    console.error('Detalhe do erro / saída:')
    console.error(res.error || res.output)
    failed++
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 1: RLS MULTI-TENANT ISOLATION ENTRE CLÍNICA ALFA E CLÍNICA BETA
// ─────────────────────────────────────────────────────────────────────────────
const testIsolationSql = `
DO $$
DECLARE
  v_cid_a UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_cid_b UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  v_uid_a UUID := '11111111-1111-1111-1111-111111111111';
  v_uid_b UUID := '22222222-2222-2222-2222-222222222222';
  v_pid_a UUID := 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
  v_pid_b UUID := 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2';
  v_count INTEGER;
BEGIN
  -- Setup: Garantir clínicas, auth.users e perfis
  INSERT INTO public.clinicas (id, nome) VALUES (v_cid_a, 'Clinica Alfa') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.clinicas (id, nome) VALUES (v_cid_b, 'Clinica Beta') ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.users (id, email) VALUES (v_uid_a, 'dr.alfa@odontosoft.com') ON CONFLICT (id) DO NOTHING;
  INSERT INTO auth.users (id, email) VALUES (v_uid_b, 'dr.beta@odontosoft.com') ON CONFLICT (id) DO NOTHING;

  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  INSERT INTO public.user_profiles (id, clinica_id, role, nome)
  VALUES (v_uid_a, v_cid_a, 'dentista', 'Dr. Alfa')
  ON CONFLICT (id) DO UPDATE SET clinica_id = v_cid_a, role = 'dentista';

  INSERT INTO public.user_profiles (id, clinica_id, role, nome)
  VALUES (v_uid_b, v_cid_b, 'dentista', 'Dr. Beta')
  ON CONFLICT (id) DO UPDATE SET clinica_id = v_cid_b, role = 'dentista';

  INSERT INTO public.pacientes (id, clinica_id, nome)
  VALUES (v_pid_a, v_cid_a, 'Paciente Alfa Exclusivo')
  ON CONFLICT (id) DO UPDATE SET clinica_id = v_cid_a;

  INSERT INTO public.pacientes (id, clinica_id, nome)
  VALUES (v_pid_b, v_cid_b, 'Paciente Beta Exclusivo')
  ON CONFLICT (id) DO UPDATE SET clinica_id = v_cid_b;

  -- ── Teste: Autenticar como Usuário A (Clínica Alfa) ──
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', format('{"sub": "%s", "role": "authenticated"}', v_uid_a), true);

  -- 1. Select deve retornar estritamente os pacientes da sua clínica (Alfa)
  SELECT count(*) INTO v_count FROM public.pacientes;
  IF v_count != 1 THEN
    RAISE EXCEPTION 'RLS FAIL: Usuario A viu % pacientes em vez de 1', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM public.pacientes WHERE id = v_pid_b;
  IF v_count != 0 THEN
    RAISE EXCEPTION 'RLS LEAK: Usuario A conseguiu ler Paciente B!';
  END IF;

  -- 2. Tentativa de Update no Paciente B da outra clínica deve afetar 0 linhas
  UPDATE public.pacientes SET nome = 'Hacked by Alfa' WHERE id = v_pid_b;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'RLS LEAK: Usuario A conseguiu modificar Paciente B!';
  END IF;

  -- ── Teste: Autenticar como Usuário B (Clínica Beta) ──
  PERFORM set_config('request.jwt.claims', format('{"sub": "%s", "role": "authenticated"}', v_uid_b), true);

  SELECT count(*) INTO v_count FROM public.pacientes WHERE id = v_pid_a;
  IF v_count != 0 THEN
    RAISE EXCEPTION 'RLS LEAK: Usuario B conseguiu ler Paciente A!';
  END IF;

  -- Reset
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);
END $$;
SELECT 'TEST_OK' as status;
`
runTest('Isolamento Multi-Tenant estrito entre Clínica Alfa e Clínica Beta no RLS', testIsolationSql)

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 2: MATRIZ DE AUTORIZAÇÃO DA RPC PROVISIONAR_NOVO_TENANT
// ─────────────────────────────────────────────────────────────────────────────
const testRpcMatrixSql = `
DO $$
DECLARE
  v_test_uid UUID := '33333333-3333-3333-3333-333333333333';
  v_new_cid UUID;
BEGIN
  -- Setup: user existe em auth.users
  INSERT INTO auth.users (id, email) VALUES (v_test_uid, 'pagante@stripe.com') ON CONFLICT (id) DO NOTHING;

  -- 1. Invocação legítima via service_role (Stripe Webhook)
  PERFORM set_config('role', 'service_role', true);
  PERFORM set_config('request.jwt.claims', '{"role": "service_role"}', true);
  v_new_cid := public.provisionar_novo_tenant(v_test_uid, 'Clinica Provisionada Stripe');
  IF v_new_cid IS NULL THEN
    RAISE EXCEPTION 'Falha ao provisionar via service_role';
  END IF;

  -- 2. Invocação direta via superuser administrativo (postgres local)
  PERFORM set_config('role', 'none', true);
  PERFORM set_config('request.jwt.claims', '', true);
  PERFORM public.provisionar_novo_tenant(v_test_uid, 'Clinica Provisionada Local Postgres');

  PERFORM set_config('role', 'postgres', true);
END $$;
SELECT 'TEST_OK' as status;
`
runTest('RPC provisionar_novo_tenant executa com service_role e administrativo local', testRpcMatrixSql)

const testRpcRejectionSql = `
DO $$
DECLARE
  v_test_uid UUID := '33333333-3333-3333-3333-333333333333';
BEGIN
  -- 1. Rejeição de authenticated
  BEGIN
    PERFORM set_config('role', 'authenticated', true);
    PERFORM public.provisionar_novo_tenant(v_test_uid, 'Tentativa Invasao');
    RAISE EXCEPTION 'FALHA: authenticated conseguiu invocar a RPC!';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL; -- Sucesso
  END;

  -- 2. Rejeição de anon
  BEGIN
    PERFORM set_config('role', 'anon', true);
    PERFORM public.provisionar_novo_tenant(v_test_uid, 'Tentativa Anon Invasao');
    RAISE EXCEPTION 'FALHA: anon conseguiu invocar a RPC!';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL; -- Sucesso
  END;

  PERFORM set_config('role', 'postgres', true);
END $$;
SELECT 'TEST_OK' as status;
`
runTest('RPC provisionar_novo_tenant bloqueia estritamente anon e authenticated', testRpcRejectionSql)

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 3: STORAGE LGPD — BUCKET CONSENTIMENTOS-EVIDENCIAS
// ─────────────────────────────────────────────────────────────────────────────
const testStorageSql = `
DO $$
DECLARE
  v_cid_a UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_cid_b UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  v_uid_admin_a UUID := '44444444-4444-4444-4444-444444444444';
  v_uid_dentista_a UUID := '11111111-1111-1111-1111-111111111111';
  v_count INTEGER;
  v_obj_id UUID := gen_random_uuid();
BEGIN
  -- Garantir que as clínicas existem
  INSERT INTO public.clinicas (id, nome) VALUES (v_cid_a, 'Clinica Alfa') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.clinicas (id, nome) VALUES (v_cid_b, 'Clinica Beta') ON CONFLICT (id) DO NOTHING;

  -- Setup: Criar admin da clinica A
  INSERT INTO auth.users (id, email) VALUES (v_uid_admin_a, 'admin.alfa@odontosoft.com') ON CONFLICT (id) DO NOTHING;
  
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  INSERT INTO public.user_profiles (id, clinica_id, role, nome)
  VALUES (v_uid_admin_a, v_cid_a, 'admin_clinica', 'Admin Alfa')
  ON CONFLICT (id) DO UPDATE SET clinica_id = v_cid_a, role = 'admin_clinica';

  -- Inserir objeto simulado de consentimento pertencente à Clínica Alfa
  INSERT INTO storage.objects (id, bucket_id, name, owner)
  VALUES (v_obj_id, 'consentimentos-evidencias', format('%s/paciente-1/termo.pdf', v_cid_a), v_uid_admin_a)
  ON CONFLICT (id) DO NOTHING;

  -- Habilita flag interna da Storage API do Supabase para teste de DELETE com RLS
  PERFORM set_config('storage.allow_delete_query', 'true', true);

  -- 1. Dentista da Clínica Alfa pode ler termo da sua clínica
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', format('{"sub": "%s", "role": "authenticated"}', v_uid_dentista_a), true);

  SELECT count(*) INTO v_count FROM storage.objects WHERE bucket_id = 'consentimentos-evidencias' AND id = v_obj_id;
  IF v_count != 1 THEN
    RAISE EXCEPTION 'Storage RLS: Dentista da Clinica A nao conseguiu ler documento da sua clinica';
  END IF;

  -- 2. Dentista NÃO tem permissão de DELETE no termo (apenas admin_clinica e super_admin)
  DELETE FROM storage.objects WHERE id = v_obj_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Storage RLS: Dentista conseguiu excluir termo probatorio! Imutabilidade violada.';
  END IF;

  -- 3. Usuário de outra clínica (Beta) NÃO consegue ler documento da Clínica Alfa
  PERFORM set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);
  SELECT count(*) INTO v_count FROM storage.objects WHERE bucket_id = 'consentimentos-evidencias' AND id = v_obj_id;
  IF v_count != 0 THEN
    RAISE EXCEPTION 'Storage RLS: Usuario da Clinica B conseguiu ler termo da Clinica A!';
  END IF;

  -- 4. Admin da Clínica Alfa PODE realizar expurgo controlado do seu documento
  PERFORM set_config('request.jwt.claims', format('{"sub": "%s", "role": "authenticated"}', v_uid_admin_a), true);
  DELETE FROM storage.objects WHERE id = v_obj_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count != 1 THEN
    RAISE EXCEPTION 'Storage RLS: Admin da Clinica A nao conseguiu excluir seu proprio documento para expurgo';
  END IF;

  PERFORM set_config('role', 'postgres', true);
END $$;
SELECT 'TEST_OK' as status;
`
runTest('Storage LGPD: Isolamento por tenant, leitura, bloqueio de dentista e expurgo por admin_clinica', testStorageSql)

console.log(`\n======================================================================`)
console.log(`TOTAL DE TESTES REAIS NO POSTGRESQL: ${passed} PASSARAM, ${failed} FALHARAM`)
console.log(`======================================================================`)

if (failed > 0) process.exit(1)

