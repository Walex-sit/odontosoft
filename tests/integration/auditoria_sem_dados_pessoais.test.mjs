/**
 * tests/integration/auditoria_sem_dados_pessoais.test.mjs
 * Tarefa 5 — Auditoria sem dados pessoais
 *
 * Testes obrigatórios:
 * 1. Apos INSERT de paciente, o audit_log NÃO contem nome, e-mail, CPF nem endereco.
 * 2. Apos UPDATE de paciente, o audit_log NÃO contem nome, e-mail, CPF nem endereco;
 *    contem somente IDs e NOMES das colunas alteradas.
 * 3. anonimizar_paciente: NÃO grava nome_anterior no audit_log.
 * 4. prontuarios e evolucao: mantidos sem alteracao (gravação completa de diff preservada).
 *
 * Executa contra o banco LOCAL (Docker supabase_db_odontosaas).
 * Uso: node tests/integration/auditoria_sem_dados_pessoais.test.mjs
 */

import { execSync } from 'child_process'
import { randomUUID } from 'crypto'

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
console.log('TAREFA 5 — Testes de Auditoria sem Dados Pessoais (PostgreSQL Triggers)')
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
// 1. SETUP: Clínica e Usuário Admin para teste
// ─────────────────────────────────────────────────────────────────────────────
const clinicaId = randomUUID()
const adminUserId = randomUUID()
const pacienteId = randomUUID()
const prontuarioId = randomUUID()

