/**
 * tests/integration/stripe_real_db.test.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Testes reais de Idempotência, Tokens de Claim e Anti-Regressão Stripe no PostgreSQL.
 * EXECUTA DIRETAMENTE CONTRA O BANCO POSTGRESQL LOCAL REAL (sem mocks).
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function run() {
  console.log('======================================================================')
  console.log('TESTES REAIS NO POSTGRESQL: STRIPE CLAIM TOKEN & ORDENAÇÃO TEMPORAL')
  console.log('======================================================================\n')

  // ──────────────────────────────────────────────────────────────────────────
  // 1. SOBRECARGAS ANTIGAS INEXISTENTES NO POSTGRESQL
  // ──────────────────────────────────────────────────────────────────────────
  console.log('>>> 1. Verificando remoção de sobrecargas antigas inseguras...')

  const testEventId0 = `evt_legacy_${randomUUID()}`

  // Tenta chamar stripe_complete_event com 1 argumento (antiga)
  const { data: legacyData, error: legacyErr } = await supabase.rpc(
    'stripe_complete_event',
    { p_event_id: testEventId0 }
  )

  // Deve falhar porque a versão de 1 argumento foi DROPADA no banco
  assert(
    'stripe_complete_event(p_event_id) de 1 argumento não existe mais no banco',
    legacyErr !== null,
    legacyErr ? legacyErr.message : 'Deveria ter retornado erro'
  )

  // ──────────────────────────────────────────────────────────────────────────
  // 2. CENÁRIO: WORKER A EXPIRA → B ASSUME → A TENTA CONCLUIR E É REJEITADO
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n>>> 2. Cenário real de expiração e posse de claim_token (stripe_complete_event)...')

  const testEventId1 = `evt_complete_${randomUUID()}`

  // Passo 1: Worker A reserva o evento com timeout curto (1 segundo)
  const { data: claimA, error: errA } = await supabase.rpc('stripe_claim_event', {
    p_event_id: testEventId1,
    p_event_type: 'checkout.session.completed',
    p_timeout_s: 1, // 1 segundo para expiração rápida
  })

  assert('Worker A reserva evento com sucesso', claimA && claimA.startsWith('claimed:'), claimA)
  const tokenA = claimA ? claimA.slice('claimed:'.length) : null

  // Passo 2: Aguarda 1.2 segundos para expiração controlada da reserva do Worker A
  await sleep(1200)

  // Passo 3: Worker B assume o evento expirado
  const { data: claimB, error: errB } = await supabase.rpc('stripe_claim_event', {
    p_event_id: testEventId1,
    p_event_type: 'checkout.session.completed',
    p_timeout_s: 10,
  })

  assert('Worker B assume o evento expirado', claimB && claimB.startsWith('claimed:'), claimB)
  const tokenB = claimB ? claimB.slice('claimed:'.length) : null
  assert('Token do Worker B é diferente do Token do Worker A', tokenA !== tokenB, `A: ${tokenA}, B: ${tokenB}`)

  // Passo 4 & 5: Worker A tenta executar stripe_complete_event com tokenA expirado
  const { data: compA, error: errCompA } = await supabase.rpc('stripe_complete_event', {
    p_event_id: testEventId1,
    p_claim_token: tokenA,
  })

  assert('Banco rejeita conclusão pelo Worker A com token expirado (retorna false)', compA === false, `Retornou: ${compA}`)

  // Passo 6 & 7: Worker B executa stripe_complete_event com tokenB válido
  const { data: compB, error: errCompB } = await supabase.rpc('stripe_complete_event', {
    p_event_id: testEventId1,
    p_claim_token: tokenB,
  })

  assert('Banco aceita conclusão pelo Worker B com token válido (retorna true)', compB === true, `Retornou: ${compB}`)

  // Passo 8: Verifica estado final no banco de dados
  const { data: statusRows1 } = await supabase.rpc('stripe_event_status', {
    p_event_id: testEventId1,
  })
  const eventFinal1 = statusRows1?.[0]
  assert(
    'Evento finalizado com status "processed" e processed_at preenchido',
    eventFinal1 && eventFinal1.status === 'processed' && eventFinal1.processed_at !== null,
    JSON.stringify(eventFinal1)
  )

  // ──────────────────────────────────────────────────────────────────────────
  // 3. CENÁRIO: WORKER A EXPIRA → B ASSUME → A TENTA FALHAR E É REJEITADO
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n>>> 3. Cenário real de expiração e posse de claim_token (stripe_fail_event)...')

  const testEventId2 = `evt_fail_${randomUUID()}`

  // Worker A reserva com timeout de 1s
  const { data: claimFailA } = await supabase.rpc('stripe_claim_event', {
    p_event_id: testEventId2,
    p_event_type: 'invoice.payment_failed',
    p_timeout_s: 1,
  })
  const tokenFailA = claimFailA?.slice('claimed:'.length)

  // Aguarda expirar
  await sleep(1200)

  // Worker B assume o evento expirado
  const { data: claimFailB } = await supabase.rpc('stripe_claim_event', {
    p_event_id: testEventId2,
    p_event_type: 'invoice.payment_failed',
    p_timeout_s: 10,
  })
  const tokenFailB = claimFailB?.slice('claimed:'.length)

  // Worker A tenta registrar falha com token antigo
  const { data: resFailA } = await supabase.rpc('stripe_fail_event', {
    p_event_id: testEventId2,
    p_claim_token: tokenFailA,
    p_error_msg: 'Erro do Worker A que expirou',
  })
  assert('Banco rejeita stripe_fail_event pelo Worker A com token expirado (retorna false)', resFailA === false)

  // Worker B registra falha com token correto
  const { data: resFailB } = await supabase.rpc('stripe_fail_event', {
    p_event_id: testEventId2,
    p_claim_token: tokenFailB,
    p_error_msg: 'Erro legítimo do Worker B',
  })
  assert('Banco aceita stripe_fail_event pelo Worker B com token válido (retorna true)', resFailB === true)

  const { data: statusRows2 } = await supabase.rpc('stripe_event_status', {
    p_event_id: testEventId2,
  })
  const eventFinal2 = statusRows2?.[0]
  assert(
    'Evento com status "failed" e mensagem do Worker B gravada',
    eventFinal2 && eventFinal2.status === 'failed' && eventFinal2.last_error === 'Erro legítimo do Worker B'
  )

  // ──────────────────────────────────────────────────────────────────────────
  // 4. CONCORRÊNCIA REAL COM MÚLTIPLAS CONEXÕES SIMULTÂNEAS (N=10)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n>>> 4. Teste de concorrência real com N=10 chamadas paralelas no PostgreSQL...')

  const testEventId3 = `evt_concorrencia_real_${randomUUID()}`
  const N = 10

  const parallelResults = await Promise.all(
    Array.from({ length: N }, () =>
      supabase.rpc('stripe_claim_event', {
        p_event_id: testEventId3,
        p_event_type: 'customer.subscription.updated',
        p_timeout_s: 60,
      })
    )
  )

  const claims = parallelResults.map((r) => r.data)
  const claimedCount = claims.filter((c) => typeof c === 'string' && c.startsWith('claimed:')).length
  const inProgressCount = claims.filter((c) => c === 'in_progress').length

  assert(
    `Distribuição completa exata: 1 claimed, ${N - 1} in_progress (soma = ${N})`,
    claimedCount === 1 && inProgressCount === N - 1 && claimedCount + inProgressCount === N,
    `Claimed: ${claimedCount}, In Progress: ${inProgressCount}`
  )

  // ──────────────────────────────────────────────────────────────────────────
  // 5. PROTEÇÃO CONTRA EVENTOS FORA DE ORDEM NO POSTGRESQL REAL
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n>>> 5. Testes de eventos Stripe fora de ordem...')

  // Cria uma clínica de teste
  const clinicaId = randomUUID()
  const subAntigaId = `sub_antiga_${randomUUID().slice(0, 8)}`
  const subNovaId = `sub_nova_${randomUUID().slice(0, 8)}`
  const customerId = `cus_test_${randomUUID().slice(0, 8)}`
  const agora = new Date()
  const cancelamentoData = new Date(agora.getTime() - 60000) // cancelada há 1 minuto

  const { error: insErr } = await supabase.from('clinicas').insert({
    id: clinicaId,
    nome: 'Clínica Teste Stripe Temporal',
    status_assinatura: 'cancelado',
    stripe_subscription_id: subAntigaId,
    stripe_customer_id: customerId,
    cancelamento_em: cancelamentoData.toISOString(),
    ativo: false,
  })
  assert('Clínica de teste inserida em estado "cancelado"', !insErr, insErr?.message)

  // 5.1 Evento de pagamento antigo (invoice) chegando após cancelamento
  const eventoAntigoData = new Date(cancelamentoData.getTime() - 30000).toISOString() // 30s antes do cancelamento
  const { data: checkInvoiceAntiga } = await supabase.rpc(
    'stripe_should_activate_on_invoice',
    {
      p_subscription_id: subAntigaId,
      p_customer_id: customerId,
      p_invoice_period_end: eventoAntigoData,
      p_event_created: eventoAntigoData,
    }
  )

  assert(
    'invoice.payment_succeeded antigo é bloqueado e não reativa clínica cancelada',
    checkInvoiceAntiga && checkInvoiceAntiga[0]?.deve_ativar === false,
    checkInvoiceAntiga?.[0]?.motivo_bloqueio
  )

  // 5.2 Evento de fatura da mesma assinatura já cancelada mesmo sem event_created
  const { data: checkInvoiceMesmaSub } = await supabase.rpc(
    'stripe_should_activate_on_invoice',
    {
      p_subscription_id: subAntigaId,
      p_customer_id: customerId,
    }
  )

  assert(
    'Fatura da mesma assinatura cancelada é bloqueada preventivamente',
    checkInvoiceMesmaSub && checkInvoiceMesmaSub[0]?.deve_ativar === false,
    checkInvoiceMesmaSub?.[0]?.motivo_bloqueio
  )

  // 5.3 Fatura de nova assinatura legítima (reativação pelo customer_id com nova subscription criada após cancelamento)
  const eventoNovoData = new Date(agora.getTime() + 10000).toISOString()
  const { data: checkInvoiceNovaSub } = await supabase.rpc(
    'stripe_should_activate_on_invoice',
    {
      p_subscription_id: subNovaId,
      p_customer_id: customerId,
      p_invoice_period_end: eventoNovoData,
      p_event_created: eventoNovoData,
      p_subscription_created: eventoNovoData,
    }
  )

  assert(
    'Nova assinatura legítima (sub diferente pós-cancelamento) é permitida',
    checkInvoiceNovaSub && checkInvoiceNovaSub[0]?.deve_ativar === true
  )

  // Limpa clínica de teste
  await supabase.from('clinicas').delete().eq('id', clinicaId)

  // ──────────────────────────────────────────────────────────────────────────
  // RESUMO FINAL
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n======================================================================')
  console.log(`TOTAL DE TESTES REAIS: ${passed + failed} | PASSARAM: ${passed} | FALHARAM: ${failed}`)
  console.log('======================================================================')

  if (failed > 0) {
    process.exit(1)
  }
}

run().catch((err) => {
  console.error('Erro não tratado na execução:', err)
  process.exit(1)
})
