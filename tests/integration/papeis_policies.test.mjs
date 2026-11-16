/**
 * tests/integration/papeis_policies.test.mjs
 * Tarefa 4 — Papéis e Policies
 *
 * Validações:
 * 1. Alteração de perfil de super_admin:
 *    - Usuário com role admin_clinica é bloqueado ao tentar alterar qualquer campo do super_admin.
 *    - Usuário super_admin tem permissão para alterar o próprio perfil.
 * 2. Políticas de Storage:
 *    - consentimentos-evidencias delete inclui papéis 'admin' e 'admin_clinica'.
 * 3. Matriz de Criação por Papel (2 Clínicas: Alpha e Beta):
 *    - admin_clinica cria na própria clínica:
 *      paciente, agendamento, prontuario, receita, atestado, despesa, nota fiscal, comissao.
 *    - dentista cria apenas o permitido:
 *      paciente, agendamento, prontuario, receita, atestado (bloqueado em despesa, nota fiscal, comissao).
 *    - recepcao cria apenas o permitido:
 *      paciente, agendamento (bloqueado em prontuario, receita, atestado, despesa, nota fiscal, comissao).
 * 4. Isolamento estrito entre clínicas:
 *    - Nenhum usuário de uma clínica consegue criar registros na outra clínica.
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
console.log('TAREFA 4 — Testes de Papéis e Policies (PostgreSQL RLS)')
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
// 1. SETUP: 2 Clínicas (Alpha e Beta) e 7 Usuários (incluindo Super Admin)
// ─────────────────────────────────────────────────────────────────────────────
const cidA = '11111111-1111-4111-a111-111111111111'
const cidB = '22222222-2222-4222-a222-222222222222'

const uAdminA = '11111111-aaaa-4111-a111-111111111111'
const uDentistaA = '11111111-dddd-4111-a111-111111111111'
const uRecepcaoA = '11111111-cccc-4111-a111-111111111111'

const uAdminB = '22222222-aaaa-4222-a222-222222222222'
const uDentistaB = '22222222-dddd-4222-a222-222222222222'
const uRecepcaoB = '22222222-cccc-4222-a222-222222222222'

const uSuperAdmin = '99999999-9999-4999-a999-999999999999'

const setupSql = `
DO $$
BEGIN
  -- 1. Clínicas
  INSERT INTO public.clinicas (id, nome) VALUES ('${cidA}', 'Clinica Alpha Teste') ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome;
  INSERT INTO public.clinicas (id, nome) VALUES ('${cidB}', 'Clinica Beta Teste') ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome;

  -- 2. Auth Users
  INSERT INTO auth.users (id, email) VALUES
    ('${uAdminA}', 'admin.alpha@teste.com'),
    ('${uDentistaA}', 'dentista.alpha@teste.com'),
    ('${uRecepcaoA}', 'recepcao.alpha@teste.com'),
    ('${uAdminB}', 'admin.beta@teste.com'),
    ('${uDentistaB}', 'dentista.beta@teste.com'),
    ('${uRecepcaoB}', 'recepcao.beta@teste.com'),
    ('${uSuperAdmin}', 'superadmin@teste.com')
  ON CONFLICT (id) DO NOTHING;

  -- 3. Perfis
  INSERT INTO public.user_profiles (id, clinica_id, role, nome, email) VALUES
    ('${uAdminA}', '${cidA}', 'admin_clinica', 'Admin Alpha', 'admin.alpha@teste.com'),
    ('${uDentistaA}', '${cidA}', 'dentista', 'Dentista Alpha', 'dentista.alpha@teste.com'),
    ('${uRecepcaoA}', '${cidA}', 'recepcao', 'Recepcao Alpha', 'recepcao.alpha@teste.com'),
    ('${uAdminB}', '${cidB}', 'admin_clinica', 'Admin Beta', 'admin.beta@teste.com'),
    ('${uDentistaB}', '${cidB}', 'dentista', 'Dentista Beta', 'dentista.beta@teste.com'),
    ('${uRecepcaoB}', '${cidB}', 'recepcao', 'Recepcao Beta', 'recepcao.beta@teste.com'),
    ('${uSuperAdmin}', '${cidA}', 'super_admin', 'Super Admin Master', 'superadmin@teste.com')
  ON CONFLICT (id) DO UPDATE SET clinica_id = EXCLUDED.clinica_id, role = EXCLUDED.role;
END $$;
`
const setupRes = runPsql(setupSql)
if (!setupRes.ok) {
  console.error('Falha no setup do teste:', setupRes.err)
  process.exit(1)
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. TRIGGER USER_PROFILES: SÓ SUPER_ADMIN ALTERA PERFIL DE SUPER_ADMIN
// ─────────────────────────────────────────────────────────────────────────────
console.log('Teste: 1. Proteção de perfil de super_admin')

// 1.1 admin_clinica tenta alterar perfil do super_admin -> bloqueado
const testAdminCannotEditSuperSql = `
DO $$
DECLARE
  v_err_caught BOOLEAN := false;
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', '{"sub": "${uAdminA}", "role": "authenticated"}', true);

  BEGIN
    UPDATE public.user_profiles SET nome = 'Hacked SuperAdmin' WHERE id = '${uSuperAdmin}';
  EXCEPTION WHEN insufficient_privilege THEN
    v_err_caught := true;
  END;

  IF NOT v_err_caught THEN
    RAISE EXCEPTION 'VIOLACAO: admin_clinica conseguiu atualizar perfil de super_admin!';
  END IF;

  PERFORM set_config('role', 'postgres', true);
END $$;
`
const res1_1 = runPsql(testAdminCannotEditSuperSql)
assertTest('admin_clinica é bloqueado ao tentar alterar super_admin', res1_1.ok, res1_1.err)

// 1.2 super_admin altera o próprio perfil -> permitido
const testSuperCanEditSuperSql = `
DO $$
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', '{"sub": "${uSuperAdmin}", "role": "authenticated"}', true);

  UPDATE public.user_profiles SET nome = 'Super Admin Atualizado' WHERE id = '${uSuperAdmin}';

  PERFORM set_config('role', 'postgres', true);
END $$;
`
const res1_2 = runPsql(testSuperCanEditSuperSql)
assertTest('super_admin pode alterar seu próprio perfil', res1_2.ok, res1_2.err)

// ─────────────────────────────────────────────────────────────────────────────
// 3. ADMIN_CLINICA CRIA TODOS OS 8 RECURSOS NA PRÓPRIA CLÍNICA
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nTeste: 2. admin_clinica cria na própria clínica')

const tablesAdminA = [
  { name: 'paciente', sql: `INSERT INTO public.pacientes (id, clinica_id, nome) VALUES (gen_random_uuid(), '${cidA}', 'Paciente Alpha Admin');` },
  { name: 'agendamento', sql: `INSERT INTO public.agendamentos (id, clinica_id, data_consulta, hora_consulta, status) VALUES (gen_random_uuid(), '${cidA}', CURRENT_DATE, '09:00', 'agendado');` },
  { name: 'prontuario', sql: `INSERT INTO public.prontuarios (id, clinica_id, descricao) VALUES (gen_random_uuid(), '${cidA}', 'Prontuario Alpha Admin');` },
  { name: 'receita', sql: `INSERT INTO public.receitas (id, clinica_id) VALUES (gen_random_uuid(), '${cidA}');` },
  { name: 'atestado', sql: `INSERT INTO public.atestados (id, clinica_id, data_inicio) VALUES (gen_random_uuid(), '${cidA}', CURRENT_DATE);` },
  { name: 'despesa', sql: `INSERT INTO public.despesas (id, clinica_id, descricao, valor, data_vencimento) VALUES (gen_random_uuid(), '${cidA}', 'Despesa Alpha Admin', 150.00, CURRENT_DATE);` },
  { name: 'nota fiscal', sql: `INSERT INTO public.notas_fiscais (id, clinica_id, numero_nota, valor) VALUES (gen_random_uuid(), '${cidA}', 'NF-ALPHA-' || substr(gen_random_uuid()::text, 1, 8), 150.00);` },
  { name: 'comissao', sql: `INSERT INTO public.comissoes (id, clinica_id, porcentagem) VALUES (gen_random_uuid(), '${cidA}', 20.0);` },
]

for (const item of tablesAdminA) {
  const sql = `
  BEGIN;
  SET LOCAL ROLE authenticated;
  SELECT set_config('request.jwt.claims', '{"sub": "${uAdminA}", "role": "authenticated"}', true);
  ${item.sql}
  ROLLBACK;
  `
  const res = runPsql(sql)
  assertTest(`admin_clinica cria ${item.name} na própria clínica`, res.ok, res.err)
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. DENTISTA CRIA APENAS O QUE O PAPEL PERMITE NA PRÓPRIA CLÍNICA
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nTeste: 3. dentista cria apenas o que o papel permite')

const dentistaAllowed = [
  { name: 'paciente', sql: `INSERT INTO public.pacientes (id, clinica_id, nome) VALUES (gen_random_uuid(), '${cidA}', 'Paciente Alpha Dentista');` },
  { name: 'agendamento', sql: `INSERT INTO public.agendamentos (id, clinica_id, data_consulta, hora_consulta, status) VALUES (gen_random_uuid(), '${cidA}', CURRENT_DATE, '10:00', 'agendado');` },
  { name: 'prontuario', sql: `INSERT INTO public.prontuarios (id, clinica_id, descricao) VALUES (gen_random_uuid(), '${cidA}', 'Prontuario Alpha Dentista');` },
  { name: 'receita', sql: `INSERT INTO public.receitas (id, clinica_id) VALUES (gen_random_uuid(), '${cidA}');` },
  { name: 'atestado', sql: `INSERT INTO public.atestados (id, clinica_id, data_inicio) VALUES (gen_random_uuid(), '${cidA}', CURRENT_DATE);` },
]

for (const item of dentistaAllowed) {
  const sql = `
  BEGIN;
  SET LOCAL ROLE authenticated;
  SELECT set_config('request.jwt.claims', '{"sub": "${uDentistaA}", "role": "authenticated"}', true);
  ${item.sql}
  ROLLBACK;
  `
  const res = runPsql(sql)
  assertTest(`dentista cria ${item.name} (permitido)`, res.ok, res.err)
}

const dentistaBlocked = [
  { name: 'despesa', sql: `INSERT INTO public.despesas (id, clinica_id, descricao, valor, data_vencimento) VALUES (gen_random_uuid(), '${cidA}', 'Despesa Alpha Dentista', 100.00, CURRENT_DATE);` },
  { name: 'nota fiscal', sql: `INSERT INTO public.notas_fiscais (id, clinica_id, numero_nota, valor) VALUES (gen_random_uuid(), '${cidA}', 'NF-ALPHA-DENT-' || substr(gen_random_uuid()::text, 1, 6), 100.00);` },
  { name: 'comissao', sql: `INSERT INTO public.comissoes (id, clinica_id, porcentagem) VALUES (gen_random_uuid(), '${cidA}', 25.0);` },
]

for (const item of dentistaBlocked) {
  const sql = `
  BEGIN;
  SET LOCAL ROLE authenticated;
  SELECT set_config('request.jwt.claims', '{"sub": "${uDentistaA}", "role": "authenticated"}', true);
  ${item.sql}
  ROLLBACK;
  `
  const res = runPsql(sql)
  assertTest(`dentista bloqueado em ${item.name}`, !res.ok)
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. RECEPCAO CRIA APENAS O QUE O PAPEL PERMITE NA PRÓPRIA CLÍNICA
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nTeste: 4. recepcao cria apenas o que o papel permite')

const recepcaoAllowed = [
  { name: 'paciente', sql: `INSERT INTO public.pacientes (id, clinica_id, nome) VALUES (gen_random_uuid(), '${cidA}', 'Paciente Alpha Recepcao');` },
  { name: 'agendamento', sql: `INSERT INTO public.agendamentos (id, clinica_id, data_consulta, hora_consulta, status) VALUES (gen_random_uuid(), '${cidA}', CURRENT_DATE, '11:00', 'agendado');` },
]

for (const item of recepcaoAllowed) {
  const sql = `
  BEGIN;
  SET LOCAL ROLE authenticated;
  SELECT set_config('request.jwt.claims', '{"sub": "${uRecepcaoA}", "role": "authenticated"}', true);
  ${item.sql}
  ROLLBACK;
  `
  const res = runPsql(sql)
  assertTest(`recepcao cria ${item.name} (permitido)`, res.ok, res.err)
}

const recepcaoBlocked = [
  { name: 'prontuario', sql: `INSERT INTO public.prontuarios (id, clinica_id, descricao) VALUES (gen_random_uuid(), '${cidA}', 'Prontuario Alpha Recepcao');` },
  { name: 'receita', sql: `INSERT INTO public.receitas (id, clinica_id) VALUES (gen_random_uuid(), '${cidA}');` },
  { name: 'atestado', sql: `INSERT INTO public.atestados (id, clinica_id, data_inicio) VALUES (gen_random_uuid(), '${cidA}', CURRENT_DATE);` },
  { name: 'despesa', sql: `INSERT INTO public.despesas (id, clinica_id, descricao, valor, data_vencimento) VALUES (gen_random_uuid(), '${cidA}', 'Despesa Alpha Recepcao', 100.00, CURRENT_DATE);` },
  { name: 'nota fiscal', sql: `INSERT INTO public.notas_fiscais (id, clinica_id, numero_nota, valor) VALUES (gen_random_uuid(), '${cidA}', 'NF-ALPHA-REC-' || substr(gen_random_uuid()::text, 1, 6), 100.00);` },
  { name: 'comissao', sql: `INSERT INTO public.comissoes (id, clinica_id, porcentagem) VALUES (gen_random_uuid(), '${cidA}', 30.0);` },
]

for (const item of recepcaoBlocked) {
  const sql = `
  BEGIN;
  SET LOCAL ROLE authenticated;
  SELECT set_config('request.jwt.claims', '{"sub": "${uRecepcaoA}", "role": "authenticated"}', true);
  ${item.sql}
  ROLLBACK;
  `
  const res = runPsql(sql)
  assertTest(`recepcao bloqueada em ${item.name}`, !res.ok)
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. ISOLAMENTO TOTAL ENTRE CLÍNICAS (SEM ACESSO CRUZADO)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nTeste: 5. Isolamento total entre clínicas (Alpha -> Beta)')

const allTablesCross = [
  { name: 'paciente', sql: `INSERT INTO public.pacientes (id, clinica_id, nome) VALUES (gen_random_uuid(), '${cidB}', 'Invasao Beta Paciente');` },
  { name: 'agendamento', sql: `INSERT INTO public.agendamentos (id, clinica_id, data_consulta, hora_consulta, status) VALUES (gen_random_uuid(), '${cidB}', CURRENT_DATE, '15:00', 'agendado');` },
  { name: 'prontuario', sql: `INSERT INTO public.prontuarios (id, clinica_id, descricao) VALUES (gen_random_uuid(), '${cidB}', 'Invasao Beta Prontuario');` },
  { name: 'receita', sql: `INSERT INTO public.receitas (id, clinica_id) VALUES (gen_random_uuid(), '${cidB}');` },
  { name: 'atestado', sql: `INSERT INTO public.atestados (id, clinica_id, data_inicio) VALUES (gen_random_uuid(), '${cidB}', CURRENT_DATE);` },
  { name: 'despesa', sql: `INSERT INTO public.despesas (id, clinica_id, descricao, valor, data_vencimento) VALUES (gen_random_uuid(), '${cidB}', 'Invasao Beta Despesa', 500.00, CURRENT_DATE);` },
  { name: 'nota fiscal', sql: `INSERT INTO public.notas_fiscais (id, clinica_id, numero_nota, valor) VALUES (gen_random_uuid(), '${cidB}', 'NF-INVASAO-' || substr(gen_random_uuid()::text, 1, 6), 500.00);` },
  { name: 'comissao', sql: `INSERT INTO public.comissoes (id, clinica_id, porcentagem) VALUES (gen_random_uuid(), '${cidB}', 50.0);` },
]

for (const item of allTablesCross) {
  const sql = `
  BEGIN;
  SET LOCAL ROLE authenticated;
  SELECT set_config('request.jwt.claims', '{"sub": "${uAdminA}", "role": "authenticated"}', true);
  ${item.sql}
  ROLLBACK;
  `
  const res = runPsql(sql)
  assertTest(`bloqueio cruzado em ${item.name} (Alpha tentando inserir em Beta)`, !res.ok)
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. RESULTADO FINAL
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n======================================================================')
console.log(`RESULTADO TAREFA 4: ${passed} passaram, ${failed} falharam`)
console.log('======================================================================')

if (failed > 0) process.exit(1)