const setupSql = `
DO $$
BEGIN
  -- Clínica
  INSERT INTO public.clinicas (id, nome, plano, status_assinatura, ativo)
  VALUES ('${clinicaId}', 'Clinica Auditoria T5', 'profissional', 'ativo', true);

  -- Admin User
  INSERT INTO auth.users (id, email)
  VALUES ('${adminUserId}', 'admin_t5_${adminUserId.slice(0, 8)}@auditoria.internal')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_profiles (id, nome, email, role, clinica_id)
  VALUES ('${adminUserId}', 'Admin Auditoria', 'admin_t5_${adminUserId.slice(0, 8)}@auditoria.internal', 'admin_clinica', '${clinicaId}')
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    clinica_id = EXCLUDED.clinica_id,
    nome = EXCLUDED.nome;
END $$;
`
const setupRes = runPsql(setupSql)
if (!setupRes.ok) {
  console.error('Falha no setup:', setupRes.err)
  process.exit(1)
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. TESTE: INSERT DE PACIENTE — NÃO DEVE CONTER NOME, EMAIL, CPF, ENDEREÇO
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TESTE 1: INSERT de paciente ---')

const insertPacienteSql = `
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"${adminUserId}","role":"authenticated"}', true);

INSERT INTO public.pacientes (
  id,
  clinica_id,
  nome,
  email,
  telefone,
  cpf_raw,
  endereco,
  rua,
  numero,
  bairro,
  cidade,
  cep
) VALUES (
  '${pacienteId}',
  '${clinicaId}',
  'Carlos Eduardo Silva Teste',
  'carlos.eduardo@identificavel.internal',
  '11987654321',
  '52998224725',
  'Rua das Palmeiras 456 Apto 12',
  'Rua das Palmeiras',
  '456',
  'Jardins',
  'Sao Paulo',
  '01415000'
);

COMMIT;
`
const insertRes = runPsql(insertPacienteSql)
assertTest('1.1 INSERT de paciente executado com sucesso', insertRes.ok, insertRes.err)

// Consulta o log gerado no private.audit_logs
const checkInsertLogSql = `
SELECT json_build_object(
  'acao', acao,
  'tabela', tabela,
  'registro_id', registro_id,
  'dados_anteriores', dados_anteriores,
  'dados_novos', dados_novos
) AS log_row
FROM private.audit_logs
WHERE tabela = 'pacientes'
  AND registro_id = '${pacienteId}'
  AND acao = 'INSERT'
ORDER BY data_hora DESC
LIMIT 1;
`
const insertLogRes = runPsql(checkInsertLogSql)
assertTest('1.2 Log de INSERT encontrado no banco', insertLogRes.ok, insertLogRes.err)

const insertLogRaw = insertLogRes.out
console.log('  Log bruto de INSERT:\n', insertLogRaw)

assertTest(
  '1.3 Log de INSERT NÃO contém nome do paciente',
  !insertLogRaw.includes('Carlos Eduardo Silva Teste') && !insertLogRaw.includes('Carlos Eduardo')
)
assertTest(
  '1.4 Log de INSERT NÃO contém e-mail do paciente',
  !insertLogRaw.includes('carlos.eduardo@identificavel.internal')
)
assertTest(
  '1.5 Log de INSERT NÃO contém CPF do paciente',
  !insertLogRaw.includes('52998224725') && !insertLogRaw.includes('529.982.247-25')
)
assertTest(
  '1.6 Log de INSERT NÃO contém endereço do paciente',
  !insertLogRaw.includes('Rua das Palmeiras') && !insertLogRaw.includes('Jardins') && !insertLogRaw.includes('01415000')
)
assertTest(
  '1.7 Log de INSERT contém registro_id (ID do paciente)',
  insertLogRaw.includes(pacienteId)
)
assertTest(
  '1.8 Log de INSERT contém nomes das colunas inseridas em colunas_inseridas',
  insertLogRaw.includes('colunas_inseridas') && insertLogRaw.includes('nome') && insertLogRaw.includes('email')
)

// ─────────────────────────────────────────────────────────────────────────────
// 3. TESTE: UPDATE DE PACIENTE — SÓ IDS E NOMES DAS COLUNAS ALTERADAS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- TESTE 2: UPDATE de paciente ---')

const updatePacienteSql = `
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"${adminUserId}","role":"authenticated"}', true);

UPDATE public.pacientes
SET
  nome = 'Carlos Modificado Santos',
  email = 'carlos.novo@alterado.internal',
  telefone = '11999998888',
  rua = 'Avenida Brasil Nova'
WHERE id = '${pacienteId}';

COMMIT;
`
const updateRes = runPsql(updatePacienteSql)
assertTest('2.1 UPDATE de paciente executado com sucesso', updateRes.ok, updateRes.err)

const checkUpdateLogSql = `
SELECT json_build_object(
  'acao', acao,
  'tabela', tabela,
  'registro_id', registro_id,
  'dados_anteriores', dados_anteriores,
  'dados_novos', dados_novos
) AS log_row
FROM private.audit_logs
WHERE tabela = 'pacientes'
  AND registro_id = '${pacienteId}'
  AND acao = 'UPDATE'
ORDER BY data_hora DESC
LIMIT 1;
`
const updateLogRes = runPsql(checkUpdateLogSql)
assertTest('2.2 Log de UPDATE encontrado no banco', updateLogRes.ok, updateLogRes.err)

const updateLogRaw = updateLogRes.out
console.log('  Log bruto de UPDATE:\n', updateLogRaw)

assertTest(
  '2.3 Log de UPDATE NÃO contém nome novo nem nome antigo',
  !updateLogRaw.includes('Carlos Modificado Santos') && !updateLogRaw.includes('Carlos Eduardo Silva Teste')
)
assertTest(
  '2.4 Log de UPDATE NÃO contém e-mail novo nem antigo',
  !updateLogRaw.includes('carlos.novo@alterado.internal') && !updateLogRaw.includes('carlos.eduardo@identificavel.internal')
)
assertTest(
  '2.5 Log de UPDATE NÃO contém telefone novo nem antigo',
  !updateLogRaw.includes('11999998888') && !updateLogRaw.includes('11987654321')
)
assertTest(
  '2.6 Log de UPDATE NÃO contém endereço novo nem antigo',
  !updateLogRaw.includes('Avenida Brasil Nova') && !updateLogRaw.includes('Rua das Palmeiras')
)
assertTest(
  '2.7 Log de UPDATE contém lista de NOMES das colunas alteradas',
  updateLogRaw.includes('colunas_alteradas') &&
  updateLogRaw.includes('nome') &&
  updateLogRaw.includes('email') &&
  updateLogRaw.includes('telefone') &&
  updateLogRaw.includes('rua')
)

// ─────────────────────────────────────────────────────────────────────────────
// 4. TESTE: anonimizar_paciente — NÃO GRAVA nome_anterior
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- TESTE 3: anonimizar_paciente sem nome_anterior ---')

const anonimizarSql = `
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"${adminUserId}","role":"authenticated"}', true);

SELECT public.anonimizar_paciente('${pacienteId}'::uuid, 'Solicitacao do titular LGPD');

COMMIT;
`
const anonRes = runPsql(anonimizarSql)
assertTest('3.1 RPC anonimizar_paciente executada com sucesso', anonRes.ok, anonRes.err)

const checkAnonLogSql = `
SELECT json_build_object(
  'acao', acao,
  'tabela', tabela,
  'registro_id', registro_id,
  'dados_anteriores', dados_anteriores,
  'dados_novos', dados_novos
) AS log_row
FROM private.audit_logs
WHERE tabela = 'pacientes'
  AND registro_id = '${pacienteId}'
  AND acao = 'ANONYMIZE'
ORDER BY data_hora DESC
LIMIT 1;
`
const anonLogRes = runPsql(checkAnonLogSql)
assertTest('3.2 Log ANONYMIZE encontrado no banco', anonLogRes.ok, anonLogRes.err)

const anonLogRaw = anonLogRes.out
console.log('  Log bruto de ANONYMIZE:\n', anonLogRaw)

assertTest(
  '3.3 Log ANONYMIZE NÃO contém a chave "nome_anterior"',
  !anonLogRaw.includes('nome_anterior')
)
assertTest(
  '3.4 Log ANONYMIZE NÃO contém valor do nome anterior do paciente',
  !anonLogRaw.includes('Carlos Modificado Santos') && !anonLogRaw.includes('Carlos Eduardo')
)
assertTest(
  '3.5 Log ANONYMIZE contém confirmação de cpf_existia',
  anonLogRaw.includes('cpf_existia')
)

// ─────────────────────────────────────────────────────────────────────────────
// 5. TESTE: prontuários — MANTIDO SEM ALTERAÇÃO (DECISÃO DO DONO/DPO)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- TESTE 4: Prontuários mantidos com comportamento original ---')

const insertProntuarioSql = `
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"${adminUserId}","role":"authenticated"}', true);

INSERT INTO public.prontuarios (
  id,
  clinica_id,
  paciente_id,
  dentista_id,
  descricao
) VALUES (
  '${prontuarioId}',
  '${clinicaId}',
  '${pacienteId}',
  '${adminUserId}',
  'Descricao clinica do procedimento odontologico preservada na integra'
);

COMMIT;
`
const prontuarioRes = runPsql(insertProntuarioSql)
assertTest('4.1 INSERT de prontuário executado com sucesso', prontuarioRes.ok, prontuarioRes.err)

const checkProntuarioLogSql = `
SELECT json_build_object(
  'acao', acao,
  'tabela', tabela,
  'registro_id', registro_id,
  'dados_novos', dados_novos
) AS log_row
FROM private.audit_logs
WHERE tabela = 'prontuarios'
  AND registro_id = '${prontuarioId}'
  AND acao = 'INSERT'
ORDER BY data_hora DESC
LIMIT 1;
`
const prontuarioLogRes = runPsql(checkProntuarioLogSql)
assertTest('4.2 Log de INSERT de prontuário encontrado', prontuarioLogRes.ok, prontuarioLogRes.err)

const prontuarioLogRaw = prontuarioLogRes.out
console.log('  Log bruto de Prontuário:\n', prontuarioLogRaw)

assertTest(
  '4.3 Log de prontuário NÃO contém payload clínico (descricao ou tratamento)',
  !prontuarioLogRaw.includes('Descricao clinica do procedimento odontologico preservada na integra')
)
assertTest(
  '4.4 Log de prontuário registra metadados de rastreabilidade (tipo_registro, status)',
  prontuarioLogRaw.includes('registro_clinico') && prontuarioLogRaw.includes('registrada')
)

// ─────────────────────────────────────────────────────────────────────────────
// 6. TEARDOWN
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n=== TEARDOWN: limpando dados do teste ===')
const teardownSql = `
DO $$
BEGIN
  -- Em testes, não deletamos prontuarios fisicamente (proibido por CFO 198/2019)
  -- Deleta os demais registros associados
  DELETE FROM private.audit_logs WHERE clinica_id = '${clinicaId}';
  DELETE FROM public.paciente_consentimentos WHERE clinica_id = '${clinicaId}';
  DELETE FROM public.pacientes WHERE clinica_id = '${clinicaId}';
  DELETE FROM public.user_profiles WHERE clinica_id = '${clinicaId}';
  DELETE FROM auth.users WHERE id = '${adminUserId}';
END $$;
`
runPsql(teardownSql)
console.log('Teardown concluído.')

// ─────────────────────────────────────────────────────────────────────────────
// RESULTADO FINAL
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n======================================================================')
console.log(`RESULTADO FINAL TAREFA 5: ${passed} passaram, ${failed} falharam`)
console.log('======================================================================\n')

if (failed > 0) process.exit(1)
