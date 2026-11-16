/**
 * tests/integration/stripe_substituicao_protecao.test.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Bateria de Testes de Regressão Obrigatórios — ETAPA 1:
 * Proteção Contra Substituição Indevida de Assinaturas Stripe.
 *
 * Executa DIRETAMENTE no PostgreSQL real da instância local (sem mocks).
 *
 * Testes Obrigatórios Cobertos:
 *  1. Assinatura A ativa não é substituída por B.
 *  2. Assinatura A inadimplente não é substituída por B sem autorização.
 *  3. Assinatura A cancelada não é substituída por B sem comprovação temporal.
 *  4. Assinatura B criada depois do cancelamento pode ser vinculada quando todas as condições forem satisfeitas.
 *  5. Evento atrasado de A não altera B.
 *  6. Duas operações concorrentes não produzem substituição indevida.
 *  7. Operação bloqueada retorna applied = false quando utilizar contrato de retorno tabular.
 *  8. Provisionamento idempotente não altera a assinatura existente indevidamente.
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
  console.log('TESTES REAIS NO POSTGRESQL: PROTEÇÃO CONTRA SUBSTITUIÇÃO DE ASSINATURA')
  console.log('======================================================================\n')

  // ──────────────────────────────────────────────────────────────────────────
  // TESTE 1: Assinatura A ativa não é substituída por B
  // ──────────────────────────────────────────────────────────────────────────
  console.log('>>> 1. Testando que Assinatura A ativa não é substituída por B...')
  const clinicaId1 = randomUUID()
  const customerId1 = `cus_test1_${randomUUID()}`
  const subA1 = `sub_A_${randomUUID()}`
  const subB1 = `sub_B_${randomUUID()}`

  await supabase.from('clinicas').insert({
    id: clinicaId1,
    nome: 'Clínica Teste Ativa 1',
    status_assinatura: 'ativo',
    ativo: true,
    stripe_customer_id: customerId1,
    stripe_subscription_id: subA1,
    stripe_subscription_created: '2026-01-01T00:00:00Z',
    stripe_last_event_at: '2026-01-01T00:00:00Z',
  })

  // Tentativa 1.1: stripe_apply_subscription_update com subB1 diferente
  const { data: updateRes1, error: errUpdate1 } = await supabase.rpc('stripe_apply_subscription_update', {
    p_subscription_id: subB1,
    p_customer_id: customerId1,
    p_status: 'ativo',
    p_event_created: '2026-01-02T00:00:00Z',
    p_subscription_created: '2026-01-02T00:00:00Z',
  })

  assert('RPC stripe_apply_subscription_update executou sem erro', !errUpdate1, errUpdate1?.message)
  assert('Substituição de assinatura ativa bloqueada (applied = false)', updateRes1?.[0]?.applied === false)
  assert('Motivo de bloqueio informa clínica ativa com outra assinatura',
    updateRes1?.[0]?.motivo_bloqueio?.includes('Clínica já possui assinatura ativa diferente da informada'),
    updateRes1?.[0]?.motivo_bloqueio
  )

  // Tentativa 1.2: stripe_apply_invoice_payment_succeeded com subB1 diferente
  const { data: invoiceRes1, error: errInvoice1 } = await supabase.rpc('stripe_apply_invoice_payment_succeeded', {
    p_subscription_id: subB1,
    p_customer_id: customerId1,
    p_event_created: '2026-01-02T00:00:00Z',
    p_subscription_created: '2026-01-02T00:00:00Z',
  })

  assert('RPC stripe_apply_invoice_payment_succeeded executou sem erro', !errInvoice1, errInvoice1?.message)
  assert('Fatura de outra assinatura bloqueada em clínica ativa (applied = false)', invoiceRes1?.[0]?.applied === false)

  // Verifica que o banco permaneceu intocado
  const { data: checkClinica1 } = await supabase.from('clinicas').select('*').eq('id', clinicaId1).single()
  assert('Assinatura A permanece ativa no banco', checkClinica1?.stripe_subscription_id === subA1)
  assert('Status da clínica permanece ativo', checkClinica1?.status_assinatura === 'ativo')

  // ──────────────────────────────────────────────────────────────────────────
  // TESTE 2: Assinatura A inadimplente não é substituída por B sem autorização
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n>>> 2. Testando que Assinatura A inadimplente não é substituída por B sem autorização...')
  const clinicaId2 = randomUUID()
  const customerId2 = `cus_test2_${randomUUID()}`
  const subA2 = `sub_A_inadimplente_${randomUUID()}`
  const subB2 = `sub_B_inadimplente_${randomUUID()}`

  await supabase.from('clinicas').insert({
    id: clinicaId2,
    nome: 'Clínica Teste Inadimplente 2',
    status_assinatura: 'inadimplente',
    ativo: false,
    stripe_customer_id: customerId2,
    stripe_subscription_id: subA2,
    stripe_subscription_created: '2026-01-01T00:00:00Z',
    stripe_last_event_at: '2026-01-01T00:00:00Z',
  })

  // Tentativa 2.1: stripe_apply_subscription_update em clínica inadimplente
  const { data: updateRes2 } = await supabase.rpc('stripe_apply_subscription_update', {
    p_subscription_id: subB2,
    p_customer_id: customerId2,
    p_status: 'ativo',
    p_event_created: '2026-01-02T00:00:00Z',
    p_subscription_created: '2026-01-02T00:00:00Z',
  })

  assert('Substituição de assinatura inadimplente bloqueada em subscription_update (applied = false)', updateRes2?.[0]?.applied === false)
  assert('Motivo de bloqueio informa clínica inadimplente com outra assinatura',
    updateRes2?.[0]?.motivo_bloqueio?.includes('Clínica inadimplente com outra assinatura vinculada'),
    updateRes2?.[0]?.motivo_bloqueio
  )

  // Tentativa 2.2: stripe_apply_invoice_payment_succeeded em clínica inadimplente
  const { data: invoiceRes2 } = await supabase.rpc('stripe_apply_invoice_payment_succeeded', {
    p_subscription_id: subB2,
    p_customer_id: customerId2,
    p_event_created: '2026-01-02T00:00:00Z',
    p_subscription_created: '2026-01-02T00:00:00Z',
  })

  assert('Fatura de assinatura diferente bloqueada em clínica inadimplente (applied = false)', invoiceRes2?.[0]?.applied === false)

  // Verifica persistência no banco
  const { data: checkClinica2 } = await supabase.from('clinicas').select('*').eq('id', clinicaId2).single()
  assert('Assinatura A permanece vinculada na clínica inadimplente', checkClinica2?.stripe_subscription_id === subA2)
  assert('Status permanece inadimplente', checkClinica2?.status_assinatura === 'inadimplente')

  // ──────────────────────────────────────────────────────────────────────────
  // TESTE 3: Assinatura A cancelada não é substituída por B sem comprovação temporal
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n>>> 3. Testando que Assinatura A cancelada não é substituída por B sem comprovação temporal...')
  const clinicaId3 = randomUUID()
  const customerId3 = `cus_test3_${randomUUID()}`
  const subA3 = `sub_A_cancelado_${randomUUID()}`
  const subB3 = `sub_B_tentativa_${randomUUID()}`
  const cancelamentoEm3 = '2026-06-01T12:00:00Z'

  await supabase.from('clinicas').insert({
    id: clinicaId3,
    nome: 'Clínica Teste Cancelada 3',
    status_assinatura: 'cancelado',
    ativo: false,
    cancelamento_em: cancelamentoEm3,
    stripe_customer_id: customerId3,
    stripe_subscription_id: subA3,
    stripe_subscription_created: '2026-01-01T00:00:00Z',
    stripe_last_event_at: cancelamentoEm3,
  })

  // Tentativa 3.1: subB3 sem subscription_created (null)
  const { data: updateRes3Null } = await supabase.rpc('stripe_apply_subscription_update', {
    p_subscription_id: subB3,
    p_customer_id: customerId3,
    p_status: 'ativo',
    p_event_created: '2026-06-02T12:00:00Z',
    p_subscription_created: null,
  })

  assert('Substituição sem subscription_created bloqueada (applied = false)', updateRes3Null?.[0]?.applied === false)
  assert('Motivo aponta falta de comprovação temporal',
    updateRes3Null?.[0]?.motivo_bloqueio?.includes('comprovação temporal'),
    updateRes3Null?.[0]?.motivo_bloqueio
  )

  // Tentativa 3.2: subB3 criada ANTES do cancelamento (antiga)
  const { data: updateRes3Antiga } = await supabase.rpc('stripe_apply_subscription_update', {
    p_subscription_id: subB3,
    p_customer_id: customerId3,
    p_status: 'ativo',
    p_event_created: '2026-06-02T12:00:00Z',
    p_subscription_created: '2026-05-01T12:00:00Z', // Anterior ao cancelamento (2026-06-01)
  })

  assert('Substituição com subscription criada antes do cancelamento bloqueada (applied = false)', updateRes3Antiga?.[0]?.applied === false)
  assert('Motivo aponta assinatura criada antes ou durante o cancelamento',
    updateRes3Antiga?.[0]?.motivo_bloqueio?.includes('cancelamento'),
    updateRes3Antiga?.[0]?.motivo_bloqueio
  )

  // Tentativa 3.3: fatura com período anterior ao cancelamento
  const { data: invoiceRes3Antiga } = await supabase.rpc('stripe_apply_invoice_payment_succeeded', {
    p_subscription_id: subB3,
    p_customer_id: customerId3,
    p_invoice_period_end: '2026-05-30T12:00:00Z', // Anterior ao cancelamento
    p_event_created: '2026-06-02T12:00:00Z',
    p_subscription_created: '2026-06-02T10:00:00Z',
  })

  assert('Fatura de período anterior ao cancelamento bloqueada (applied = false)', invoiceRes3Antiga?.[0]?.applied === false)

  // Verifica que permaneceu cancelada
  const { data: checkClinica3 } = await supabase.from('clinicas').select('*').eq('id', clinicaId3).single()
  assert('Clínica cancelada permaneceu com status=cancelado', checkClinica3?.status_assinatura === 'cancelado')
  assert('Assinatura não foi substituída indevidamente', checkClinica3?.stripe_subscription_id === subA3)

  // ──────────────────────────────────────────────────────────────────────────
  // TESTE 4: Assinatura B criada depois do cancelamento pode ser vinculada
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n>>> 4. Testando vinculação legítima de Assinatura B criada pós-cancelamento...')
  const clinicaId4 = randomUUID()
  const customerId4 = `cus_test4_${randomUUID()}`
  const subA4 = `sub_A_cancelado_${randomUUID()}`
  const subB4 = `sub_B_legitima_${randomUUID()}`
  const cancelamentoEm4 = '2026-06-01T12:00:00Z'
  const subCreatedB4 = '2026-06-02T10:00:00Z'
  const eventCreatedB4 = '2026-06-02T10:05:00Z'

  await supabase.from('clinicas').insert({
    id: clinicaId4,
    nome: 'Clínica Teste Cancelada 4',
    status_assinatura: 'cancelado',
    ativo: false,
    cancelamento_em: cancelamentoEm4,
    stripe_customer_id: customerId4,
    stripe_subscription_id: subA4,
    stripe_subscription_created: '2026-01-01T00:00:00Z',
    stripe_last_event_at: cancelamentoEm4,
  })

  // Aplica nova assinatura B4 comprovadamente posterior ao cancelamento
  const { data: updateRes4, error: errUpdate4 } = await supabase.rpc('stripe_apply_subscription_update', {
    p_subscription_id: subB4,
    p_customer_id: customerId4,
    p_status: 'ativo',
    p_event_created: eventCreatedB4,
    p_subscription_created: subCreatedB4,
  })

  assert('RPC de assinatura pós-cancelamento executou sem erro', !errUpdate4, errUpdate4?.message)
  assert('Nova assinatura B aplicada com sucesso (applied = true)', updateRes4?.[0]?.applied === true)
  assert('Retorno contém o clinica_id correto', updateRes4?.[0]?.clinica_id === clinicaId4)

  // Verifica estado no banco
  const { data: checkClinica4 } = await supabase.from('clinicas').select('*').eq('id', clinicaId4).single()
  assert('Clínica reativada para status=ativo', checkClinica4?.status_assinatura === 'ativo')
  assert('Flag ativo=true', checkClinica4?.ativo === true)
  assert('Assinatura atualizada para subB4', checkClinica4?.stripe_subscription_id === subB4)
  assert('cancelamento_em limpo para NULL', checkClinica4?.cancelamento_em === null)
  assert('stripe_subscription_created atualizado para a data de criação de B',
    new Date(checkClinica4?.stripe_subscription_created).toISOString() === new Date(subCreatedB4).toISOString()
  )

  // ──────────────────────────────────────────────────────────────────────────
  // TESTE 5: Evento atrasado de A não altera B
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n>>> 5. Testando que evento atrasado de A não altera B...')
  // Utiliza a clínica 4 que agora está ativa com subB4
  const delayedEventCreated = '2026-06-03T12:00:00Z' // Evento recebido depois
  const subCreatedA4 = '2026-01-01T00:00:00Z'      // Criação da sub antiga A

  // Tentativa de evento atrasado da sub antiga A tentando alterar status para inadimplente ou cancelado
  const { data: delayedResA } = await supabase.rpc('stripe_apply_subscription_update', {
    p_subscription_id: subA4, // Assinatura anterior A
    p_customer_id: customerId4,
    p_status: 'inadimplente',
    p_event_created: delayedEventCreated,
    p_subscription_created: subCreatedA4,
  })

  assert('Evento atrasado de A é bloqueado (applied = false)', delayedResA?.[0]?.applied === false)
  assert('Motivo bloqueia substituição da assinatura ativa atual',
    delayedResA?.[0]?.motivo_bloqueio?.includes('Clínica já possui assinatura ativa diferente da informada'),
    delayedResA?.[0]?.motivo_bloqueio
  )

  // Tentativa com invoice atrasada da sub antiga A
  const { data: delayedInvoiceResA } = await supabase.rpc('stripe_apply_invoice_payment_succeeded', {
    p_subscription_id: subA4,
    p_customer_id: customerId4,
    p_event_created: delayedEventCreated,
    p_subscription_created: subCreatedA4,
  })

  assert('Fatura atrasada de A é bloqueada (applied = false)', delayedInvoiceResA?.[0]?.applied === false)

  // Verifica que o estado de B permaneceu absolutamente intocado
  const { data: checkClinica5 } = await supabase.from('clinicas').select('*').eq('id', clinicaId4).single()
  assert('Assinatura B permaneceu inalterada', checkClinica5?.stripe_subscription_id === subB4)
  assert('Status permaneceu ativo', checkClinica5?.status_assinatura === 'ativo')

  // ──────────────────────────────────────────────────────────────────────────
  // TESTE 6: Duas operações concorrentes não produzem substituição indevida
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n>>> 6. Testando concorrência: duas operações simultâneas não produzem substituição indevida...')
  const clinicaId6 = randomUUID()
  const customerId6 = `cus_test6_${randomUUID()}`
  const subA6 = `sub_A_ativo_${randomUUID()}`
  const subConc1 = `sub_conc_1_${randomUUID()}`
  const subConc2 = `sub_conc_2_${randomUUID()}`

  await supabase.from('clinicas').insert({
    id: clinicaId6,
    nome: 'Clínica Teste Concorrência 6',
    status_assinatura: 'ativo',
    ativo: true,
    stripe_customer_id: customerId6,
    stripe_subscription_id: subA6,
    stripe_subscription_created: '2026-01-01T00:00:00Z',
    stripe_last_event_at: '2026-01-01T00:00:00Z',
  })

  // Dispara duas chamadas concorrentes tentando substituir subA6
  const [resConc1, resConc2] = await Promise.all([
    supabase.rpc('stripe_apply_subscription_update', {
      p_subscription_id: subConc1,
      p_customer_id: customerId6,
      p_status: 'ativo',
      p_event_created: '2026-01-05T00:00:00Z',
      p_subscription_created: '2026-01-05T00:00:00Z',
    }),
    supabase.rpc('stripe_apply_subscription_update', {
      p_subscription_id: subConc2,
      p_customer_id: customerId6,
      p_status: 'ativo',
      p_event_created: '2026-01-05T00:00:00Z',
      p_subscription_created: '2026-01-05T00:00:00Z',
    }),
  ])

  assert('Worker 1 concorrente foi bloqueado (applied = false)', resConc1.data?.[0]?.applied === false)
  assert('Worker 2 concorrente foi bloqueado (applied = false)', resConc2.data?.[0]?.applied === false)

  const { data: checkClinica6 } = await supabase.from('clinicas').select('*').eq('id', clinicaId6).single()
  assert('Assinatura A6 ativa permaneceu imutável após corrida concorrente', checkClinica6?.stripe_subscription_id === subA6)

  // ──────────────────────────────────────────────────────────────────────────
  // TESTE 7: Operação bloqueada retorna applied = false com contrato tabular
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n>>> 7. Testando contrato de retorno tabular com applied = false...')
  const testSubX = `sub_bloqueio_${randomUUID()}`

  // Chamada bloqueada em subscription_update
  const { data: tabResSub, error: tabErrSub } = await supabase.rpc('stripe_apply_subscription_update', {
    p_subscription_id: testSubX,
    p_customer_id: customerId1, // Aponta para clinica 1 que tem subA1
    p_status: 'ativo',
    p_subscription_created: '2026-01-02T00:00:00Z',
  })

  assert('Retorno tabular em subscription_update sem erro SQL', !tabErrSub, tabErrSub?.message)
  assert('Retorno tabular é um array de exatamente 1 linha', Array.isArray(tabResSub) && tabResSub.length === 1)
  assert('Campo applied é estritamente boolean false', tabResSub?.[0]?.applied === false)
  assert('Campo clinica_id retornado é UUID válido', typeof tabResSub?.[0]?.clinica_id === 'string')
  assert('Campo motivo_bloqueio retornado é texto não vazio', typeof tabResSub?.[0]?.motivo_bloqueio === 'string' && tabResSub?.[0]?.motivo_bloqueio.length > 0)

  // Chamada bloqueada em invoice_payment_succeeded
  const { data: tabResInv, error: tabErrInv } = await supabase.rpc('stripe_apply_invoice_payment_succeeded', {
    p_subscription_id: testSubX,
    p_customer_id: customerId1,
    p_subscription_created: '2026-01-02T00:00:00Z',
  })

  assert('Retorno tabular em invoice_payment_succeeded sem erro SQL', !tabErrInv, tabErrInv?.message)
  assert('Retorno tabular de fatura é array de 1 linha', Array.isArray(tabResInv) && tabResInv.length === 1)
  assert('Campo applied na fatura bloqueada é estritamente false', tabResInv?.[0]?.applied === false)
  assert('Campo motivo_bloqueio retornado na fatura é texto informativo', typeof tabResInv?.[0]?.motivo_bloqueio === 'string')

  // ──────────────────────────────────────────────────────────────────────────
  // TESTE 8: Provisionamento idempotente não altera assinatura existente indevidamente
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n>>> 8. Testando que provisionar_novo_tenant idempotente não altera assinatura indevidamente...')
  const testUserId = randomUUID()
  const testEmail = `user_prov_${testUserId.slice(0, 8)}@test.com`
  const subProvOriginal = `sub_prov_orig_${randomUUID()}`
  const subProvTentativa = `sub_prov_tentativa_${randomUUID()}`
  const customerProv = `cus_prov_${randomUUID()}`

  // Cria usuário em auth.users
  const { error: userInsertErr } = await supabase.auth.admin.createUser({
    id: testUserId,
    email: testEmail,
    email_confirm: true,
    user_metadata: { nome: 'Admin Provisionado' },
  })
  assert('Usuário de teste criado em auth.users', !userInsertErr, userInsertErr?.message)

  // Provisiona tenant inicial com subProvOriginal
  const { data: provId1, error: provErr1 } = await supabase.rpc('provisionar_novo_tenant', {
    p_user_id: testUserId,
    p_nome_clinica: 'Clínica Provisionada Original',
    p_plano: 'profissional',
    p_stripe_customer_id: customerProv,
    p_stripe_subscription_id: subProvOriginal,
    p_subscription_created: '2026-01-01T00:00:00Z',
  })

  assert('Provisionamento inicial executado com sucesso', !provErr1 && provId1, provErr1?.message)

  // Altera status da clínica provisionada para 'inadimplente'
  await supabase.from('clinicas').update({
    status_assinatura: 'inadimplente',
    ativo: false,
  }).eq('id', provId1)

  // Chamada 8.1: provisionar_novo_tenant chamado novamente com subProvTentativa diferente
  const { data: provId2, error: provErr2 } = await supabase.rpc('provisionar_novo_tenant', {
    p_user_id: testUserId,
    p_nome_clinica: 'Tentativa Troca Nome',
    p_plano: 'profissional',
    p_stripe_customer_id: customerProv,
    p_stripe_subscription_id: subProvTentativa, // Assinatura DIFERENTE
    p_subscription_created: '2026-02-01T00:00:00Z',
  })

  assert('Chamada idempotente executada sem erro', !provErr2, provErr2?.message)
  assert('Retornou o mesmo clinica_id', provId2 === provId1)

  // Verifica que no banco a assinatura NÃO foi substituída
  const { data: checkProvClinica } = await supabase.from('clinicas').select('*').eq('id', provId1).single()
  assert('Assinatura da clínica NÃO foi alterada para a nova tentativa', checkProvClinica?.stripe_subscription_id === subProvOriginal)
  assert('Status da clínica permaneceu inadimplente', checkProvClinica?.status_assinatura === 'inadimplente')

  // Chamada 8.2: provisionar_novo_tenant com a MESMA assinatura (idempotente legítimo)
  const { data: provId3, error: provErr3 } = await supabase.rpc('provisionar_novo_tenant', {
    p_user_id: testUserId,
    p_nome_clinica: 'Clínica Provisionada Original',
    p_plano: 'profissional',
    p_stripe_customer_id: customerProv,
    p_stripe_subscription_id: subProvOriginal, // MESMA assinatura
    p_subscription_created: '2026-01-01T00:00:00Z',
  })

  assert('Idempotência legítima executada com sucesso', !provErr3 && provId3 === provId1)
  const { data: checkProvClinicaSame } = await supabase.from('clinicas').select('*').eq('id', provId1).single()
  assert('Assinatura original preservada após chamada idempotente legítima', checkProvClinicaSame?.stripe_subscription_id === subProvOriginal)

  // Cleanup de teste
  await supabase.auth.admin.deleteUser(testUserId)

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

