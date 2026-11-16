/**
 * tests/integration/regressoes_seguranca_privacidade.test.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Testes de Regressão Obrigatórios no PostgreSQL Local (Docker).
 *
 * Baterias Testadas:
 *  A. Checkout Transacional:
 *     1. Checkout de clínica cancelada sem p_subscription_created bloqueado.
 *     2. Checkout com assinatura criada antes do cancelamento bloqueado.
 *     3. Checkout com assinatura criada depois do cancelamento autorizado.
 *     4. Outra assinatura ativa não substituída indevidamente.
 *
 *  B. Assinaturas e Concorrência:
 *     5. Evento atrasado de A após reativação com B bloqueado por stripe_apply_invoice_payment_succeeded.
 *     6. Falha de pagamento da assinatura A não afeta assinatura ativa B.
 *     7. Evento subscription.deleted antigo não cancela assinatura mais recente.
 *     8. Proteção contra reversão de cancelamento e regressão em timestamps iguais.
 *
 *  C. Provisionamento de Tenants:
 *     9. Usuário inexistente rejeitado com erro transacional.
 *     10. Usuário já vinculado a clínica ativa não recebe tenant duplicado.
 *     11. Usuário já vinculado a clínica cancelada não é reativado por evento antigo.
 *     12. Duas chamadas concorrentes não criam tenants duplicados (SELECT FOR UPDATE serializa).
 *     13. Falha intermediária (plano inválido) provoca rollback integral.
 *     14. Nova assinatura legítima reativa clínica pós-cancelamento com comprovação temporal.
 *
 *  D. Idempotência e Claim Tokens:
 *     15. Claim falso ou desconhecido rejeitado por stripe_complete_event.
 *     16. Claim nulo rejeitado por stripe_complete_event e stripe_fail_event.
 *     17. stripe_fail_event rejeita claim inválido (string não-UUID).
 *     18. Worker sem token válido não pode completar evento de outro worker.
 *
 *  E. Auditoria LGPD e CFO:
 *     - Logs de prontuário e evolução sem conteúdo clínico sensível.
 *     - Preservação do prontuário integral na tabela public.prontuarios.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { execSync } from 'child_process'

const SUPABASE_URL = 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
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

async function run() {
  console.log('======================================================================')
  console.log('AUDITORIA FINAL: REGRESSÕES DE SEGURANÇA, CONCORRÊNCIA E STRIPE')
  console.log('======================================================================\n')

  // ══════════════════════════════════════════════════════════════════════════
  // SEÇÃO D. IDEMPOTÊNCIA E CLAIM TOKENS (ITENS 15, 16, 17, 18)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('>>> SEÇÃO D: Idempotência, Claim Tokens e Isolamento de Workers...')
  const eventIdWorker = `evt_reg_worker_${randomUUID()}`

  // 15. Claim falso ou desconhecido deve ser rejeitado
  const { data: compFakeUnknown } = await supabase.rpc('stripe_complete_event', {
    p_event_id: `evt_inexistente_${randomUUID()}`,
    p_claim_token: randomUUID(),
  })
  assert('15. stripe_complete_event rejeita claim falso/desconhecido (retorna false)', compFakeUnknown === false)

  // 16. Claim nulo deve ser rejeitado
  const { data: compNull } = await supabase.rpc('stripe_complete_event', {
    p_event_id: eventIdWorker,
    p_claim_token: null,
  })
  assert('16.1 stripe_complete_event rejeita claim nulo com segurança (retorna false)', compNull === false)

  const { data: failNull } = await supabase.rpc('stripe_fail_event', {
    p_event_id: eventIdWorker,
    p_claim_token: null,
    p_error_msg: 'teste erro nulo',
  })
  assert('16.2 stripe_fail_event rejeita claim nulo com segurança (retorna false)', failNull === false)

  // 17. stripe_fail_event deve rejeitar claim inválido (string não-UUID)
  const { data: failInvalidStr } = await supabase.rpc('stripe_fail_event', {
    p_event_id: eventIdWorker,
    p_claim_token: 'string-invalida-nao-uuid',
    p_error_msg: 'teste token inválido',
  })
  assert('17. stripe_fail_event rejeita token não-UUID sem crash (retorna false)', failInvalidStr === false)

  // 18. Worker sem token válido não pode completar evento de outro worker
  const { data: claimWorker1 } = await supabase.rpc('stripe_claim_event', {
    p_event_id: eventIdWorker,
    p_event_type: 'invoice.payment_succeeded',
    p_timeout_s: 300,
  })
  const tokenWorker1 = claimWorker1?.startsWith('claimed:') ? claimWorker1.slice('claimed:'.length) : null
  assert('18.1 Worker 1 reserva evento com sucesso', Boolean(tokenWorker1))

  const tokenWorker2Invalido = randomUUID()
  const { data: compWorker2 } = await supabase.rpc('stripe_complete_event', {
    p_event_id: eventIdWorker,
    p_claim_token: tokenWorker2Invalido,
  })
  assert('18.2 Worker 2 sem token válido é rejeitado (retorna false)', compWorker2 === false)

  const { data: compWorker1 } = await supabase.rpc('stripe_complete_event', {
    p_event_id: eventIdWorker,
    p_claim_token: tokenWorker1,
  })
  assert('18.3 Worker 1 com token legítimo conclui evento com sucesso (retorna true)', compWorker1 === true)


  // ══════════════════════════════════════════════════════════════════════════
  // SEÇÃO A. CHECKOUT TRANSACIONAL (ITENS 1, 2, 3, 4)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n>>> SEÇÃO A: Checkout Transacional e Validação Temporal...')
  const clinicaChkId = randomUUID()
  const customerChkId = `cus_chk_${randomUUID().slice(0, 8)}`
  const subCanceladaId = `sub_chk_canc_${randomUUID().slice(0, 8)}`
  const subAntigaChkId = `sub_chk_ant_${randomUUID().slice(0, 8)}`
  const subNovaChkId = `sub_chk_nova_${randomUUID().slice(0, 8)}`

  const tAgora = new Date()
  const tCancel = new Date(tAgora.getTime() - 3600 * 1000) // cancelado há 1h
  const tSubAntiga = new Date(tCancel.getTime() - 1800 * 1000) // criada há 1h30 (antes do cancelamento)
  const tSubNova = new Date(tAgora.getTime() - 600 * 1000) // criada há 10m (após cancelamento)

  const insClinicaChk = await supabase.from('clinicas').insert({
    id: clinicaChkId,
    nome: 'Clínica Checkout Testes',
    status_assinatura: 'cancelado',
    stripe_subscription_id: subCanceladaId,
    stripe_customer_id: customerChkId,
    cancelamento_em: tCancel.toISOString(),
    ativo: false,
  })
  if (insClinicaChk.error) {
    throw new Error(`Falha no setup de clínica checkout: ${insClinicaChk.error.message}`)
  }

  // 1. Checkout de clínica cancelada sem p_subscription_created deve ser bloqueado
  const { data: resChkSemCreated } = await supabase.rpc('stripe_apply_checkout_completed', {
    p_clinica_id: clinicaChkId,
    p_customer_id: customerChkId,
    p_subscription_id: subNovaChkId,
    p_plano: 'profissional',
    p_event_created: tAgora.toISOString(),
    p_subscription_created: null,
  })
  assert(
    '1. Checkout de clínica cancelada sem p_subscription_created é BLOQUEADO',
    resChkSemCreated && resChkSemCreated[0]?.applied === false,
    resChkSemCreated?.[0]?.motivo_bloqueio
  )

  // 2. Checkout com assinatura criada antes do cancelamento deve ser bloqueado
  const { data: resChkCriadaAntes } = await supabase.rpc('stripe_apply_checkout_completed', {
    p_clinica_id: clinicaChkId,
    p_customer_id: customerChkId,
    p_subscription_id: subAntigaChkId,
    p_plano: 'profissional',
    p_event_created: tAgora.toISOString(),
    p_subscription_created: tSubAntiga.toISOString(),
  })
  assert(
    '2. Checkout com assinatura criada antes do cancelamento é BLOQUEADO',
    resChkCriadaAntes && resChkCriadaAntes[0]?.applied === false,
    resChkCriadaAntes?.[0]?.motivo_bloqueio
  )

  // 3. Checkout com assinatura criada depois do cancelamento deve ser autorizado
  const { data: resChkCriadaDepois } = await supabase.rpc('stripe_apply_checkout_completed', {
    p_clinica_id: clinicaChkId,
    p_customer_id: customerChkId,
    p_subscription_id: subNovaChkId,
    p_plano: 'premium',
    p_event_created: tAgora.toISOString(),
    p_subscription_created: tSubNova.toISOString(),
  })
  assert(
    '3. Checkout com assinatura criada após cancelamento é AUTORIZADO',
    resChkCriadaDepois && resChkCriadaDepois[0]?.applied === true
  )

  // Verifica que a clínica foi ativada com sucesso e cancelamento limpo
  const { data: chkAtivada } = await supabase
    .from('clinicas')
    .select('status_assinatura, ativo, cancelamento_em, stripe_subscription_id, plano')
    .eq('id', clinicaChkId)
    .single()
  assert(
    '3.1 Clínica ativada no banco: status=ativo, ativo=true, cancelamento_em=null, plano=enterprise',
    chkAtivada?.status_assinatura === 'ativo' &&
      chkAtivada?.ativo === true &&
      chkAtivada?.cancelamento_em === null &&
      chkAtivada?.stripe_subscription_id === subNovaChkId &&
      chkAtivada?.plano === 'enterprise'
  )

  // 4. Outra assinatura ativa não pode ser substituída indevidamente
  const subInvasoraId = `sub_chk_invasora_${randomUUID().slice(0, 8)}`
  const { data: resChkSubstituicaoAtiva } = await supabase.rpc('stripe_apply_checkout_completed', {
    p_clinica_id: clinicaChkId,
    p_customer_id: customerChkId,
    p_subscription_id: subInvasoraId,
    p_plano: 'profissional',
    p_event_created: new Date().toISOString(),
    p_subscription_created: new Date().toISOString(),
  })
  assert(
    '4. Outra assinatura tentando substituir clínica ativa é BLOQUEADA',
    resChkSubstituicaoAtiva && resChkSubstituicaoAtiva[0]?.applied === false,
    resChkSubstituicaoAtiva?.[0]?.motivo_bloqueio
  )

  const { data: chkPreservada } = await supabase
    .from('clinicas')
    .select('stripe_subscription_id')
    .eq('id', clinicaChkId)
    .single()
  assert('4.1 Assinatura ativa original foi estritamente preservada', chkPreservada?.stripe_subscription_id === subNovaChkId)


  // ══════════════════════════════════════════════════════════════════════════
  // SEÇÃO B. ASSINATURAS E FATURAS CONCORRENTES (ITENS 5, 6, 7, 8)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n>>> SEÇÃO B: Assinaturas e Faturas Concorrentes...')
  const clinicaSubId = randomUUID()
  const customerSubId = `cus_sub_${randomUUID().slice(0, 8)}`
  const subA_Id = `sub_A_${randomUUID().slice(0, 8)}`
  const subB_Id = `sub_B_${randomUUID().slice(0, 8)}`

  const tSubA_Created = new Date(tAgora.getTime() - 7200 * 1000)
  const tSubB_Created = new Date(tAgora.getTime() - 600 * 1000)
  const tEventRecente = new Date(tAgora.getTime() - 300 * 1000)

  // Cria clínica já ativa com Sub B
  const insClinicaSub = await supabase.from('clinicas').insert({
    id: clinicaSubId,
    nome: 'Clínica Concorrência Assinaturas',
    status_assinatura: 'ativo',
    stripe_subscription_id: subB_Id,
    stripe_customer_id: customerSubId,
    ativo: true,
    stripe_last_event_at: tEventRecente.toISOString(),
    stripe_subscription_created: tSubB_Created.toISOString(),
  })
  if (insClinicaSub.error) {
    throw new Error(`Falha no setup clinicas sub: ${insClinicaSub.error.message}`)
  }

  // 5. Evento atrasado da assinatura A após reativação com B deve ser bloqueado por stripe_apply_invoice_payment_succeeded
  const { data: resInvSubA } = await supabase.rpc('stripe_apply_invoice_payment_succeeded', {
    p_subscription_id: subA_Id,
    p_customer_id: customerSubId,
    p_event_created: tAgora.toISOString(),
    p_subscription_created: tSubA_Created.toISOString(),
  })
  assert(
    '5. Evento atrasado de fatura de Sub A em clínica ativa com Sub B é BLOQUEADO',
    resInvSubA && resInvSubA[0]?.applied === false,
    resInvSubA?.[0]?.motivo_bloqueio
  )

  // 6. Falha de pagamento da assinatura A não pode tornar B inadimplente
  const { data: resFailSubA } = await supabase.rpc('stripe_apply_invoice_payment_failed', {
    p_subscription_id: subA_Id,
    p_event_created: tAgora.toISOString(),
  })
  assert(
    '6. Falha de pagamento de Sub A é rejeitada (não encontra vínculo com a clínica)',
    resFailSubA && resFailSubA[0]?.applied === false
  )

  const { data: clinicaB_NaoInadimplente } = await supabase
    .from('clinicas')
    .select('status_assinatura, stripe_subscription_id')
    .eq('id', clinicaSubId)
    .single()
  assert(
    '6.1 Assinatura B permanece ATIVA após falha de pagamento da assinatura A',
    clinicaB_NaoInadimplente?.status_assinatura === 'ativo' && clinicaB_NaoInadimplente?.stripe_subscription_id === subB_Id
  )

  // 7. Evento subscription.deleted antigo não pode cancelar uma assinatura mais recente
  const { data: resDelSubA } = await supabase.rpc('stripe_apply_subscription_deleted', {
    p_subscription_id: subA_Id,
    p_event_created: tAgora.toISOString(),
  })
  assert(
    '7. Cancelamento antigo (subscription.deleted) de Sub A é BLOQUEADO',
    resDelSubA && resDelSubA[0]?.applied === false
  )

  const { data: clinicaB_NaoCancelada } = await supabase
    .from('clinicas')
    .select('status_assinatura, ativo')
    .eq('id', clinicaSubId)
    .single()
  assert(
    '7.1 Clínica permanece ATIVA após evento de cancelamento da assinatura A',
    clinicaB_NaoCancelada?.status_assinatura === 'ativo' && clinicaB_NaoCancelada?.ativo === true
  )

  // 8. Eventos concorrentes: proteção contra reversão indevida e timestamps iguais
  const { data: resEventoAntigoSubB } = await supabase.rpc('stripe_apply_subscription_update', {
    p_subscription_id: subB_Id,
    p_customer_id: customerSubId,
    p_status: 'cancelado',
    p_event_created: new Date(tEventRecente.getTime() - 60 * 1000).toISOString(), // timestamp anterior ao último
    p_subscription_created: tSubB_Created.toISOString(),
  })
  assert(
    '8. Evento fora de ordem anterior ao último processado é DESCARTADO',
    resEventoAntigoSubB && resEventoAntigoSubB[0]?.applied === false,
    resEventoAntigoSubB?.[0]?.motivo_bloqueio
  )


  // ══════════════════════════════════════════════════════════════════════════
  // SEÇÃO C. PROVISIONAMENTO DE TENANTS E CONCORRÊNCIA (ITENS 9, 10, 11, 12, 13, 14)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n>>> SEÇÃO C: Provisionamento de Tenants e Integridade Multi-Tenant...')

  // 9. Usuário inexistente deve ser rejeitado com erro transacional
  const fakeUserId = randomUUID()
  const { error: errUserInexistente } = await supabase.rpc('provisionar_novo_tenant', {
    p_user_id: fakeUserId,
    p_nome_clinica: 'Clínica Inexistente',
  })
  assert(
    '9. Usuário inexistente em auth.users é REJEITADO (foreign_key_violation)',
    errUserInexistente !== null && errUserInexistente.code === '23503'
  )

  // Cria usuário legítimo 1 em auth.users
  const user1Id = randomUUID()
  const setupUser1 = runPsql(`
    INSERT INTO auth.users (id, email)
    VALUES ('${user1Id}', 'user1_${user1Id.slice(0, 6)}@test.internal')
    ON CONFLICT (id) DO NOTHING;
  `)
  if (!setupUser1.ok) throw new Error(`Falha no setup user 1: ${setupUser1.err}`)

  // Provisiona tenant inicial para User 1
  const subUser1 = `sub_prov_${randomUUID().slice(0, 8)}`
  const { data: cidUser1, error: errProv1 } = await supabase.rpc('provisionar_novo_tenant', {
    p_user_id: user1Id,
    p_nome_clinica: 'Clínica Odonto Alpha',
    p_plano: 'profissional',
    p_stripe_subscription_id: subUser1,
    p_subscription_created: new Date().toISOString(),
  })
  assert('Setup 10: Provisionamento inicial de User 1 realizado com sucesso', cidUser1 && !errProv1)

  // 10. Usuário já vinculado a uma clínica ativa não pode receber tenant duplicado
  const { data: cidUser1Tentativa2 } = await supabase.rpc('provisionar_novo_tenant', {
    p_user_id: user1Id,
    p_nome_clinica: 'Tentativa Duplicação Alpha',
    p_plano: 'enterprise',
  })
  assert(
    '10. Usuário com clínica ativa recebe o tenant existente (não duplica clínica)',
    cidUser1Tentativa2 === cidUser1
  )

  const checkUser1Count = runPsql(`
    SELECT count(*) FROM public.clinicas WHERE id = '${cidUser1}';
  `)
  assert('10.1 Exatamente 1 clínica existe no banco para o ID', checkUser1Count.out.includes('1'))

  // 11. Usuário já vinculado a uma clínica cancelada não pode ser reativado por evento antigo
  // Cancela a clínica de User 1
  const tCancUser1 = new Date(Date.now() - 3600 * 1000)
  await supabase
    .from('clinicas')
    .update({
      status_assinatura: 'cancelado',
      ativo: false,
      cancelamento_em: tCancUser1.toISOString(),
    })
    .eq('id', cidUser1)

  // Chamada de provisionamento com evento antigo/sem comprovação temporal posterior
  const { data: cidUser1TentativaCancelada } = await supabase.rpc('provisionar_novo_tenant', {
    p_user_id: user1Id,
    p_nome_clinica: 'Reativação Antiga Alpha',
    p_stripe_subscription_id: subUser1, // mesma sub cancelada
    p_subscription_created: new Date(tCancUser1.getTime() - 1000).toISOString(), // criada antes
    p_event_created: tCancUser1.toISOString(),
  })
  assert('11. Idempotência retorna ID existente para usuário com clínica cancelada', cidUser1TentativaCancelada === cidUser1)

  const { data: clinica1AindaCancelada } = await supabase
    .from('clinicas')
    .select('status_assinatura, ativo, cancelamento_em')
    .eq('id', cidUser1)
    .single()
  assert(
    '11.1 Clínica cancelada NÃO é reativada por evento antigo: permanece status=cancelado, ativo=false, cancelamento_em preservado',
    clinica1AindaCancelada?.status_assinatura === 'cancelado' &&
      clinica1AindaCancelada?.ativo === false &&
      clinica1AindaCancelada?.cancelamento_em !== null
  )

  // 14. Nova assinatura legítima segue o fluxo autorizado e reativa
  const subUser1Nova = `sub_prov_nova_${randomUUID().slice(0, 8)}`
  const tSubUser1Nova = new Date(Date.now() - 300 * 1000) // criada há 5min (> tCancUser1)
  const { data: cidUser1Reativada } = await supabase.rpc('provisionar_novo_tenant', {
    p_user_id: user1Id,
    p_nome_clinica: 'Clínica Odonto Alpha Reativada',
    p_plano: 'enterprise',
    p_stripe_subscription_id: subUser1Nova,
    p_subscription_created: tSubUser1Nova.toISOString(),
    p_event_created: new Date().toISOString(),
  })
  assert('14. Nova assinatura comprovada pós-cancelamento retorna ID da clínica', cidUser1Reativada === cidUser1)

  const { data: clinica1Reativada } = await supabase
    .from('clinicas')
    .select('status_assinatura, ativo, cancelamento_em, stripe_subscription_id, plano')
    .eq('id', cidUser1)
    .single()
  assert(
    '14.1 Clínica reativada com sucesso: status=ativo, ativo=true, cancelamento_em=null, sub atualizada',
    clinica1Reativada?.status_assinatura === 'ativo' &&
      clinica1Reativada?.ativo === true &&
      clinica1Reativada?.cancelamento_em === null &&
      clinica1Reativada?.stripe_subscription_id === subUser1Nova &&
      clinica1Reativada?.plano === 'enterprise'
  )

  // 12. Duas chamadas concorrentes não podem criar dois tenants para o mesmo usuário
  const userConcorrenteId = randomUUID()
  const setupUserConc = runPsql(`
    INSERT INTO auth.users (id, email)
    VALUES ('${userConcorrenteId}', 'conc_${userConcorrenteId.slice(0, 6)}@test.internal')
    ON CONFLICT (id) DO NOTHING;
  `)
  if (!setupUserConc.ok) throw new Error(`Falha no setup user conc: ${setupUserConc.err}`)

  // Dispara 2 requisições estritamente simultâneas via conexões HTTP independentes
  const [resConc1, resConc2] = await Promise.all([
    supabase.rpc('provisionar_novo_tenant', {
      p_user_id: userConcorrenteId,
      p_nome_clinica: 'Clínica Concorrente Worker 1',
      p_plano: 'profissional',
    }),
    supabase.rpc('provisionar_novo_tenant', {
      p_user_id: userConcorrenteId,
      p_nome_clinica: 'Clínica Concorrente Worker 2',
      p_plano: 'profissional',
    }),
  ])

  assert('12.1 Chamada concorrente 1 executada com sucesso', resConc1.data && !resConc1.error)
  assert('12.2 Chamada concorrente 2 executada com sucesso', resConc2.data && !resConc2.error)
  assert(
    '12.3 Ambas as execuções concorrentes retornam EXATAMENTE o mesmo clinica_id',
    resConc1.data === resConc2.data
  )

  const checkUserConcCount = runPsql(`
    SELECT count(*) FROM public.user_profiles WHERE id = '${userConcorrenteId}' AND clinica_id IS NOT NULL;
  `)
  assert('12.4 Perfil do usuário possui exatamente 1 vínculo de clínica', checkUserConcCount.out.includes('1'))

  // 13. Falha intermediária no provisionamento deve provocar rollback integral
  const userRollbackId = randomUUID()
  const setupUserRb = runPsql(`
    INSERT INTO auth.users (id, email)
    VALUES ('${userRollbackId}', 'rb_${userRollbackId.slice(0, 6)}@test.internal')
    ON CONFLICT (id) DO NOTHING;
  `)
  if (!setupUserRb.ok) throw new Error(`Falha no setup user rb: ${setupUserRb.err}`)

  // Tentativa com plano inválido
  const { error: errPlanoInvalido } = await supabase.rpc('provisionar_novo_tenant', {
    p_user_id: userRollbackId,
    p_nome_clinica: 'Clínica Inválida',
    p_plano: 'plano_inexistente_hacker',
  })
  assert(
    '13.1 Provisionamento com plano inválido é rejeitado (invalid_parameter_value)',
    errPlanoInvalido !== null && errPlanoInvalido.code === '22023'
  )

  const checkRbClinica = runPsql(`
    SELECT count(*) FROM public.clinicas WHERE nome = 'Clínica Inválida';
  `)
  assert('13.2 Nenhuma clínica inserida no banco (rollback atômico garantido)', checkRbClinica.out.includes('0'))

  const { data: profileRb } = await supabase
    .from('user_profiles')
    .select('clinica_id')
    .eq('id', userRollbackId)
    .single()
  assert('13.3 Perfil do usuário permaneceu sem vínculo de clínica (clinica_id = null)', profileRb?.clinica_id === null)


  // ══════════════════════════════════════════════════════════════════════════
  // SEÇÃO E. LOGS DE PRONTUÁRIO SEM CONTEÚDO CLÍNICO (LGPD / CFO)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n>>> SEÇÃO E: Logs de prontuário sem conteúdo clínico (LGPD)...')

  const dentistaId = randomUUID()
  const pacienteId = randomUUID()
  const prontuarioId = randomUUID()
  const clinicaAtivaId = randomUUID()

  const setupAuditSql = `
    DO $$
    BEGIN
      INSERT INTO public.clinicas (id, nome, plano, status_assinatura, ativo)
      VALUES ('${clinicaAtivaId}', 'Clínica LGPD Prontuários', 'profissional', 'ativo', true);

      INSERT INTO auth.users (id, email)
      VALUES ('${dentistaId}', 'dentista_audit_${dentistaId.slice(0, 6)}@test.internal')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.user_profiles (id, nome, email, role, clinica_id)
      VALUES ('${dentistaId}', 'Dra. Audit', 'dentista_audit_${dentistaId.slice(0, 6)}@test.internal', 'dentista', '${clinicaAtivaId}')
      ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, clinica_id = EXCLUDED.clinica_id;

      INSERT INTO public.pacientes (id, clinica_id, nome, telefone)
      VALUES ('${pacienteId}', '${clinicaAtivaId}', 'Paciente Teste LGPD', '11999998888');
    END $$;
  `
  const setupAuditRes = runPsql(setupAuditSql)
  if (!setupAuditRes.ok) throw new Error(`Falha no setup audit: ${setupAuditRes.err}`)

  const insertProntuarioSql = `
    BEGIN;
    SET LOCAL ROLE authenticated;
    SELECT set_config('request.jwt.claims', '{"sub":"${dentistaId}","role":"authenticated"}', true);

    INSERT INTO public.prontuarios (
      id,
      clinica_id,
      paciente_id,
      dentista_id,
      descricao,
      tratamento,
      tipo_registro,
      status,
      finalizado
    ) VALUES (
      '${prontuarioId}',
      '${clinicaAtivaId}',
      '${pacienteId}',
      '${dentistaId}',
      'SENSIVEL_CLINICO: Paciente apresenta abscesso agudo e queixa de dor intensa no elemento 47.',
      'SENSIVEL_CLINICO: Tratamento endodontico com medicacao intracanal.',
      'registro_clinico',
      'registrada',
      true
    );

    COMMIT;
  `
  const insRes = runPsql(insertProntuarioSql)
  assert('Prontuário inserido com sucesso na tabela original', insRes.ok, insRes.err)

  // Consulta o log gravado em private.audit_logs pelo trigger
  const checkLogSql = `
    SELECT json_build_object(
      'acao', acao,
      'tabela', tabela,
      'registro_id', registro_id,
      'dados_novos', dados_novos
    ) AS log_row
    FROM private.audit_logs
    WHERE tabela = 'prontuarios'
      AND registro_id = '${prontuarioId}'
    ORDER BY data_hora DESC
    LIMIT 1;
  `
  const logRes = runPsql(checkLogSql)
  assert('Log de auditoria gerado pelo trigger de prontuários', logRes.ok, logRes.err)

  const logStr = logRes.out
  assert(
    'Log de prontuário NÃO contém "descricao" com texto clínico sensível',
    !logStr.includes('abscesso agudo') && !logStr.includes('SENSIVEL_CLINICO')
  )
  assert(
    'Log de prontuário NÃO contém "tratamento" com texto clínico sensível',
    !logStr.includes('Tratamento endodontico') && !logStr.includes('medicacao intracanal')
  )
  assert(
    'Log de prontuário contém metadados de rastreabilidade (id, status, tipo_registro, finalizado)',
    logStr.includes('registro_clinico') && logStr.includes('registrada') && logStr.includes(prontuarioId)
  )

  // Armazenamento original no public.prontuarios preserva o histórico clínico íntegro (CFO 198/2019)
  const { data: prontuarioOriginal } = await supabase
    .from('prontuarios')
    .select('descricao, tratamento, status, finalizado')
    .eq('id', prontuarioId)
    .single()

  assert(
    'Armazenamento original do prontuário preserva integralmente a descrição clínica',
    prontuarioOriginal?.descricao?.includes('abscesso agudo') === true
  )
  assert(
    'Armazenamento original do prontuário preserva integralmente o tratamento clínico',
    prontuarioOriginal?.tratamento?.includes('Tratamento endodontico') === true
  )

  // Teardown de limpeza
  const teardownSql = `
    DO $$
    BEGIN
      DELETE FROM private.audit_logs WHERE clinica_id IN ('${clinicaChkId}', '${clinicaSubId}', '${cidUser1}', '${clinicaAtivaId}');
      DELETE FROM public.clinicas WHERE id IN ('${clinicaChkId}', '${clinicaSubId}', '${cidUser1}', '${clinicaAtivaId}');
      DELETE FROM auth.users WHERE id IN ('${dentistaId}', '${user1Id}', '${userConcorrenteId}', '${userRollbackId}');
    END $$;
  `
  runPsql(teardownSql)

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n======================================================================')
  console.log(`TOTAL DE TESTES DE REGRESSÃO: ${passed + failed} | PASSARAM: ${passed} | FALHARAM: ${failed}`)
  console.log('======================================================================\n')

  if (failed > 0) process.exit(1)
}

run().catch((err) => {
  console.error('Erro na execução:', err)
  process.exit(1)
})
