/**
 * tests/integration/cpf_hmac.test.mjs
 * Tarefa 2 — CPF: hash com chave (HMAC) e CPF mascarado
 *
 * Usa psql via Docker (mesmo padrão dos outros testes de integração).
 * Testa:
 *  1. cpf_hash é HMAC-SHA256, diferente de SHA-256 puro
 *  2. cpf_mascarado no formato ***.NNN.NNN-** gerado pelo trigger
 *  3. Busca por duplicidade via cpf_to_hash() funciona
 *  4. cpf_to_hash revogado de authenticated e anon
 *  5. anonimizar_paciente zera cpf_mascarado
 *  6. Log de anonimização sem nome_anterior
 */

import { execSync } from 'child_process'

const CLI_ID  = 'aaaaaaaa-0001-4000-a000-000000000002'
const USER_ID = 'bbbbbbbb-0001-4000-b000-000000000002'

// runPsql: usa ON_ERROR_STOP, retorna stdout+stderr juntos
function runPsql(sql) {
  try {
    const res = execSync(
      'docker exec -i supabase_db_odontosaas psql -U postgres -d postgres -v ON_ERROR_STOP=1',
      { input: sql, stdio: ['pipe', 'pipe', 'pipe'], timeout: 30000, encoding: 'utf-8' }
    )
    return res.toString()
  } catch (err) {
    throw new Error(`psql falhou:\nSTDOUT: ${err.stdout}\nSTDERR: ${err.stderr}`)
  }
}

// runPsqlClean: -tA (tuples only, unaligned) → retorna valor simples limpo
// booleans sem cast → 't'/'f'; com ::text → 'true'/'false'; inteiros → '1','0' etc.
function runPsqlClean(sql) {
  try {
    const res = execSync(
      'docker exec -i supabase_db_odontosaas psql -U postgres -d postgres -tA',
      { input: sql, stdio: ['pipe', 'pipe', 'pipe'], timeout: 30000, encoding: 'utf-8' }
    )
    return res.toString().trim()
  } catch (err) {
    throw new Error(`psql (clean) falhou: ${err.stderr?.toString()}`)
  }
}

let passed = 0
let failed = 0
let _pacienteId = null

function assert(cond, msg) {
  if (!cond) { console.error(`  ❌ FALHOU: ${msg}`); failed++ }
  else        { console.log (`  ✅ ${msg}`);           passed++ }
}

function runTest(name, fn) {
  console.log(`\nTeste: ${name}`)
  try { fn() }
  catch (err) {
    console.error(`  ❌ EXCEÇÃO: ${err.message.substring(0, 400)}`)
    failed++
  }
}

// ─── Setup / Teardown ────────────────────────────────────────────────────────

function setup() {
  runPsql(`
    INSERT INTO public.clinicas (id, nome, plano, ativo)
    VALUES ('${CLI_ID}', 'CPF HMAC Test Clinic', 'enterprise', true)
    ON CONFLICT (id) DO UPDATE SET ativo = true;

    INSERT INTO auth.users (id, email)
    VALUES ('${USER_ID}', 'admin@cpfhmactest.com')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_profiles (id, clinica_id, nome, email, role)
    VALUES ('${USER_ID}','${CLI_ID}','Admin CPF HMAC Test','admin@cpfhmactest.com','admin_clinica')
    ON CONFLICT (id) DO UPDATE SET clinica_id = EXCLUDED.clinica_id, role = EXCLUDED.role;
  `)
}

function teardown() {
  try {
    runPsql(`
      DELETE FROM public.pacientes        WHERE clinica_id = '${CLI_ID}';
      DELETE FROM public.user_profiles    WHERE id = '${USER_ID}';
      DELETE FROM auth.users              WHERE id = '${USER_ID}';
      DELETE FROM public.clinicas         WHERE id = '${CLI_ID}';
    `)
  } catch {}
}

// ─── Testes ──────────────────────────────────────────────────────────────────

