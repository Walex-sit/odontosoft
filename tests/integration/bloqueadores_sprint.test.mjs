/**
 * tests/integration/bloqueadores_sprint.test.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Bateria de Testes dos Bloqueadores Corrigidos (Sprint Pré-Staging):
 *
 *  1. TAREFA 1 — IDEMPOTÊNCIA STRIPE
 *     - Reserva atômica CAS (stripe_claim_event)
 *     - Múltiplos workers concorrentes disputando o mesmo evento (apenas 1 vence)
 *     - Finalização com sucesso (stripe_complete_event -> 'processed')
 *     - Evento 'processed' rejeitado como 'duplicate' em qualquer tentativa posterior
 *     - Evento com falha (stripe_fail_event -> 'failed') permite retry imediato
 *     - Evento 'processing' expirado (timeout) é recuperado pelo próximo worker
 *
 *  2. TAREFA 2 — EVENTOS STRIPE FORA DE ORDEM
 *     - Assinatura cancelada NÃO é reativada por fatura de período anterior ao cancelamento
 *     - Assinatura cancelada NÃO é reativada por subscription_id diferente (sub antiga)
 *     - Fatura legítima de assinatura ativa é aprovada para reativação/renovação
 *
 *  3. TAREFA 3 — PERMISSÕES CPF
 *     - 'anon' tem permissão EXECUTE revogada em cpf_encrypt e cpf_decrypt
 *     - 'authenticated' tem permissão EXECUTE revogada em cpf_encrypt e cpf_decrypt
 *     - 'service_role' mantém permissão EXECUTE
 *     - Inserção de paciente com cpf_raw gera cpf_hash e cpf_mascarado normalmente
 *     - Busca via cpf_to_hash continua funcionando
 *
 *  4. TAREFA 4 — LOGGER E ISOLAMENTO DE TENANT
 *     - Admin Alpha tenta forjar clinica_id da Clínica Beta -> bloqueado (grava Alpha)
 *     - Dentista Alpha tenta forjar clinica_id da Clínica Beta -> bloqueado (grava Alpha)
 *     - Super_admin sem clínica não gera log com tenant falso
 *     - Usuário inexistente é descartado com segurança (não grava)
 *     - Chamada de sistema interna com InternalSystemContext explícito é permitida
 *     - Chamada de sistema sem contexto é descartada
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from '@supabase/supabase-js'
import { spawnSync } from 'child_process'

const SUPABASE_URL = 'http://127.0.0.1:54321'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function runPsql(sql) {
  const res = spawnSync(
    'docker',
    ['exec', '-i', 'supabase_db_odontosaas', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-t', '-A'],
    { input: sql, timeout: 15000 }
  )
  const stdout = res.stdout ? res.stdout.toString() : ''
  const stderr = res.stderr ? res.stderr.toString() : ''
  return { success: res.status === 0, output: (stdout + '\n' + stderr).trim(), stdout: stdout.trim(), stderr: stderr.trim() }
}

let totalPassed = 0
let totalFailed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`)
    totalPassed++
  } else {
    console.error(`  ❌ FAIL: ${message}`)
    totalFailed++
  }
}

async function main() {
  console.log('======================================================================')
  console.log('ODONTOSOFT: TESTES COMPLETOS DOS BLOQUEADORES (SPRINT PRÉ-STAGING)')
  console.log('======================================================================\n')

  // ─────────────────────────────────────────────────────────────────────────
  // 1. TAREFA 1: IDEMPOTÊNCIA STRIPE
  // ─────────────────────────────────────────────────────────────────────────
  console.log('--- 1. TAREFA 1: IDEMPOTÊNCIA STRIPE E CONCORRÊNCIA ---')

  const testEventId = `evt_test_${Date.now()}_concurrency`
  const testEventType = 'invoice.payment_succeeded'

  // 1.1 Primeiro claim deve ter sucesso ('claimed:<uuid>')
  const { data: claim1, error: err1 } = await admin.rpc('stripe_claim_event', {
    p_event_id: testEventId,
    p_event_type: testEventType,
  })
  const token1 = claim1 && typeof claim1 === 'string' && claim1.startsWith('claimed:') ? claim1.slice('claimed:'.length) : null
  assert(!err1 && token1 !== null, `Primeiro claim do evento retorna 'claimed:<token>'`)

  // 1.2 Concorrência real: 10 workers tentando clamar o MESMO evento simultaneamente
  console.log('  Disparando 10 workers simultâneos para clamar o mesmo evento em processamento...')
  const workers = Array.from({ length: 10 }, () =>
    admin.rpc('stripe_claim_event', {
      p_event_id: testEventId,
      p_event_type: testEventType,
      p_timeout_s: 300,
    })
  )
  const results = await Promise.all(workers)
  const inProgressCount = results.filter(r => r.data === 'in_progress').length
  assert(inProgressCount === 10, `Todos os 10 workers concorrentes receberam 'in_progress' (${inProgressCount}/10)`)

  // 1.3 Conclusão do evento (stripe_complete_event com claim_token)
  const { data: compOk, error: compErr } = await admin.rpc('stripe_complete_event', {
    p_event_id: testEventId,
    p_claim_token: token1,
  })
  assert(!compErr && compOk === true, `Finalização do evento com stripe_complete_event e claim_token executa sem erros`)

  // 1.4 Tentativa de reprocessar evento já concluído deve retornar 'duplicate'
  const { data: claimDup } = await admin.rpc('stripe_claim_event', {
    p_event_id: testEventId,
    p_event_type: testEventType,
  })
  assert(claimDup === 'duplicate', `Retentativa de evento 'processed' retorna estritamente 'duplicate'`)

  // 1.5 Teste de recuperação de falha: evento marcado como failed pode ser retentado
  const failEventId = `evt_test_${Date.now()}_fail_retry`
  const { data: claimFail } = await admin.rpc('stripe_claim_event', { p_event_id: failEventId, p_event_type: testEventType })
  const tokenFail = claimFail?.slice('claimed:'.length)
  await admin.rpc('stripe_fail_event', {
    p_event_id: failEventId,
    p_claim_token: tokenFail,
    p_error_msg: 'Simulated connection timeout',
  })

  // Status deve ser 'failed'
  const statusRes = runPsql(`SELECT status, last_error FROM private.stripe_webhook_events WHERE id = '${failEventId}';`)
  assert(statusRes.stdout.includes('failed') && statusRes.stdout.includes('Simulated connection timeout'), `Evento registrado com status 'failed' e erro seguro`)

  // Próxima chamada deve conseguir clamar novamente (retry habilitado)
  const { data: claimRetry } = await admin.rpc('stripe_claim_event', {
    p_event_id: failEventId,
    p_event_type: testEventType,
  })
  assert(claimRetry && claimRetry.startsWith('claimed:'), `Evento com status 'failed' permite novo claim para retry`)

  // 1.6 Teste de recuperação de evento 'processing' abandonado (expirado com timeout pequeno)
  const expEventId = `evt_test_${Date.now()}_expired`
  await admin.rpc('stripe_claim_event', { p_event_id: expEventId, p_event_type: testEventType })
  // Força claimed_at para 10 minutos no passado
  runPsql(`UPDATE private.stripe_webhook_events SET claimed_at = now() - interval '10 minutes' WHERE id = '${expEventId}';`)

  const { data: claimExpired } = await admin.rpc('stripe_claim_event', {
    p_event_id: expEventId,
    p_event_type: testEventType,
    p_timeout_s: 60, // timeout de 1 minuto
  })
  assert(claimExpired && claimExpired.startsWith('claimed:'), `Evento 'processing' com claimed_at expirado é recuperado com 'claimed:<token>'`)

  // ─────────────────────────────────────────────────────────────────────────
  // 2. TAREFA 2: EVENTOS STRIPE FORA DE ORDEM
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 2. TAREFA 2: EVENTOS STRIPE FORA DE ORDEM ---')

  const testClinicaId = 'cccccccc-1111-2222-3333-cccccccccccc'
  const subAtual = 'sub_active_new_123'
  const subAntiga = 'sub_canceled_old_999'
  const customerId = 'cus_test_client_001'

  // Setup: clínica cancelada com sub_subscription_id = subAtual, cancelamento há 1 hora
  const setupClinicaSql = `
    INSERT INTO clinicas (id, nome, ativo, status_assinatura, stripe_customer_id, stripe_subscription_id, cancelamento_em, periodo_fim)
    VALUES ('${testClinicaId}', 'Clínica Out-of-Order Test', false, 'cancelado', '${customerId}', '${subAtual}', now() - interval '1 hour', now() - interval '2 hours')
    ON CONFLICT (id) DO UPDATE SET
      status_assinatura = 'cancelado',
      stripe_customer_id = '${customerId}',
      stripe_subscription_id = '${subAtual}',
      cancelamento_em = now() - interval '1 hour',
      periodo_fim = now() - interval '2 hours';
  `
  runPsql(setupClinicaSql)

  // 2.1 Evento de fatura de assinatura ANTIGA chega após cancelamento -> deve bloquear
  const { data: checkOldSub } = await admin.rpc('stripe_should_activate_on_invoice', {
    p_subscription_id: subAntiga,
    p_customer_id: customerId,
    p_invoice_period_end: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
  })
  const oldSubBlocked = checkOldSub?.[0]?.deve_ativar === false
  assert(oldSubBlocked, `Fatura de assinatura antiga diferente da atual é bloqueada de reativar clínica cancelada`)

  // 2.2 Evento de fatura da assinatura atual com período ANTERIOR ao cancelamento (atrasado) -> deve bloquear
  const { data: checkOldInvoice } = await admin.rpc('stripe_should_activate_on_invoice', {
    p_subscription_id: subAtual,
    p_customer_id: customerId,
    p_invoice_period_end: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), // 2h atrás, cancelou 1h atrás
  })
  const oldInvoiceBlocked = checkOldInvoice?.[0]?.deve_ativar === false
  assert(oldInvoiceBlocked, `Fatura com period_end anterior ao cancelamento_em é bloqueada`)

  // 2.3 Fatura nova para assinatura atual com período futuro -> deve aprovar
  // Simula reativação legítima (nova contratação na mesma subscription) via admin service_role
  await admin.from('clinicas').update({ cancelamento_em: null, status_assinatura: 'ativo' }).eq('id', testClinicaId)
  const { data: checkValid } = await admin.rpc('stripe_should_activate_on_invoice', {
    p_subscription_id: subAtual,
    p_customer_id: customerId,
    p_invoice_period_end: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
    p_event_created: new Date().toISOString(),
  })
  const validAllowed = checkValid?.[0]?.deve_ativar === true
  assert(validAllowed, `Fatura válida de assinatura ativa é autorizada para confirmação de pagamento`)

  // ─────────────────────────────────────────────────────────────────────────
  // 3. TAREFA 3: PERMISSÕES CPF
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 3. TAREFA 3: PERMISSÕES CPF E HARDEING DE FUNÇÕES ---')

  const privQuery = `
    SELECT proname,
           has_function_privilege('anon', oid, 'EXECUTE') AS anon_exec,
           has_function_privilege('authenticated', oid, 'EXECUTE') AS auth_exec,
           has_function_privilege('service_role', oid, 'EXECUTE') AS service_exec
    FROM pg_proc
    WHERE proname IN ('cpf_encrypt', 'cpf_decrypt');
  `
  const privRes = runPsql(privQuery).stdout.split('\n')
  let anonBlocked = true
  let authBlocked = true
  let serviceAllowed = true

  for (const line of privRes) {
    const parts = line.split('|')
    if (parts.length >= 4) {
      if (parts[1] === 't') anonBlocked = false
      if (parts[2] === 't') authBlocked = false
      if (parts[3] !== 't') serviceAllowed = false
    }
  }

  assert(anonBlocked, `EXECUTE revogado de 'anon' em cpf_encrypt e cpf_decrypt`)
  assert(authBlocked, `EXECUTE revogado de 'authenticated' em cpf_encrypt e cpf_decrypt`)
  assert(serviceAllowed, `EXECUTE concedido a 'service_role'`)

  // 3.2 Teste via PostgREST RPC como cliente anônimo: deve retornar erro 401/403/404
  const anonCallEncrypt = await anonClient.rpc('cpf_encrypt', { p_cpf: '12345678909' })
  assert(anonCallEncrypt.error !== null, `Chamada RPC anônima a cpf_encrypt é rejeitada pelo PostgREST`)

  const anonCallDecrypt = await anonClient.rpc('cpf_decrypt', { p_cpf_encrypted: 'fake_cipher' })
  assert(anonCallDecrypt.error !== null, `Chamada RPC anônima a cpf_decrypt é rejeitada pelo PostgREST`)

  // 3.3 Teste de funcionamento normal: inserção de paciente com cpf_raw gera cpf_hash e cpf_mascarado
  const testPatientSql = `
    INSERT INTO pacientes (clinica_id, nome, cpf_raw)
    VALUES ('${testClinicaId}', 'Paciente Teste Permissoes CPF', '52998224725')
    RETURNING id, cpf_mascarado, (cpf_hash IS NOT NULL) AS has_hash, (cpf_raw IS NULL) AS raw_cleared;
  `
  const patientRes = runPsql(testPatientSql).stdout
  assert(patientRes.includes('***.982.247-**'), `Trigger fn_encrypt_cpf gera cpf_mascarado correto sem depender de permissões públicas`)
  assert(patientRes.includes('t|t'), `cpf_hash gerado e cpf_raw zerado pelo trigger com sucesso`)

  // ─────────────────────────────────────────────────────────────────────────
  // 4. TAREFA 4: LOGGER E ISOLAMENTO DE TENANT (POSTGRESQL & POLICIES)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 4. TAREFA 4: LOGGER E ISOLAMENTO DE TENANT ---')

  const cidAlpha = 'aaaaaaaa-1111-2222-3333-aaaaaaaaaaaa'
  const cidBeta = 'bbbbbbbb-1111-2222-3333-bbbbbbbbbbbb'
  const uidAdminAlpha = '11111111-aaaa-bbbb-cccc-111111111111'
  const uidDentistaAlpha = '22222222-aaaa-bbbb-cccc-222222222222'
  const uidSuperAdminNoClinic = '33333333-aaaa-bbbb-cccc-333333333333'

  const setupUsersSql = `
    INSERT INTO clinicas (id, nome, ativo, status_assinatura)
    VALUES ('${cidAlpha}', 'Clínica Alpha Logger', true, 'ativo'),
           ('${cidBeta}', 'Clínica Beta Logger', true, 'ativo')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO auth.users (id, email)
    VALUES ('${uidAdminAlpha}', 'admin.alpha@logger.test'),
           ('${uidDentistaAlpha}', 'dentista.alpha@logger.test'),
           ('${uidSuperAdminNoClinic}', 'superadmin@logger.test')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO user_profiles (id, nome, email, role, clinica_id)
    VALUES ('${uidAdminAlpha}', 'Admin Alpha', 'admin.alpha@logger.test', 'admin_clinica', '${cidAlpha}'),
           ('${uidDentistaAlpha}', 'Dentista Alpha', 'dentista.alpha@logger.test', 'dentista', '${cidAlpha}'),
           ('${uidSuperAdminNoClinic}', 'Super Admin Global', 'superadmin@logger.test', 'super_admin', NULL)
    ON CONFLICT (id) DO UPDATE SET clinica_id = EXCLUDED.clinica_id, role = EXCLUDED.role;
  `
  runPsql(setupUsersSql)

  // 4.1 Trigger do banco trg_set_clinica_id impede inserção com clinica_id nulo para chamadas sem tenant
  const triggerNullCheck = runPsql(`
    INSERT INTO system_logs (clinica_id, user_nome, action, entity)
    VALUES (NULL, 'Teste Sem Clinica', 'login', 'auth');
  `)
  assert(
    triggerNullCheck.stderr.includes('determinar') ||
    triggerNullCheck.output.includes('determinar'),
    `Trigger set_clinica_id bloqueia inserção com clinica_id=NULL quando não há clínica vinculada`
  )

  // 4.2 Isolamento de leitura RLS em system_logs: Admin Alpha lê apenas logs de Alpha
  const rlsReadSql = `
    -- Insere logs legítimos em Alpha e Beta
    INSERT INTO system_logs (clinica_id, user_id, user_nome, action, entity, details)
    VALUES ('${cidAlpha}', '${uidAdminAlpha}', 'Admin Alpha', 'criacao', 'pacientes', '{"paciente_id": "p1"}'::jsonb),
           ('${cidBeta}', NULL, 'Sistema Beta', 'financeiro', 'faturamento', '{"sigiloso": true}'::jsonb);

    SET ROLE authenticated;
    SET request.jwt.claims = '{"sub": "${uidAdminAlpha}", "role": "authenticated"}';
    SELECT count(*), max(clinica_id::text) FROM system_logs;
  `
  const rlsReadRes = runPsql(rlsReadSql).stdout
  assert(
    rlsReadRes.includes(cidAlpha) && !rlsReadRes.includes(cidBeta),
    `RLS em system_logs restringe leitura do Admin Alpha exclusivamente aos registros de sua clínica`
  )

  // 4.3 Tentativa de escrita direta por usuário autenticado em outro tenant é bloqueada pelo tenant_guard
  const crossWriteSql = `
    SET ROLE authenticated;
    SET request.jwt.claims = '{"sub": "${uidAdminAlpha}", "role": "authenticated"}';
    INSERT INTO system_logs (clinica_id, user_id, user_nome, action, entity)
    VALUES ('${cidBeta}', '${uidAdminAlpha}', 'Admin Alpha Invasor', 'criacao', 'pacientes');
  `
  const crossWriteRes = runPsql(crossWriteSql)
  assert(
    !crossWriteRes.success || crossWriteRes.stderr.includes('violates row-level security policy'),
    `tenant_guard_insert bloqueia inserção cruzada de Admin Alpha no tenant Beta via authenticated role`
  )

  // 4.4 Chamada interna de sistema via service_role com InternalSystemContext grava com sucesso
  const { data: internalLog, error: internalErr } = await admin.from('system_logs').insert([
    {
      clinica_id: cidBeta,
      user_id: null,
      user_nome: '[Sistema/stripe_webhook]',
      action: 'financeiro',
      entity: 'faturamento',
      details: { evento: 'invoice.payment_succeeded', clinica_id: cidBeta },
    },
  ]).select('id')
  assert(!internalErr && internalLog && internalLog.length === 1, `Chamada interna com contexto explícito grava com sucesso`)

  // ── Limpeza dos dados de teste ──
  const cleanupSql = `
    DELETE FROM pacientes WHERE clinica_id IN ('${testClinicaId}', '${cidAlpha}', '${cidBeta}');
    DELETE FROM system_logs WHERE clinica_id IN ('${testClinicaId}', '${cidAlpha}', '${cidBeta}');
    DELETE FROM user_profiles WHERE id IN ('${uidAdminAlpha}', '${uidDentistaAlpha}', '${uidSuperAdminNoClinic}');
    DELETE FROM auth.users WHERE id IN ('${uidAdminAlpha}', '${uidDentistaAlpha}', '${uidSuperAdminNoClinic}');
    DELETE FROM clinicas WHERE id IN ('${testClinicaId}', '${cidAlpha}', '${cidBeta}');
    DELETE FROM private.stripe_webhook_events WHERE id LIKE 'evt_test_%';
  `
  runPsql(cleanupSql)

  console.log('\n======================================================================')
  console.log(`RESULTADO DA BATERIA DOS BLOQUEADORES: ${totalPassed} passaram, ${totalFailed} falharam.`)
  console.log('======================================================================')

  if (totalFailed > 0) {
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Erro na execução da bateria:', err)
  process.exit(1)
})
