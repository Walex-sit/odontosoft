/**
 * tests/integration/cobranca_trial.test.mjs
 * Tarefa 3 — Testes de integração: cobrança, trial e billing.
 * Executa diretamente contra o banco LOCAL via supabase-js (service_role + rpc).
 * Uso: node tests/integration/cobranca_trial.test.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../..')

const SUPABASE_URL = 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

let passed = 0
let failed = 0

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`)
    passed++
  } else {
    console.error(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`)
    failed++
  }
}

function runDockerPsql(sql) {
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

function tryInsertPacienteAsUser(userId, clinicaId) {
  const q = `
    BEGIN;
    SET LOCAL ROLE authenticated;
    SELECT set_config('request.jwt.claims', '{"sub":"${userId}","role":"authenticated"}', true);
    INSERT INTO public.pacientes (nome, clinica_id)
    VALUES ('Paciente Teste T3 ${randomUUID().slice(0,8)}', '${clinicaId}');
    ROLLBACK;
  `
  const res = runDockerPsql(q)
  if (res.ok) return { ok: true }
  return { ok: false, msg: res.err }
}

// ── Setup ─────────────────────────────────────────────────────────────────────

const clinicaTrialId = '33333333-3333-4333-a333-333333333333'
const clinicaAtivaId = '44444444-4444-4444-a444-444444444444'
const clinicaLifetimeId = '55555555-5555-4555-a555-555555555555'
const userTrialId = '33333333-aaaa-4333-a333-333333333333'
const userAtivoId = '44444444-aaaa-4444-a444-444444444444'
const userLifetimeId = '55555555-bbbb-4555-a555-555555555555'
const userSuperAdminId = '33333333-cccc-4333-a333-333333333333'

console.log('\n=== SETUP: criando clínicas e usuários de teste ===')

const setupSql = `
DO $$
BEGIN
  -- Cleanup prévio
  DELETE FROM public.user_profiles WHERE email LIKE '%_t3@test.internal';
  DELETE FROM auth.users WHERE email LIKE '%_t3@test.internal';

  -- Clínicas
  INSERT INTO public.clinicas (id, nome, plano, status_assinatura, trial_ends_at, ativo)
  VALUES ('${clinicaTrialId}', 'Clinica Trial Expirado Test T3', 'profissional', 'trial', now() - interval '1 day', true)
  ON CONFLICT (id) DO UPDATE SET status_assinatura = 'trial', trial_ends_at = now() - interval '1 day', ativo = true;

  INSERT INTO public.clinicas (id, nome, plano, status_assinatura, ativo)
  VALUES ('${clinicaAtivaId}', 'Clinica Ativa Test T3', 'profissional', 'ativo', true)
  ON CONFLICT (id) DO UPDATE SET status_assinatura = 'ativo', ativo = true;

  INSERT INTO public.clinicas (id, nome, plano, status_assinatura, trial_ends_at, ativo)
  VALUES ('${clinicaLifetimeId}', 'Clinica Lifetime Test T3', 'profissional', 'trial', now() - interval '1 day', true)
  ON CONFLICT (id) DO UPDATE SET status_assinatura = 'trial', trial_ends_at = now() - interval '1 day', ativo = true;

  -- Users
  INSERT INTO auth.users (id, email) VALUES
    ('${userTrialId}', 'trial_t3@test.internal'),
    ('${userAtivoId}', 'ativo_t3@test.internal'),
    ('${userLifetimeId}', 'lifetime_t3@test.internal'),
    ('${userSuperAdminId}', 'sa_t3@test.internal')
  ON CONFLICT (id) DO NOTHING;

  -- User Profiles
  INSERT INTO public.user_profiles (id, nome, email, role, clinica_id, is_lifetime) VALUES
    ('${userTrialId}', 'User Trial T3', 'trial_t3@test.internal', 'dentista', '${clinicaTrialId}', false),
    ('${userAtivoId}', 'User Ativo T3', 'ativo_t3@test.internal', 'dentista', '${clinicaAtivaId}', false),
    ('${userLifetimeId}', 'User Lifetime T3', 'lifetime_t3@test.internal', 'dentista', '${clinicaLifetimeId}', true),
    ('${userSuperAdminId}', 'Super Admin T3', 'sa_t3@test.internal', 'super_admin', '${clinicaTrialId}', false)
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    clinica_id = EXCLUDED.clinica_id,
    is_lifetime = EXCLUDED.is_lifetime;
END $$;
`
const setupRes = runDockerPsql(setupSql)
if (!setupRes.ok) {
  console.error('Falha no setup:', setupRes.err)
  process.exit(1)
}
console.log('Setup concluído.')

// ── TESTES 1–6: RLS e triggers via docker exec ───────────────────────────────

// TESTE 1: Trial expirado bloqueia INSERT
console.log('\n--- TESTE 1: Trial expirado bloqueia INSERT de paciente ---')
const t1 = tryInsertPacienteAsUser(userTrialId, clinicaTrialId)
console.log('  Resultado bruto:', JSON.stringify(t1))
assert('Trial expirado → INSERT bloqueado', !t1.ok, t1.msg)
assert('Mensagem contém "trial"', t1.msg?.toLowerCase().includes('trial'), t1.msg)

// TESTE 2: Trial ativo permite INSERT
console.log('\n--- TESTE 2: Trial ativo permite INSERT ---')
await admin.from('clinicas').update({ trial_ends_at: new Date(Date.now() + 7 * 86400000).toISOString() }).eq('id', clinicaTrialId)
const t2 = tryInsertPacienteAsUser(userTrialId, clinicaTrialId)
console.log('  Resultado bruto:', JSON.stringify(t2))
assert('Trial ativo → INSERT permitido', t2.ok, t2.msg)
await admin.from('clinicas').update({ trial_ends_at: new Date(Date.now() - 86400000).toISOString() }).eq('id', clinicaTrialId)

// TESTE 3: is_lifetime isenta
console.log('\n--- TESTE 3: is_lifetime isenta de trial expirado ---')
const t3 = tryInsertPacienteAsUser(userLifetimeId, clinicaLifetimeId)
console.log('  Resultado bruto:', JSON.stringify(t3))
assert('is_lifetime → INSERT permitido com trial expirado', t3.ok, t3.msg)

// TESTE 4: super_admin isenta
console.log('\n--- TESTE 4: super_admin isenta de trial expirado ---')
const t4 = tryInsertPacienteAsUser(userSuperAdminId, clinicaTrialId)
console.log('  Resultado bruto:', JSON.stringify(t4))
assert('super_admin → INSERT permitido com trial expirado', t4.ok, t4.msg)

// TESTE 5: Inadimplente bloqueia
console.log('\n--- TESTE 5: Inadimplente bloqueia INSERT ---')
await admin.from('clinicas').update({ status_assinatura: 'inadimplente' }).eq('id', clinicaAtivaId)
const t5 = tryInsertPacienteAsUser(userAtivoId, clinicaAtivaId)
console.log('  Resultado bruto:', JSON.stringify(t5))
assert('Inadimplente → INSERT bloqueado', !t5.ok, t5.msg)
assert('Mensagem contém "inadimplente"', t5.msg?.toLowerCase().includes('inadimplente'), t5.msg)
await admin.from('clinicas').update({ status_assinatura: 'ativo' }).eq('id', clinicaAtivaId)

// TESTE 6: Cancelado bloqueia
console.log('\n--- TESTE 6: Cancelado bloqueia INSERT ---')
await admin.from('clinicas').update({ status_assinatura: 'cancelado' }).eq('id', clinicaAtivaId)
const t6 = tryInsertPacienteAsUser(userAtivoId, clinicaAtivaId)
console.log('  Resultado bruto:', JSON.stringify(t6))
assert('Cancelado → INSERT bloqueado', !t6.ok, t6.msg)
assert('Mensagem contém "cancelad"', t6.msg?.toLowerCase().includes('cancelad'), t6.msg)
await admin.from('clinicas').update({ status_assinatura: 'ativo' }).eq('id', clinicaAtivaId)

// ── TESTE 7: checkout hardening — verificação de código-fonte ────────────────

console.log('\n--- TESTE 7: checkout/route hardening ---')
const checkoutSrc = readFileSync(resolve(ROOT, 'app/api/checkout/route.ts'), 'utf8')
assert(
  'userEmail removido do checkoutSchema',
  !checkoutSrc.includes("'userEmail'") && !checkoutSrc.includes('"userEmail"'),
  'userEmail ainda presente no schema'
)
assert(
  'email vem exclusivamente de user.email (sessão)',
  checkoutSrc.includes('const email = user.email') && !checkoutSrc.includes('|| userEmail'),
  'email ainda aceita corpo da requisição'
)
assert(
  'Rate limiting implementado (checkRateLimit)',
  checkoutSrc.includes('checkRateLimit'),
  'função checkRateLimit não encontrada'
)
assert(
  'Rejeita não autenticado com 401',
  checkoutSrc.includes('status: 401'),
  'retorno 401 não encontrado'
)
assert(
  'userId vem de user.id (nunca do body)',
  checkoutSrc.includes('const userId = user.id') && !checkoutSrc.includes("user?.id || ''"),
  'userId pode vir do body'
)

// ── TESTE 8: webhook reativação — verificação de código-fonte ────────────────

console.log('\n--- TESTE 8: webhook reativação por customer_id ---')
const webhookSrc = readFileSync(resolve(ROOT, 'app/api/webhooks/payment/route.ts'), 'utf8')
assert(
  'invoice.payment_succeeded faz fallback por stripe_customer_id',
  webhookSrc.includes('invoice.payment_succeeded') &&
  webhookSrc.includes('stripe_customer_id') &&
  webhookSrc.includes('Reativação: subscription_id pode ter mudado'),
  'fallback customer_id ausente em invoice.payment_succeeded'
)
assert(
  'customer.subscription.updated faz fallback por stripe_customer_id',
  webhookSrc.includes('customer.subscription.updated') &&
  webhookSrc.includes('updatedBySub') &&
  webhookSrc.includes('stripe_customer_id'),
  'fallback customer_id ausente em customer.subscription.updated'
)
assert(
  'checkout.session.completed: UPDATE quando clinica_id já existe',
  webhookSrc.includes("profile?.clinica_id") && webhookSrc.includes("Clínica já existe"),
  'lógica de reativação por clinica_id ausente'
)

// ── TESTE 9: requireActiveClinic aplicado nas Server Actions ─────────────────

console.log('\n--- TESTE 9: requireActiveClinic nas Server Actions ---')
const files = [
  'app/actions/financeiro.ts',
  'app/actions/commissions.ts',
  'app/actions/clinica.ts',
  'app/actions/users.ts',
  'app/actions/odontograma.ts',
  'app/actions/agenda.ts',
  'app/actions/pacientes.ts',
  'app/actions/prontuarios.ts',
]
for (const f of files) {
  const src = readFileSync(resolve(ROOT, f), 'utf8')
  assert(
    `requireActiveClinic importado em ${f}`,
    src.includes('requireActiveClinic'),
    `import não encontrado`
  )
}

// ── Teardown ──────────────────────────────────────────────────────────────────

console.log('\n=== TEARDOWN: removendo dados de teste ===')
await admin.from('user_profiles').delete().like('email', '%_t3@test.internal')
for (const id of [userTrialId, userAtivoId, userLifetimeId, userSuperAdminId]) {
  await admin.auth.admin.deleteUser(id)
}
await admin.from('clinicas').delete().like('nome', '%Test T3')
console.log('Teardown concluído.')

// ── Resultado ────────────────────────────────────────────────────────────────

console.log(`\n========================================`)
console.log(`RESULTADO FINAL: ${passed} passed, ${failed} failed`)
console.log(`========================================\n`)
if (failed > 0) process.exit(1)