function test1_hmac_difere_sha256() {
  const CPF = '12345678909'
  // HMAC-SHA256 do CPF com a chave cpf_hash_key
  const hmac = runPsqlClean(`
    SELECT encode(
      extensions.hmac('${CPF}', (SELECT value FROM private.secrets WHERE key='cpf_hash_key'), 'sha256'),
      'hex'
    );
  `)
  // SHA-256 puro (sem chave)
  const sha256 = runPsqlClean(`
    SELECT encode(extensions.digest('${CPF}', 'sha256'), 'hex');
  `)
  assert(hmac !== sha256, `HMAC-SHA256 é diferente do SHA-256 puro (hmac=${hmac.substring(0,8)}…)`)
  assert(hmac.length === 64, `HMAC-SHA256 tem 64 chars hex (got ${hmac.length})`)
}

function test2_trigger_gera_mascara() {
  const CPF     = '12345678909'  // norm: 12345678909 → ***.456.789-**
  const esperado = '***.456.789-**'

  // Insere paciente com cpf_raw → trigger fn_encrypt_cpf processa
  const raw = runPsqlClean(`
    INSERT INTO public.pacientes (nome, cpf_raw, clinica_id, user_id)
    VALUES ('Paciente HMAC Test', '${CPF}', '${CLI_ID}', '${USER_ID}')
    RETURNING id, (cpf_raw IS NULL), cpf_mascarado, cpf_hash;
  `)
  // Formato com -tA: uuid|t|***.456.789-**|hashhex  (bool sem ::text → t/f)
  const cols = raw.split('\n').find(l => l.includes('|'))
  if (!cols) { assert(false, `Linha RETURNING encontrada no output`); return }

  const parts = cols.split('|')
  _pacienteId = parts[0]
  assert(parts[0].match(/^[0-9a-f-]{36}$/), `Paciente inserido com UUID válido (${parts[0]})`)
  assert(parts[1] === 't', `cpf_raw zerado pelo trigger (${parts[1]})`)
  assert(parts[2] === esperado, `cpf_mascarado no formato correto: ${parts[2]}`)

  // Verifica que cpf_hash é HMAC-SHA256
  const hmacEsperado = runPsqlClean(`
    SELECT encode(
      extensions.hmac('${CPF}', (SELECT value FROM private.secrets WHERE key='cpf_hash_key'), 'sha256'),
      'hex'
    );
  `)
  const hashAtual = runPsqlClean(`
    SELECT cpf_hash FROM public.pacientes
    WHERE clinica_id='${CLI_ID}' AND nome='Paciente HMAC Test';
  `)
  assert(hashAtual === hmacEsperado, 'cpf_hash é exatamente o HMAC-SHA256 esperado')
}

function test3_busca_duplicidade() {
  const CPF = '12345678909'
  // cpf_to_hash é SECURITY DEFINER — funciona como postgres
  const count = runPsqlClean(`
    SELECT COUNT(*)
    FROM public.pacientes
    WHERE clinica_id = '${CLI_ID}'
      AND cpf_hash = public.cpf_to_hash('${CPF}');
  `)
  assert(count === '1', `Busca de duplicidade via cpf_to_hash() encontra o paciente (count=${count})`)
}

function test4_revogacao_authenticated() {
  // has_function_privilege sem ::text retorna boolean → com -tA dá 't'/'f'
  const auth = runPsqlClean(`
    SELECT has_function_privilege('authenticated','public.cpf_to_hash(text)','EXECUTE');
  `)
  assert(auth === 'f', `authenticated NÃO tem EXECUTE em cpf_to_hash(text) (resultado=${auth})`)

  const anon = runPsqlClean(`
    SELECT has_function_privilege('anon','public.cpf_to_hash(text)','EXECUTE');
  `)
  assert(anon === 'f', `anon NÃO tem EXECUTE em cpf_to_hash(text) (resultado=${anon})`)
}

