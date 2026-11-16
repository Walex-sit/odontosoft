/**
 * tests/integration/stripe_auditoria_correcoes.test.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Bateria de Testes de Integração Obrigatórios:
 * Correções da Auditoria Stripe e Alinhamento de Contratos (Migration 000008).
 *
 * Cenários Validados Diretamente no PostgreSQL Real:
 *  1. Checkout de Super Admin:
 *     - Bloqueio estrito de provisionar_novo_tenant para usuários com role super_admin.
 *     - Preservação de role='super_admin' e clinica_id=NULL.
 *  2. Customer ID Divergente:
 *     - Rejeição em stripe_apply_subscription_update (applied = false).
 *     - Rejeição em stripe_apply_invoice_payment_succeeded (applied = false).
 *     - Rejeição em stripe_apply_checkout_completed (applied = false).
 *     - Preservação do stripe_customer_id original no banco.
 *  3. Checkout com Assinatura Antiga em Clínica Inadimplente:
 *     - Bloqueio de substituição quando a clínica está inadimplente (applied = false).
 *     - Ausência de RAISE EXCEPTION não tratado da trigger 00007.
 *  4. Reativação Após Cancelamento:
 *     - Rejeição de assinatura anterior ao cancelamento.
 *     - Rejeição da mesma assinatura já cancelada.
 *     - Sucesso na reativação com nova assinatura criada comprovadamente após cancelamento.
 *  5. Concorrência e Idempotência de invoice.payment_succeeded:
 *     - 10 chamadas simultâneas da RPC executadas com integridade atômica.
 *     - Descarte de fatura atrasada com timestamp anterior ao último registrado.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

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

async function run() {
  console.log('======================================================================')
  console.log('TESTES REAIS NO POSTGRESQL: CORREÇÕES DA AUDITORIA STRIPE (000008)')
  console.log('======================================================================\n')

  // ──────────────────────────────────────────────────────────────────────────
  // TESTE 1: Checkout de Super Admin
  // ──────────────────────────────────────────────────────────────────────────
  console.log('>>> 1. Testando proteção contra provisionamento/rebaixamento de super_admin...')
  const superAdminId = randomUUID()
  const superAdminEmail = `superadmin_${superAdminId.slice(0, 8)}@odonto-test.com`

  // 1.1 Criar usuário em auth.users e user_profiles com role super_admin
  const { error: saAuthErr } = await supabase.auth.admin.createUser({
    id: superAdminId,
    email: superAdminEmail,
    email_confirm: true,
    user_metadata: { nome: 'Super Admin Teste Auditoria' },
  })
  assert('Super Admin criado em auth.users', !saAuthErr, saAuthErr?.message)

  const { error: saProfErr } = await supabase.from('user_profiles').upsert({
    id: superAdminId,
    nome: 'Super Admin Teste Auditoria',
    role: 'super_admin',
    clinica_id: null,
  })
  assert('Perfil super_admin criado com clinica_id=NULL', !saProfErr, saProfErr?.message)

  // 1.2 Tentativa de chamar provisionar_novo_tenant com o id do super_admin
  const { data: provSaRes, error: provSaErr } = await supabase.rpc('provisionar_novo_tenant', {
    p_user_id: superAdminId,
    p_nome_clinica: 'Tentativa Clínica SuperAdmin',
    p_plano: 'profissional',
    p_stripe_customer_id: `cus_sa_${randomUUID()}`,
    p_stripe_subscription_id: `sub_sa_${randomUUID()}`,
    p_subscription_created: '2026-01-01T00:00:00Z',
  })

  assert('RPC provisionar_novo_tenant bloqueou super_admin com erro', provSaErr !== null)
  assert('Mensagem de erro informa bloqueio de super_admin',
    provSaErr?.message?.includes('super_admin não pode ser provisionado como admin_clinica'),
    provSaErr?.message
  )

  // 1.3 Verifica que o perfil do Super Admin permaneceu absolutamente intocado
  const { data: checkSaProfile } = await supabase
    .from('user_profiles')
    .select('id, role, clinica_id')
    .eq('id', superAdminId)
    .single()

  assert('Super Admin manteve role=super_admin', checkSaProfile?.role === 'super_admin')
  assert('Super Admin manteve clinica_id=NULL', checkSaProfile?.clinica_id === null)

  // ──────────────────────────────────────────────────────────────────────────
  // TESTE 2: Divergência de Stripe Customer ID
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n>>> 2. Testando bloqueio contra divergência de Stripe Customer ID...')
  const clinicaId2 = randomUUID()
  const customerIdOriginal = `cus_original_${randomUUID()}`
  const customerIdDivergente = `cus_divergente_${randomUUID()}`
  const subId2 = `sub_teste_cust_${randomUUID()}`

  await supabase.from('clinicas').insert({
    id: clinicaId2,
    nome: 'Clínica Teste Customer ID',
    status_assinatura: 'ativo',
    ativo: true,
    stripe_customer_id: customerIdOriginal,
    stripe_subscription_id: subId2,
    stripe_subscription_created: '2026-01-01T00:00:00Z',
    stripe_last_event_at: '2026-01-01T00:00:00Z',
  })

  // 2.1 stripe_apply_subscription_update com customer_id divergente
  const { data: updateCustRes, error: updateCustErr } = await supabase.rpc('stripe_apply_subscription_update', {
    p_subscription_id: subId2,
    p_customer_id: customerIdDivergente,
    p_status: 'ativo',
    p_event_created: '2026-01-02T00:00:00Z',
    p_subscription_created: '2026-01-01T00:00:00Z',
  })

  assert('subscription_update executou sem exceção fatal', !updateCustErr, updateCustErr?.message)
  assert('subscription_update bloqueou divergência de Customer ID (applied = false)', updateCustRes?.[0]?.applied === false)
  assert('Motivo informa divergência de Stripe Customer ID',
    updateCustRes?.[0]?.motivo_bloqueio?.includes('Divergência de Stripe Customer ID'),
    updateCustRes?.[0]?.motivo_bloqueio
  )

  // 2.2 stripe_apply_invoice_payment_succeeded com customer_id divergente
  const { data: invoiceCustRes, error: invoiceCustErr } = await supabase.rpc('stripe_apply_invoice_payment_succeeded', {
    p_subscription_id: subId2,
    p_customer_id: customerIdDivergente,
    p_event_created: '2026-01-02T00:00:00Z',
    p_subscription_created: '2026-01-01T00:00:00Z',
  })

  assert('invoice_payment_succeeded executou sem exceção fatal', !invoiceCustErr, invoiceCustErr?.message)
  assert('invoice_payment_succeeded bloqueou divergência de Customer ID (applied = false)', invoiceCustRes?.[0]?.applied === false)
  assert('Motivo de fatura informa divergência de Customer ID',
    invoiceCustRes?.[0]?.motivo_bloqueio?.includes('Divergência de Stripe Customer ID'),
    invoiceCustRes?.[0]?.motivo_bloqueio
  )

  // 2.3 stripe_apply_checkout_completed com customer_id divergente
  const { data: checkoutCustRes, error: checkoutCustErr } = await supabase.rpc('stripe_apply_checkout_completed', {
    p_clinica_id: clinicaId2,
    p_customer_id: customerIdDivergente,
    p_subscription_id: subId2,
    p_plano: 'profissional',
    p_event_created: '2026-01-02T00:00:00Z',
    p_subscription_created: '2026-01-01T00:00:00Z',
  })

  assert('checkout_completed executou sem exceção fatal', !checkoutCustErr, checkoutCustErr?.message)
  assert('checkout_completed bloqueou divergência de Customer ID (applied = false)', checkoutCustRes?.[0]?.applied === false)
  assert('Motivo de checkout informa divergência de Customer ID',
    checkoutCustRes?.[0]?.motivo_bloqueio?.includes('Divergência de Stripe Customer ID'),
    checkoutCustRes?.[0]?.motivo_bloqueio
  )

  // 2.4 Verifica que o banco permaneceu com o Customer ID original
  const { data: checkClinica2 } = await supabase.from('clinicas').select('stripe_customer_id').eq('id', clinicaId2).single()
  assert('Customer ID original preservado intacto no banco', checkClinica2?.stripe_customer_id === customerIdOriginal)

  // ──────────────────────────────────────────────────────────────────────────
  // TESTE 3: Checkout com assinatura antiga em clínica inadimplente
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n>>> 3. Testando checkout com assinatura diferente em clínica inadimplente...')
  const clinicaId3 = randomUUID()
  const customerId3 = `cus_inad_${randomUUID()}`
  const subOriginal3 = `sub_inad_orig_${randomUUID()}`
  const subTentativa3 = `sub_inad_nova_${randomUUID()}`

  await supabase.from('clinicas').insert({
    id: clinicaId3,
    nome: 'Clínica Inadimplente Teste Checkout',
    status_assinatura: 'inadimplente',
    ativo: false,
    stripe_customer_id: customerId3,
    stripe_subscription_id: subOriginal3,
    stripe_subscription_created: '2026-01-01T00:00:00Z',
    stripe_last_event_at: '2026-01-01T00:00:00Z',
  })

  // Tentativa de aplicar checkout com sub diferente em clínica inadimplente
  const { data: checkInadRes, error: checkInadErr } = await supabase.rpc('stripe_apply_checkout_completed', {
    p_clinica_id: clinicaId3,
    p_customer_id: customerId3,
    p_subscription_id: subTentativa3,
    p_plano: 'profissional',
    p_event_created: '2026-01-05T00:00:00Z',
    p_subscription_created: '2026-01-05T00:00:00Z',
  })

  assert('checkout_completed não lançou exceção SQL fatal (trigger 00007 preservada)', !checkInadErr, checkInadErr?.message)
  assert('checkout_completed bloqueou substituição em clínica inadimplente (applied = false)', checkInadRes?.[0]?.applied === false)
  assert('Motivo informa clínica em estado não cancelado',
    checkInadRes?.[0]?.motivo_bloqueio?.includes('Clínica possui assinatura vinculada em estado não cancelado'),
    checkInadRes?.[0]?.motivo_bloqueio
  )

  const { data: checkClinica3 } = await supabase.from('clinicas').select('*').eq('id', clinicaId3).single()
  assert('Clínica permaneceu com status inadimplente', checkClinica3?.status_assinatura === 'inadimplente')
  assert('Assinatura original preservada sem substituição', checkClinica3?.stripe_subscription_id === subOriginal3)

  // ──────────────────────────────────────────────────────────────────────────
  // TESTE 4: Reativação Após Cancelamento
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n>>> 4. Testando reativação legítima após cancelamento...')
  const clinicaId4 = randomUUID()
  const customerId4 = `cus_canc_${randomUUID()}`
  const subCancelada4 = `sub_antiga_canc_${randomUUID()}`
  const subNova4 = `sub_nova_legitima_${randomUUID()}`
  const cancelamentoEm4 = '2026-06-01T12:00:00Z'
  const subCreatedPost4 = '2026-06-02T10:00:00Z'

  await supabase.from('clinicas').insert({
    id: clinicaId4,
    nome: 'Clínica Cancelada Teste Reativação',
    status_assinatura: 'cancelado',
    ativo: false,
    cancelamento_em: cancelamentoEm4,
    stripe_customer_id: customerId4,
    stripe_subscription_id: subCancelada4,
    stripe_subscription_created: '2026-01-01T00:00:00Z',
    stripe_last_event_at: cancelamentoEm4,
  })

  // 4.1 Tentativa com a mesma assinatura cancelada
  const { data: reatSameRes } = await supabase.rpc('stripe_apply_checkout_completed', {
    p_clinica_id: clinicaId4,
    p_customer_id: customerId4,
    p_subscription_id: subCancelada4,
    p_plano: 'profissional',
    p_event_created: '2026-06-02T12:00:00Z',
    p_subscription_created: subCreatedPost4,
  })
  assert('Tentativa de reativar com a mesma assinatura cancelada é bloqueada (applied = false)', reatSameRes?.[0]?.applied === false)
  assert('Motivo informa assinatura já cancelada',
    reatSameRes?.[0]?.motivo_bloqueio?.includes('já foi cancelada no sistema'),
    reatSameRes?.[0]?.motivo_bloqueio
  )

  // 4.2 Tentativa com assinatura criada ANTES do cancelamento
  const { data: reatPreRes } = await supabase.rpc('stripe_apply_checkout_completed', {
    p_clinica_id: clinicaId4,
    p_customer_id: customerId4,
    p_subscription_id: subNova4,
    p_plano: 'profissional',
    p_event_created: '2026-06-02T12:00:00Z',
    p_subscription_created: '2026-05-15T00:00:00Z', // Anterior ao cancelamento
  })
  assert('Tentativa com assinatura anterior ao cancelamento é bloqueada (applied = false)', reatPreRes?.[0]?.applied === false)
  assert('Motivo aponta assinatura criada antes ou durante cancelamento',
    reatPreRes?.[0]?.motivo_bloqueio?.includes('cancelamento'),
    reatPreRes?.[0]?.motivo_bloqueio
  )

  // 4.3 Reativação legítima: nova assinatura comprovadamente posterior ao cancelamento
  const { data: reatOkRes, error: reatOkErr } = await supabase.rpc('stripe_apply_checkout_completed', {
    p_clinica_id: clinicaId4,
    p_customer_id: customerId4,
    p_subscription_id: subNova4,
    p_plano: 'enterprise',
    p_event_created: '2026-06-02T12:00:00Z',
    p_subscription_created: subCreatedPost4,
  })
  assert('Reativação legítima executou sem erros', !reatOkErr, reatOkErr?.message)
  assert('Reativação legítima foi aplicada com sucesso (applied = true)', reatOkRes?.[0]?.applied === true)

  const { data: checkClinica4 } = await supabase.from('clinicas').select('*').eq('id', clinicaId4).single()
  assert('Clínica reativada para ativo=true e status=ativo', checkClinica4?.ativo === true && checkClinica4?.status_assinatura === 'ativo')
  assert('cancelamento_em limpo para NULL', checkClinica4?.cancelamento_em === null)
  assert('Assinatura atualizada para a nova sub', checkClinica4?.stripe_subscription_id === subNova4)
  assert('Plano atualizado para enterprise', checkClinica4?.plano === 'enterprise')

  // ──────────────────────────────────────────────────────────────────────────
  // TESTE 5: Concorrência e Idempotência de invoice.payment_succeeded
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n>>> 5. Testando concorrência e idempotência de invoice.payment_succeeded...')
  const clinicaId5 = randomUUID()
  const customerId5 = `cus_conc_inv_${randomUUID()}`
  const subId5 = `sub_conc_inv_${randomUUID()}`

  await supabase.from('clinicas').insert({
    id: clinicaId5,
    nome: 'Clínica Concorrência Fatura',
    status_assinatura: 'ativo',
    ativo: true,
    stripe_customer_id: customerId5,
    stripe_subscription_id: subId5,
    stripe_subscription_created: '2026-01-01T00:00:00Z',
    stripe_last_event_at: '2026-01-01T00:00:00Z',
  })

  // 5.1 Disparar 10 chamadas simultâneas de invoice_payment_succeeded para a mesma assinatura
  console.log('  Disparando 10 workers simultâneos de invoice_payment_succeeded...')
  const invoiceWorkers = Array.from({ length: 10 }, (_, i) =>
    supabase.rpc('stripe_apply_invoice_payment_succeeded', {
      p_subscription_id: subId5,
      p_customer_id: customerId5,
      p_event_created: `2026-01-05T00:00:0${i}Z`,
      p_subscription_created: '2026-01-01T00:00:00Z',
    })
  )

  const concInvoiceResults = await Promise.all(invoiceWorkers)
  const allNoSqlError = concInvoiceResults.every(r => !r.error)
  assert('Todas as 10 chamadas concorrentes executaram sem erro SQL', allNoSqlError)

  const appliedCount = concInvoiceResults.filter(r => r.data?.[0]?.applied === true).length
  const blockedCount = concInvoiceResults.filter(r => r.data?.[0]?.applied === false).length
  assert('Workers foram tratados atomicamente (applied + blocked = 10)', appliedCount + blockedCount === 10)

  // 5.2 Descarte de evento atrasado (timestamp anterior ao último processado)
  const { data: delayedInvRes } = await supabase.rpc('stripe_apply_invoice_payment_succeeded', {
    p_subscription_id: subId5,
    p_customer_id: customerId5,
    p_event_created: '2026-01-02T00:00:00Z', // Anterior ao evento mais recente
    p_subscription_created: '2026-01-01T00:00:00Z',
  })

  assert('Fatura atrasada é descartada com applied = false', delayedInvRes?.[0]?.applied === false)
  assert('Motivo informa evento antigo descartado',
    delayedInvRes?.[0]?.motivo_bloqueio?.includes('Evento antigo descartado'),
    delayedInvRes?.[0]?.motivo_bloqueio
  )

  // Cleanup do super_admin de teste
  await supabase.auth.admin.deleteUser(superAdminId)

  console.log('\n======================================================================')
  console.log(`TOTAL DE TESTES EXECUTADOS: ${passed + failed} | PASSARAM: ${passed} | FALHARAM: ${failed}`)
  console.log('======================================================================')

  if (failed > 0) {
    process.exit(1)
  }
}

run().catch((err) => {
  console.error('Erro fatal nos testes:', err)
  process.exit(1)
})
