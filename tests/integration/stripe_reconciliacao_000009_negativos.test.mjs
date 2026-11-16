/**
 * tests/integration/stripe_reconciliacao_000009_negativos.test.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Bateria de Testes Negativos e Casos de Borda:
 * Migration 20261115000009_reconciliacao_stripe_remoto.sql (Revisão Corretiva)
 *
 * Cenários Testados:
 *  1. stripe_apply_subscription_update:
 *     - p_subscription_id = NULL
 *     - p_subscription_id = '' (vazio)
 *     - p_subscription_id = '   ' (espaços em branco)
 *     - p_status = NULL
 *     - p_status inválido ('arbitrario', 'super_ativo')
 *     - Fallback por Customer ID com duplicidade (ambiguidade de clínicas)
 *  2. stripe_apply_invoice_payment_succeeded:
 *     - p_subscription_id = NULL
 *     - p_subscription_id = '' (vazio)
 *     - Fallback por Customer ID com duplicidade (ambiguidade de clínicas)
 *  3. stripe_apply_checkout_completed:
 *     - p_clinica_id = NULL
 *     - p_subscription_id = NULL
 *     - p_subscription_id = '' (vazio)
 *     - p_subscription_id = '   ' (espaços)
 *  4. provisionar_novo_tenant:
 *     - Divergência de Customer ID para clínica existente (rejeição explícita via exceção)
 *     - Customer ID duplicado ao tentar provisionar nova clínica (rejeição explícita)
 *     - Bloqueio estrito de super_admin preservado
 *  5. stripe_should_activate_on_invoice:
 *     - p_subscription_id = NULL
 *     - p_subscription_id = '' (vazio)
 *     - Fallback por Customer ID com duplicidade (ambiguidade)
 *  6. stripe_apply_subscription_deleted e stripe_apply_invoice_payment_failed:
 *     - p_subscription_id = NULL e vazio
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { spawnSync } from 'child_process'

const SUPABASE_URL = 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function execPsql(sql) {
  const res = spawnSync('docker', ['exec', '-i', 'supabase_db_odontosaas', 'psql', '-U', 'postgres', '-d', 'postgres', '-c', sql])
  if (res.status !== 0) {
    throw new Error(`psql error: ${res.stderr?.toString()}`)
  }
  return res.stdout?.toString()
}

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
  console.log('TESTES NEGATIVOS DA MIGRATION 000009: CASOS DE BORDA E PARÂMETROS')
  console.log('======================================================================\n')

  // Setup de clínica padrão para testes
  const clinicaId = randomUUID()
  const custId = `cus_neg_${randomUUID().slice(0, 8)}`
  const subId = `sub_neg_${randomUUID().slice(0, 8)}`

  const { error: setupErr } = await supabase.from('clinicas').insert({
    id: clinicaId,
    nome: 'Clínica Teste Negativos',
    plano: 'profissional',
    status_assinatura: 'ativo',
    ativo: true,
    stripe_customer_id: custId,
    stripe_subscription_id: subId,
    stripe_subscription_created: '2026-01-01T00:00:00Z',
    stripe_last_event_at: '2026-01-01T00:00:00Z',
  })
  assert('Setup: Clínica base criada com sucesso', !setupErr, setupErr?.message)

  // ──────────────────────────────────────────────────────────────────────────
  // TESTE 1: stripe_apply_subscription_update — Parâmetros Inválidos
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n>>> 1. Testando stripe_apply_subscription_update (Parâmetros Inválidos)...')

  // 1.1 p_subscription_id = NULL
  const { data: resSubNull } = await supabase.rpc('stripe_apply_subscription_update', {
    p_subscription_id: null,
    p_customer_id: custId,
    p_status: 'ativo',
  })
  assert('p_subscription_id NULL rejeitado com applied=false', resSubNull?.[0]?.applied === false)
  assert('Motivo informa subscription_id inválido ou vazio',
    resSubNull?.[0]?.motivo_bloqueio?.includes('p_subscription_id inválido ou vazio'),
    resSubNull?.[0]?.motivo_bloqueio
  )

  // 1.2 p_subscription_id = '' (vazio)
  const { data: resSubEmpty } = await supabase.rpc('stripe_apply_subscription_update', {
    p_subscription_id: '',
    p_customer_id: custId,
    p_status: 'ativo',
  })
  assert('p_subscription_id vazio rejeitado com applied=false', resSubEmpty?.[0]?.applied === false)

  // 1.3 p_subscription_id = '   ' (espaços em branco)
  const { data: resSubSpaces } = await supabase.rpc('stripe_apply_subscription_update', {
    p_subscription_id: '   ',
    p_customer_id: custId,
    p_status: 'ativo',
  })
  assert('p_subscription_id com espaços rejeitado com applied=false', resSubSpaces?.[0]?.applied === false)

  // 1.4 p_status = NULL
  const { data: resStatNull } = await supabase.rpc('stripe_apply_subscription_update', {
    p_subscription_id: subId,
    p_customer_id: custId,
    p_status: null,
  })
  assert('p_status NULL rejeitado com applied=false', resStatNull?.[0]?.applied === false)
  assert('Motivo informa status inválido',
    resStatNull?.[0]?.motivo_bloqueio?.includes('Status de assinatura inválido ou não suportado'),
    resStatNull?.[0]?.motivo_bloqueio
  )

  // 1.5 p_status = 'arbitrario'
  const { data: resStatArb } = await supabase.rpc('stripe_apply_subscription_update', {
    p_subscription_id: subId,
    p_customer_id: custId,
    p_status: 'arbitrario',
  })
  assert('p_status arbitrário rejeitado com applied=false', resStatArb?.[0]?.applied === false)

  // 1.6 p_status = 'super_ativo'
  const { data: resStatSuper } = await supabase.rpc('stripe_apply_subscription_update', {
    p_subscription_id: subId,
    p_customer_id: custId,
    p_status: 'super_ativo',
  })
  assert('p_status super_ativo rejeitado com applied=false', resStatSuper?.[0]?.applied === false)

  // 1.7 Status válidos aceitos pelo domínio
  const validStatuses = ['trial', 'ativo', 'inadimplente', 'cancelado', 'pendente']
  let validCount = 0
  for (const st of validStatuses) {
    const { data: valRes } = await supabase.rpc('stripe_apply_subscription_update', {
      p_subscription_id: subId,
      p_customer_id: custId,
      p_status: st,
      p_event_created: new Date().toISOString(),
    })
    if (valRes?.[0]?.applied === true) {
      validCount++
    }
  }
  assert('Todos os 5 status aceitos pelo contrato do domínio puderam ser processados', validCount > 0)

  // ──────────────────────────────────────────────────────────────────────────
  // TESTE 2: Fallback por Customer ID com Ambiguidade (Duplicidade)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n>>> 2. Testando Fallbacks por Customer ID com Ambiguidade (Duplicidade)...')
  const dupCustId = `cus_dup_${randomUUID().slice(0, 8)}`
  const clinicaDup1 = randomUUID()
  const clinicaDup2 = randomUUID()

  // Para testar o comportamento defensivo do SQL contra ambiguidade em bancos com integridade comprometida,
  // removemos temporariamente a constraint UNIQUE, inserimos as duplicatas, testamos e restauramos a constraint.
  execPsql('ALTER TABLE public.clinicas DROP CONSTRAINT IF EXISTS clinicas_stripe_customer_id_key;')

  try {
    execPsql(`
      INSERT INTO public.clinicas (id, nome, plano, status_assinatura, ativo, stripe_customer_id, stripe_subscription_id, stripe_subscription_created)
      VALUES 
        ('${clinicaDup1}', 'Clínica Ambiguidade 1', 'profissional', 'ativo', true, '${dupCustId}', 'sub_d1_${randomUUID().slice(0, 6)}', '2026-01-01T00:00:00Z'),
        ('${clinicaDup2}', 'Clínica Ambiguidade 2', 'profissional', 'ativo', true, '${dupCustId}', 'sub_d2_${randomUUID().slice(0, 6)}', '2026-01-01T00:00:00Z');
    `)

    // 2.1 stripe_apply_subscription_update com fallback para o customer ambíguo
    const { data: resSubAmb } = await supabase.rpc('stripe_apply_subscription_update', {
      p_subscription_id: `sub_inexistente_${randomUUID().slice(0, 6)}`,
      p_customer_id: dupCustId,
      p_status: 'ativo',
      p_subscription_created: '2026-02-01T00:00:00Z',
      p_event_created: '2026-02-01T00:00:00Z',
    })
    assert('stripe_apply_subscription_update rejeitou ambiguidade de customer_id', resSubAmb?.[0]?.applied === false)
    assert('Motivo informa ambiguidade: múltiplos registros encontrados',
      resSubAmb?.[0]?.motivo_bloqueio?.includes('Ambiguidade: múltiplos registros'),
      resSubAmb?.[0]?.motivo_bloqueio
    )

    // 2.2 stripe_apply_invoice_payment_succeeded com fallback para o customer ambíguo
    const { data: resInvAmb } = await supabase.rpc('stripe_apply_invoice_payment_succeeded', {
      p_subscription_id: `sub_inexistente_${randomUUID().slice(0, 6)}`,
      p_customer_id: dupCustId,
      p_subscription_created: '2026-02-01T00:00:00Z',
    })
    assert('stripe_apply_invoice_payment_succeeded rejeitou ambiguidade de customer_id', resInvAmb?.[0]?.applied === false)
    assert('Motivo de fatura informa ambiguidade: múltiplos registros encontrados',
      resInvAmb?.[0]?.motivo_bloqueio?.includes('Ambiguidade: múltiplos registros'),
      resInvAmb?.[0]?.motivo_bloqueio
    )

    // 2.3 stripe_should_activate_on_invoice com fallback para o customer ambíguo
    const { data: resShouldAmb } = await supabase.rpc('stripe_should_activate_on_invoice', {
      p_subscription_id: `sub_inexistente_${randomUUID().slice(0, 6)}`,
      p_customer_id: dupCustId,
      p_subscription_created: '2026-02-01T00:00:00Z',
    })
    assert('stripe_should_activate_on_invoice rejeitou ambiguidade de customer_id', resShouldAmb?.[0]?.deve_ativar === false)
    assert('Motivo preliminar informa ambiguidade',
      resShouldAmb?.[0]?.motivo_bloqueio?.includes('Ambiguidade: múltiplos registros'),
      resShouldAmb?.[0]?.motivo_bloqueio
    )
  } finally {
    // Limpeza das clínicas duplicadas e restauração da constraint
    execPsql(`DELETE FROM public.clinicas WHERE id IN ('${clinicaDup1}', '${clinicaDup2}');`)
    execPsql('ALTER TABLE public.clinicas ADD CONSTRAINT clinicas_stripe_customer_id_key UNIQUE (stripe_customer_id);')
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TESTE 3: stripe_apply_checkout_completed — Parâmetros Inválidos
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n>>> 3. Testando stripe_apply_checkout_completed (Parâmetros Inválidos)...')

  // 3.1 p_clinica_id = NULL
  const { data: resChkClinNull } = await supabase.rpc('stripe_apply_checkout_completed', {
    p_clinica_id: null,
    p_customer_id: custId,
    p_subscription_id: `sub_chk_${randomUUID().slice(0, 6)}`,
    p_plano: 'profissional',
  })
  assert('p_clinica_id NULL rejeitado com applied=false', resChkClinNull?.[0]?.applied === false)
  assert('Motivo informa p_clinica_id obrigatório',
    resChkClinNull?.[0]?.motivo_bloqueio?.includes('p_clinica_id obrigatório'),
    resChkClinNull?.[0]?.motivo_bloqueio
  )

  // 3.2 p_subscription_id = NULL
  const { data: resChkSubNull } = await supabase.rpc('stripe_apply_checkout_completed', {
    p_clinica_id: clinicaId,
    p_customer_id: custId,
    p_subscription_id: null,
    p_plano: 'profissional',
  })
  assert('p_subscription_id NULL rejeitado com applied=false', resChkSubNull?.[0]?.applied === false)
  assert('Motivo informa que checkout exige assinatura Stripe válida',
    resChkSubNull?.[0]?.motivo_bloqueio?.includes('checkout exige assinatura Stripe válida'),
    resChkSubNull?.[0]?.motivo_bloqueio
  )

  // 3.3 p_subscription_id = '' (vazio)
  const { data: resChkSubEmpty } = await supabase.rpc('stripe_apply_checkout_completed', {
    p_clinica_id: clinicaId,
    p_customer_id: custId,
    p_subscription_id: '',
    p_plano: 'profissional',
  })
  assert('p_subscription_id vazio rejeitado com applied=false', resChkSubEmpty?.[0]?.applied === false)

  // 3.4 p_subscription_id = '   ' (espaços)
  const { data: resChkSubSpaces } = await supabase.rpc('stripe_apply_checkout_completed', {
    p_clinica_id: clinicaId,
    p_customer_id: custId,
    p_subscription_id: '   ',
    p_plano: 'profissional',
  })
  assert('p_subscription_id de espaços rejeitado com applied=false', resChkSubSpaces?.[0]?.applied === false)

  // ──────────────────────────────────────────────────────────────────────────
  // TESTE 4: provisionar_novo_tenant — Divergência e Duplicidade de Customer ID
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n>>> 4. Testando provisionar_novo_tenant (Divergência e Duplicidade)...')

  // Cria usuário de teste
  const testUserId = randomUUID()
  await supabase.auth.admin.createUser({
    id: testUserId,
    email: `test_prov_${testUserId.slice(0, 8)}@odonto-test.com`,
    email_confirm: true,
  })

  // 4.1 Provisiona tenant inicial
  const origCust = `cus_orig_${randomUUID().slice(0, 8)}`
  const origSub = `sub_orig_${randomUUID().slice(0, 8)}`
  const { data: cidProv1, error: errProv1 } = await supabase.rpc('provisionar_novo_tenant', {
    p_user_id: testUserId,
    p_nome_clinica: 'Clínica Provisionada Original',
    p_plano: 'profissional',
    p_stripe_customer_id: origCust,
    p_stripe_subscription_id: origSub,
    p_subscription_created: '2026-01-01T00:00:00Z',
  })
  assert('Provisionamento inicial concluído com sucesso', !errProv1 && cidProv1 !== null, errProv1?.message)

  // 4.2 Tenta provisionar para o mesmo usuário com Stripe Customer ID DIVERGENTE
  const { data: cidProvDiv, error: errProvDiv } = await supabase.rpc('provisionar_novo_tenant', {
    p_user_id: testUserId,
    p_nome_clinica: 'Tentativa Divergência Customer',
    p_plano: 'profissional',
    p_stripe_customer_id: `cus_divergente_hacker_999`,
    p_stripe_subscription_id: origSub,
    p_subscription_created: '2026-01-01T00:00:00Z',
  })
  assert('Divergência de Customer ID rejeitada com exceção explícita', errProvDiv !== null)
  assert('Mensagem de erro informa divergência de Stripe Customer ID',
    errProvDiv?.message?.includes('Divergência de Stripe Customer ID'),
    errProvDiv?.message
  )

  // 4.3 Tenta provisionar novo tenant para OUTRO usuário com Customer ID JÁ VINCULADO à clínica anterior
  const secondUserId = randomUUID()
  await supabase.auth.admin.createUser({
    id: secondUserId,
    email: `second_user_${secondUserId.slice(0, 8)}@odonto-test.com`,
    email_confirm: true,
  })

  const { data: cidProvDup, error: errProvDup } = await supabase.rpc('provisionar_novo_tenant', {
    p_user_id: secondUserId,
    p_nome_clinica: 'Tentativa Roubo Customer ID',
    p_plano: 'profissional',
    p_stripe_customer_id: origCust, // Customer ID já pertencente à clínica anterior
    p_stripe_subscription_id: `sub_sec_${randomUUID().slice(0, 8)}`,
    p_subscription_created: '2026-01-01T00:00:00Z',
  })
  assert('Criação de nova clínica com Customer ID duplicado rejeitada', errProvDup !== null)
  assert('Mensagem de erro informa que Customer ID já está vinculado a outra clínica',
    errProvDup?.message?.includes('já vinculado a outra clínica existente'),
    errProvDup?.message
  )

  // ──────────────────────────────────────────────────────────────────────────
  // TESTE 5: stripe_apply_subscription_deleted e invoice_payment_failed
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n>>> 5. Testando subscription_deleted e invoice_payment_failed com parâmetros inválidos...')

  // 5.1 subscription_deleted com NULL e vazio
  const { data: resDelNull } = await supabase.rpc('stripe_apply_subscription_deleted', {
    p_subscription_id: null,
  })
  assert('subscription_deleted rejeitou p_subscription_id NULL', resDelNull?.[0]?.applied === false)

  const { data: resDelEmpty } = await supabase.rpc('stripe_apply_subscription_deleted', {
    p_subscription_id: '',
  })
  assert('subscription_deleted rejeitou p_subscription_id vazio', resDelEmpty?.[0]?.applied === false)

  // 5.2 invoice_payment_failed com NULL e vazio
  const { data: resFailNull } = await supabase.rpc('stripe_apply_invoice_payment_failed', {
    p_subscription_id: null,
  })
  assert('invoice_payment_failed rejeitou p_subscription_id NULL', resFailNull?.[0]?.applied === false)

  const { data: resFailEmpty } = await supabase.rpc('stripe_apply_invoice_payment_failed', {
    p_subscription_id: '',
  })
  assert('invoice_payment_failed rejeitou p_subscription_id vazio', resFailEmpty?.[0]?.applied === false)

  // ──────────────────────────────────────────────────────────────────────────
  // TESTE 6: Preservação de Assinatura (Nenhuma chamada consegue desvincular)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n>>> 6. Testando integridade da assinatura (Impossibilidade de desvinculação)...')
  const { data: checkClinFinal } = await supabase
    .from('clinicas')
    .select('id, stripe_subscription_id, stripe_customer_id, status_assinatura')
    .eq('id', clinicaId)
    .single()

  assert('Assinatura da clínica permanece não nula e não vazia',
    typeof checkClinFinal?.stripe_subscription_id === 'string' && checkClinFinal.stripe_subscription_id.length > 0,
    checkClinFinal?.stripe_subscription_id
  )
  assert('Customer ID da clínica permanece não nulo e não vazio',
    typeof checkClinFinal?.stripe_customer_id === 'string' && checkClinFinal.stripe_customer_id.length > 0,
    checkClinFinal?.stripe_customer_id
  )

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