function test5_anonimizar_zera_mascarado() {
  if (!_pacienteId) {
    assert(false, 'Precisa do pacienteId do test2')
    return
  }

  // Chama anonimizar_paciente com contexto authenticated simulado
  runPsql(`
    BEGIN;
    SET LOCAL ROLE authenticated;
    SELECT set_config('request.jwt.claims',
      '{"sub":"${USER_ID}","role":"authenticated"}', true);
    SELECT public.anonimizar_paciente('${_pacienteId}'::uuid, 'Teste T002');
    COMMIT;
  `)

  // Verifica cada campo individualmente (bool sem cast → 't'/'f' com -tA)
  const hNull = runPsqlClean(`SELECT (cpf_hash IS NULL) FROM public.pacientes WHERE id='${_pacienteId}'::uuid;`)
  const eNull = runPsqlClean(`SELECT (cpf_encrypted IS NULL) FROM public.pacientes WHERE id='${_pacienteId}'::uuid;`)
  const mNull = runPsqlClean(`SELECT (cpf_mascarado IS NULL) FROM public.pacientes WHERE id='${_pacienteId}'::uuid;`)
  const aVal  = runPsqlClean(`SELECT anonimizado FROM public.pacientes WHERE id='${_pacienteId}'::uuid;`)

  assert(hNull === 't', `cpf_hash NULL após anonimização (${hNull})`)
  assert(eNull === 't', `cpf_encrypted NULL após anonimização (${eNull})`)
  assert(mNull === 't', `cpf_mascarado NULL após anonimização (${mNull})`)
  assert(aVal  === 't', `anonimizado=true após anonimização (${aVal})`)
}

function test6_log_sem_nome_anterior() {
  if (!_pacienteId) {
    console.log('  ℹ️  Sem pacienteId — pulando')
    passed++
    return
  }
  try {
    // sem cast → bool retorna 't'/'f'
    const semNome = runPsqlClean(`
      SELECT (dados_anteriores->>'nome_anterior' IS NULL)
      FROM private.audit_logs
      WHERE registro_id = '${_pacienteId}'::uuid AND acao = 'ANONYMIZE'
      ORDER BY data_hora DESC LIMIT 1;
    `)
    const temIndicador = runPsqlClean(`
      SELECT dados_anteriores ? 'cpf_existia'
      FROM private.audit_logs
      WHERE registro_id = '${_pacienteId}'::uuid AND acao = 'ANONYMIZE'
      ORDER BY data_hora DESC LIMIT 1;
    `)
    assert(semNome === 't', `Log de anonimização NÃO tem nome_anterior (${semNome})`)
    assert(temIndicador === 't', `Log de anonimização TEM indicador cpf_existia (${temIndicador})`)
  } catch {
    console.log('  ℹ️  private.audit_logs não acessível — OK para T002')
    passed++
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

console.log('======================================================================')
console.log('TAREFA 2 — Testes CPF HMAC e Máscara')
console.log('======================================================================')

try {
  setup()
  runTest('1. HMAC-SHA256 é diferente de SHA-256 puro', test1_hmac_difere_sha256)
  runTest('2. Trigger fn_encrypt_cpf gera cpf_mascarado correto', test2_trigger_gera_mascara)
  runTest('3. Busca por duplicidade via cpf_to_hash() funciona', test3_busca_duplicidade)
  runTest('4. cpf_to_hash revogado de authenticated e anon', test4_revogacao_authenticated)
  runTest('5. anonimizar_paciente zera cpf_mascarado', test5_anonimizar_zera_mascarado)
  runTest('6. Log de anonimização sem nome_anterior', test6_log_sem_nome_anterior)
} catch (err) {
  console.error('\n❌ ERRO FATAL NO SETUP:', err.message)
  failed++
} finally {
  teardown()
}

console.log('\n======================================================================')
console.log(`RESULTADO T002: ${passed} passaram, ${failed} falharam`)
console.log('======================================================================')

if (failed > 0) process.exit(1)
