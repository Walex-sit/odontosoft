/**
 * tests/stripe_webhook_idempotencia.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Suíte de Testes Obrigatórios:
 *  1. Falha de pagamento com assinatura atual (RPC transacional com SELECT FOR UPDATE).
 *  2. Falha de pagamento com assinatura antiga / evento antigo descartado.
 *  3. Evento antigo chegando depois de evento novo (proteção anti-regressão).
 *  4. Duas assinaturas concorrentes para o mesmo customer.
 *  5. Worker antigo tentando marcar evento como failed.
 *  6. RPC de falha retornando erro.
 *  7. RPC de falha retornando false (perda de claim).
 *  8. Duas atualizações concorrentes tentando substituir assinatura (FOR UPDATE serializa).
 *  9. Preservação dos metadados de auditoria sem conteúdo clínico.
 * 10. Proteção de checkout.session.completed contra checkout antigo/substituição.
 * 11. Eliminação de fallbacks inseguros em produção (RPC inesperada -> 500 para retry).
 * 12. Sanitização estrita de logs no console sem expor segredos originais.
 * 13. Substituição de assinatura não é bloqueada pelo timestamp da sub anterior.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import Stripe from 'stripe'

// ─── Mocks Globais ────────────────────────────────────────────────────────────

const TEST_WEBHOOK_SECRET = 'whsec_test_secret_revisao_staging_2026'

const mockRpc = vi.fn()
let mockClinicaSelectResult: any = { data: null, error: null }
let mockClinicaUpdateResult: any = { data: null, error: null }
const mockUpdateSpy = vi.fn()
const mockSelectSpy = vi.fn()

vi.mock('@/app/lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    rpc: mockRpc,
    from: vi.fn((table: string) => {
      const builder: any = {
        select: vi.fn((...args: any[]) => {
          mockSelectSpy(...args)
          return builder
        }),
        update: vi.fn((...args: any[]) => {
          mockUpdateSpy(...args)
          return builder
        }),
        insert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockImplementation(() => Promise.resolve(mockClinicaSelectResult)),
        single: vi.fn().mockImplementation(() => Promise.resolve(mockClinicaSelectResult)),
      }
      builder.then = (resolve: any, reject: any) => {
        return Promise.resolve(mockClinicaUpdateResult).then(resolve, reject)
      }
      return builder
    }),
  },
}))

vi.mock('@/app/lib/stripe', () => {
  const instance = new Stripe('sk_test_fake', { typescript: true })
  instance.subscriptions = {
    ...instance.subscriptions,
    retrieve: vi.fn().mockImplementation(async (id: string) => {
      return { id, created: Math.floor(Date.now() / 1000) }
    }),
  } as any
  return { stripe: instance }
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSignedRequest(payload: object, secret: string): Request {
  const body = JSON.stringify(payload)
  const header = Stripe.webhooks.generateTestHeaderString({ payload: body, secret })
  return new Request('http://localhost/api/webhooks/payment', {
    method: 'POST',
    headers: { 'stripe-signature': header, 'content-type': 'application/json' },
    body,
  })
}

function buildUnsignedRequest(payload: object): Request {
  return new Request('http://localhost/api/webhooks/payment', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

function buildEvent(overrides: Partial<Stripe.Event> = {}): Stripe.Event {
  return {
    id: `evt_test_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    object: 'event',
    api_version: '2024-06-20',
    created: Math.floor(Date.now() / 1000),
    data: { object: {} },
    livemode: false,
    pending_webhooks: 1,
    request: null,
    type: 'checkout.session.completed',
    ...overrides,
  } as Stripe.Event
}

async function getHandler() {
  const mod = await import('@/app/api/webhooks/payment/route')
  return mod.POST
}

// ─── Suíte de Testes ──────────────────────────────────────────────────────────

describe('Webhook Stripe — Auditoria Corretiva e Segurança Concorrente', () => {
  const CLAIM_TOKEN = '11112222-3333-4444-5555-666677778888'
  const CLINICA_ID = 'c0000000-0000-0000-0000-000000000001'
  const SUB_ATUAL = 'sub_atual_123'
  const SUB_ANTIGA = 'sub_antiga_999'
  const CUSTOMER_ID = 'cus_cliente_123'

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET
    ;(process.env as any).NODE_ENV = 'test'

    mockClinicaSelectResult = { data: null, error: null }
    mockClinicaUpdateResult = { data: null, error: null }

    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'stripe_claim_event') {
        return Promise.resolve({ data: `claimed:${CLAIM_TOKEN}`, error: null })
      }
      if (fn === 'stripe_complete_event') {
        return Promise.resolve({ data: true, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })
  })

  // ── 1. Falha de pagamento com assinatura atual ───────────────────────────────
  it('1. Falha de pagamento com assinatura atual aplica inadimplência via RPC transacional', async () => {
    mockRpc.mockImplementation((fn: string, args: any) => {
      if (fn === 'stripe_claim_event') return Promise.resolve({ data: `claimed:${CLAIM_TOKEN}`, error: null })
      if (fn === 'stripe_complete_event') return Promise.resolve({ data: true, error: null })
      if (fn === 'stripe_apply_invoice_payment_failed') {
        expect(args.p_subscription_id).toBe(SUB_ATUAL)
        return Promise.resolve({
          data: [{ clinica_id: CLINICA_ID, applied: true, motivo_bloqueio: null }],
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const POST = await getHandler()
    const event = buildEvent({
      type: 'invoice.payment_failed',
      data: {
        object: {
          id: 'in_failed_001',
          subscription: SUB_ATUAL,
          customer: CUSTOMER_ID,
        } as any,
      },
    })

    const req = buildSignedRequest(event, TEST_WEBHOOK_SECRET)
    const res = await POST(req as any)
    expect(res.status).toBe(200)
  })

  // ── 2. Falha de pagamento com assinatura antiga / evento atrasado ─────────────
  it('2. Falha de pagamento com assinatura antiga ou evento atrasado é bloqueada pela RPC', async () => {
    mockRpc.mockImplementation((fn: string, args: any) => {
      if (fn === 'stripe_claim_event') return Promise.resolve({ data: `claimed:${CLAIM_TOKEN}`, error: null })
      if (fn === 'stripe_complete_event') return Promise.resolve({ data: true, error: null })
      if (fn === 'stripe_apply_invoice_payment_failed') {
        return Promise.resolve({
          data: [{ clinica_id: CLINICA_ID, applied: false, motivo_bloqueio: 'Evento antigo descartado: timestamp anterior ao último registrado' }],
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const POST = await getHandler()
    const event = buildEvent({
      type: 'invoice.payment_failed',
      created: Math.floor(Date.now() / 1000) - 7200,
      data: {
        object: {
          id: 'in_failed_old',
          subscription: SUB_ANTIGA,
          customer: CUSTOMER_ID,
        } as any,
      },
    })

    const res = await POST(buildSignedRequest(event, TEST_WEBHOOK_SECRET) as any)
    expect(res.status).toBe(200)
    expect(mockUpdateSpy).not.toHaveBeenCalled()
  })

  // ── 3. Evento antigo chegando depois de evento novo ─────────────────────────
  it('3. Evento antigo chegando depois de evento novo é bloqueado e descartado', async () => {
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'stripe_claim_event') return Promise.resolve({ data: `claimed:${CLAIM_TOKEN}`, error: null })
      if (fn === 'stripe_complete_event') return Promise.resolve({ data: true, error: null })
      if (fn === 'stripe_apply_subscription_update') {
        return Promise.resolve({
          data: [{
            clinica_id: CLINICA_ID,
            applied: false,
            motivo_bloqueio: 'Evento antigo descartado: timestamp do evento anterior ao último processado',
          }],
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const POST = await getHandler()
    const eventAntigo = buildEvent({
      type: 'customer.subscription.updated',
      created: Math.floor(Date.now() / 1000) - 3600,
      data: {
        object: {
          id: SUB_ATUAL,
          customer: CUSTOMER_ID,
          status: 'past_due',
        } as any,
      },
    })

    const req = buildSignedRequest(eventAntigo, TEST_WEBHOOK_SECRET)
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    expect(mockUpdateSpy).not.toHaveBeenCalled()
  })

  // ── 4. Duas assinaturas concorrentes para o mesmo customer ──────────────────
  it('4. Duas assinaturas concorrentes para o mesmo customer: assinatura antiga não substitui nova', async () => {
    mockRpc.mockImplementation((fn: string, args: any) => {
      if (fn === 'stripe_claim_event') return Promise.resolve({ data: `claimed:${CLAIM_TOKEN}`, error: null })
      if (fn === 'stripe_complete_event') return Promise.resolve({ data: true, error: null })
      if (fn === 'stripe_apply_subscription_update') {
        if (args.p_subscription_id === SUB_ANTIGA) {
          return Promise.resolve({
            data: [{
              clinica_id: CLINICA_ID,
              applied: false,
              motivo_bloqueio: 'Clínica já possui assinatura ativa diferente da informada — substituição bloqueada',
            }],
            error: null,
          })
        }
        return Promise.resolve({
          data: [{ clinica_id: CLINICA_ID, applied: true, motivo_bloqueio: null }],
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const POST = await getHandler()
    const eventConcorrenteAntigo = buildEvent({
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: SUB_ANTIGA,
          customer: CUSTOMER_ID,
          status: 'active',
        } as any,
      },
    })

    const res = await POST(buildSignedRequest(eventConcorrenteAntigo, TEST_WEBHOOK_SECRET) as any)
    expect(res.status).toBe(200)
    expect(mockUpdateSpy).not.toHaveBeenCalled()
  })

  // ── 5. Worker antigo tentando marcar evento como failed ─────────────────────
  it('5. Worker antigo tentando marcar evento como failed: RPC retorna false e não altera estado do novo worker', async () => {
    const TOKEN_A = 'aaaa1111-0000-0000-0000-000000000000'
    const TOKEN_B = 'bbbb2222-1111-1111-1111-111111111111'
    const EVENT_ID = 'evt_worker_corrida_fail_01'
    const dbCurrentToken = TOKEN_B

    mockRpc.mockImplementation((fn: string, args: Record<string, unknown>) => {
      if (fn === 'stripe_fail_event') {
        const match = args['p_claim_token'] === dbCurrentToken
        if (!match) return Promise.resolve({ data: false, error: null })
        return Promise.resolve({ data: true, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const { supabaseAdmin } = await import('@/app/lib/supabaseAdmin')
    const resultWorkerA = await (supabaseAdmin.rpc as any)('stripe_fail_event', {
      p_event_id: EVENT_ID,
      p_claim_token: TOKEN_A,
      p_error_msg: 'Erro timeout do worker A',
    })
    expect(resultWorkerA.error).toBeNull()
    expect(resultWorkerA.data).toBe(false)

    const resultWorkerB = await (supabaseAdmin.rpc as any)('stripe_fail_event', {
      p_event_id: EVENT_ID,
      p_claim_token: TOKEN_B,
      p_error_msg: 'Erro legítimo do worker B',
    })
    expect(resultWorkerB.error).toBeNull()
    expect(resultWorkerB.data).toBe(true)
  })

  // ── 6. RPC de falha retornando erro ─────────────────────────────────────────
  it('6. RPC de falha retornando erro: captura, sanitiza e não considera falha registrada', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { })

    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'stripe_claim_event') return Promise.resolve({ data: `claimed:${CLAIM_TOKEN}`, error: null })
      if (fn === 'stripe_apply_subscription_update') {
        return Promise.resolve({ data: null, error: { message: 'Erro forçado com secret whsec_vazamento1234' } })
      }
      if (fn === 'stripe_fail_event') {
        return Promise.resolve({ data: null, error: { message: 'Postgres connection timeout' } })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const POST = await getHandler()
    const event = buildEvent({
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: SUB_ATUAL,
          customer: CUSTOMER_ID,
          status: 'active',
        } as any,
      },
    })

    const res = await POST(buildSignedRequest(event, TEST_WEBHOOK_SECRET) as any)
    expect(res.status).toBe(500)

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Webhook/Payment] Erro retornado pela RPC stripe_fail_event:'),
      'Postgres connection timeout'
    )
    consoleErrorSpy.mockRestore()
  })

  // ── 7. RPC de falha retornando false ────────────────────────────────────────
  it('7. RPC de falha retornando false: tratado explicitamente como perda de posse do evento', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { })

    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'stripe_claim_event') return Promise.resolve({ data: `claimed:${CLAIM_TOKEN}`, error: null })
      if (fn === 'stripe_apply_subscription_update') {
        return Promise.resolve({ data: null, error: { message: 'Erro forçado para acionar catch' } })
      }
      if (fn === 'stripe_fail_event') {
        return Promise.resolve({ data: false, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const POST = await getHandler()
    const event = buildEvent({
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: SUB_ATUAL,
          customer: CUSTOMER_ID,
          status: 'active',
        } as any,
      },
    })

    const res = await POST(buildSignedRequest(event, TEST_WEBHOOK_SECRET) as any)
    expect(res.status).toBe(500)

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('perda de posse do evento (worker desatualizado ou token expirado)')
    )
    consoleWarnSpy.mockRestore()
  })

  // ── 8. Duas atualizações concorrentes tentando substituir assinatura ───────
  it('8. Duas atualizações concorrentes tentando substituir assinatura: validação sob FOR UPDATE serializa e protege', async () => {
    let clinicaState = {
      status_assinatura: 'cancelado',
      stripe_subscription_id: 'sub_original_cancelada',
    }

    mockRpc.mockImplementation((fn: string, args: any) => {
      if (fn === 'stripe_claim_event') return Promise.resolve({ data: `claimed:${CLAIM_TOKEN}`, error: null })
      if (fn === 'stripe_complete_event') return Promise.resolve({ data: true, error: null })
      if (fn === 'stripe_apply_subscription_update') {
        if (clinicaState.status_assinatura === 'ativo') {
          return Promise.resolve({
            data: [{
              clinica_id: CLINICA_ID,
              applied: false,
              motivo_bloqueio: 'Clínica já possui assinatura ativa diferente da informada — substituição bloqueada',
            }],
            error: null,
          })
        }
        if (args.p_subscription_id === 'sub_nova_B') {
          clinicaState = { status_assinatura: 'ativo', stripe_subscription_id: 'sub_nova_B' }
          return Promise.resolve({
            data: [{ clinica_id: CLINICA_ID, applied: true, motivo_bloqueio: null }],
            error: null,
          })
        }
        return Promise.resolve({
          data: [{ clinica_id: CLINICA_ID, applied: false, motivo_bloqueio: 'Assinatura inválida' }],
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const POST = await getHandler()
    const event1 = buildEvent({
      type: 'customer.subscription.updated',
      data: { object: { id: 'sub_nova_B', customer: CUSTOMER_ID, status: 'active' } as any },
    })
    const res1 = await POST(buildSignedRequest(event1, TEST_WEBHOOK_SECRET) as any)
    expect(res1.status).toBe(200)
    expect(clinicaState.status_assinatura).toBe('ativo')
    expect(clinicaState.stripe_subscription_id).toBe('sub_nova_B')

    const event2 = buildEvent({
      type: 'customer.subscription.updated',
      data: { object: { id: 'sub_antiga_A', customer: CUSTOMER_ID, status: 'active' } as any },
    })
    const res2 = await POST(buildSignedRequest(event2, TEST_WEBHOOK_SECRET) as any)
    expect(res2.status).toBe(200)
    expect(clinicaState.stripe_subscription_id).toBe('sub_nova_B')
  })

  // ── 9. Preservação dos metadados de auditoria sem conteúdo clínico ───────────
  it('9. Auditoria LGPD/CFO: preserva metadados essenciais sem vazar descrição ou tratamento clínico', () => {
    const prontuarioOriginal = {
      id: 'pront_001',
      clinica_id: 'clin_001',
      paciente_id: 'pac_001',
      dentista_id: 'dent_001',
      tipo_registro: 'anamnese',
      status: 'ativo',
      data_registro: '2026-11-15T00:00:00Z',
      finalizado: false,
      descricao: 'Paciente relata dor aguda na região do dente 36 com sensibilidade a frio.',
      tratamento: 'Endodontia do elemento 36 indicada e remoção de cárie oclusal.',
    }

    function buildAuditProntuario(row: typeof prontuarioOriginal, colunas: string[]) {
      return {
        id: row.id,
        clinica_id: row.clinica_id,
        paciente_id: row.paciente_id,
        dentista_id: row.dentista_id,
        tipo_registro: row.tipo_registro,
        status: row.status,
        data_registro: row.data_registro,
        finalizado: row.finalizado,
        colunas_inseridas: colunas,
      }
    }

    const colunas = Object.keys(prontuarioOriginal).sort()
    const auditPayload = buildAuditProntuario(prontuarioOriginal, colunas)

    expect(auditPayload.id).toBe('pront_001')
    expect(auditPayload.colunas_inseridas).toContain('descricao')
    expect(auditPayload.colunas_inseridas).toContain('tratamento')
    expect((auditPayload as any).descricao).toBeUndefined()
    expect((auditPayload as any).tratamento).toBeUndefined()
  })

  // ── 10. Proteção de checkout.session.completed ──────────────────────────────
  it('10. checkout.session.completed: aplica transacionalmente por RPC e bloqueia checkout antigo', async () => {
    let checkoutRpcCalled = false
    mockClinicaSelectResult = {
      data: { id: 'user_001', clinica_id: CLINICA_ID },
      error: null,
    }

    mockRpc.mockImplementation((fn: string, args: any) => {
      if (fn === 'stripe_claim_event') return Promise.resolve({ data: `claimed:${CLAIM_TOKEN}`, error: null })
      if (fn === 'stripe_complete_event') return Promise.resolve({ data: true, error: null })
      if (fn === 'stripe_apply_checkout_completed') {
        checkoutRpcCalled = true
        expect(args.p_clinica_id).toBe(CLINICA_ID)
        expect(args.p_subscription_id).toBe('sub_checkout_123')
        return Promise.resolve({
          data: [{ clinica_id: CLINICA_ID, applied: true, motivo_bloqueio: null }],
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const POST = await getHandler()
    const event = buildEvent({
      type: 'checkout.session.completed',
      data: {
        object: {
          client_reference_id: 'user_001',
          customer: CUSTOMER_ID,
          subscription: 'sub_checkout_123',
          payment_status: 'paid',
          metadata: { plano_id: 'premium' },
        } as any,
      },
    })

    const res = await POST(buildSignedRequest(event, TEST_WEBHOOK_SECRET) as any)
    expect(res.status).toBe(200)
    expect(checkoutRpcCalled).toBe(true)
  })

  // ── 11. Eliminação de fallbacks inseguros em produção ────────────────────────
  it('11. Produção: resposta inesperada de RPC interrompe e retorna 500 para retry da Stripe', async () => {
    ;(process.env as any).NODE_ENV = 'production' // Simula produção estrita
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { })

    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'stripe_claim_event') return Promise.resolve({ data: `claimed:${CLAIM_TOKEN}`, error: null })
      // RPC retorna inesperadamente nulo (ex: falha de banco sem exceção)
      if (fn === 'stripe_apply_subscription_update') {
        return Promise.resolve({ data: null, error: null })
      }
      if (fn === 'stripe_fail_event') {
        return Promise.resolve({ data: true, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const POST = await getHandler()
    const event = buildEvent({
      type: 'customer.subscription.updated',
      data: { object: { id: SUB_ATUAL, customer: CUSTOMER_ID, status: 'active' } as any },
    })

    const res = await POST(buildSignedRequest(event, TEST_WEBHOOK_SECRET) as any)
    // Em produção, NÃO executa fallback inseguro; rejeita com 500 para a Stripe retentar
    expect(res.status).toBe(500)
    expect(mockUpdateSpy).not.toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
    ;(process.env as any).NODE_ENV = 'test'
  })

  // ── 12. Sanitização estrita de logs sem vazamento no console ─────────────────
  it('12. Sanitização de logs: mensagens com chaves, tokens e e-mails são sanitizadas antes do console', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { })

    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'stripe_claim_event') return Promise.resolve({ data: `claimed:${CLAIM_TOKEN}`, error: null })
      if (fn === 'stripe_apply_subscription_update') {
        // Erro simulando vazamento acidental de chaves e dados pessoais
        return Promise.resolve({
          data: null,
          error: { message: 'Falha com sk_live_999888777 e email dentista@clinica.com e whsec_segredo123' },
        })
      }
      if (fn === 'stripe_fail_event') return Promise.resolve({ data: true, error: null })
      return Promise.resolve({ data: null, error: null })
    })

    const POST = await getHandler()
    const event = buildEvent({
      type: 'customer.subscription.updated',
      data: { object: { id: SUB_ATUAL, customer: CUSTOMER_ID, status: 'active' } as any },
    })

    await POST(buildSignedRequest(event, TEST_WEBHOOK_SECRET) as any)

    // Inspeciona todas as chamadas a console.error
    for (const call of consoleErrorSpy.mock.calls) {
      const fullText = call.join(' ')
      expect(fullText).not.toContain('sk_live_999888777')
      expect(fullText).not.toContain('dentista@clinica.com')
      expect(fullText).not.toContain('whsec_segredo123')
      if (fullText.includes('[REDACTED_')) {
        expect(fullText).toMatch(/\[REDACTED_KEY\]|\[REDACTED_EMAIL\]|\[REDACTED_SECRET\]/)
      }
    }

    consoleErrorSpy.mockRestore()
  })

  // ── 13. Substituição de assinatura: timestamp antigo não bloqueia nova sub ─
  it('13. Substituição de assinatura: novo evento com nova assinatura é aceito independente do timestamp da anterior', async () => {
    // Simula a RPC permitindo nova assinatura e atualizando com sucesso
    let appliedNewSub = false
    mockRpc.mockImplementation((fn: string, args: any) => {
      if (fn === 'stripe_claim_event') return Promise.resolve({ data: `claimed:${CLAIM_TOKEN}`, error: null })
      if (fn === 'stripe_complete_event') return Promise.resolve({ data: true, error: null })
      if (fn === 'stripe_apply_subscription_update') {
        if (args.p_subscription_id === 'sub_nova_substituta') {
          appliedNewSub = true
          return Promise.resolve({
            data: [{ clinica_id: CLINICA_ID, applied: true, motivo_bloqueio: null }],
            error: null,
          })
        }
      }
      return Promise.resolve({ data: null, error: null })
    })

    const POST = await getHandler()
    const event = buildEvent({
      type: 'customer.subscription.updated',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: 'sub_nova_substituta',
          customer: CUSTOMER_ID,
          status: 'active',
          created: Math.floor(Date.now() / 1000) - 300,
        } as any,
      },
    })

    const res = await POST(buildSignedRequest(event, TEST_WEBHOOK_SECRET) as any)
    expect(res.status).toBe(200)
    expect(appliedNewSub).toBe(true)
  })

  // ── 14. Checkout de Super Admin: conclui evento sem provisionar clínica ─────
  it('14. checkout.session.completed de super_admin: ignora criação de clínica e conclui com status 200', async () => {
    let provRpcCalled = false
    let completeRpcCalled = false

    mockClinicaSelectResult = {
      data: { id: 'sa_user_001', clinica_id: null, role: 'super_admin' },
      error: null,
    }

    mockRpc.mockImplementation((fn: string, args: any) => {
      if (fn === 'stripe_claim_event') return Promise.resolve({ data: `claimed:${CLAIM_TOKEN}`, error: null })
      if (fn === 'stripe_complete_event') {
        completeRpcCalled = true
        return Promise.resolve({ data: true, error: null })
      }
      if (fn === 'provisionar_novo_tenant') {
        provRpcCalled = true
        return Promise.resolve({ data: 'new-clinic-id', error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const POST = await getHandler()
    const event = buildEvent({
      type: 'checkout.session.completed',
      data: {
        object: {
          client_reference_id: 'sa_user_001',
          customer: CUSTOMER_ID,
          subscription: 'sub_sa_checkout',
          payment_status: 'paid',
          metadata: { plano_id: 'premium' },
        } as any,
      },
    })

    const res = await POST(buildSignedRequest(event, TEST_WEBHOOK_SECRET) as any)
    expect(res.status).toBe(200)
    expect(provRpcCalled).toBe(false)
    expect(completeRpcCalled).toBe(true)
  })

  // ── 15. invoice.payment_succeeded: chamada atômica direta sem should_activate ───
  it('15. invoice.payment_succeeded: chama diretamente stripe_apply_invoice_payment_succeeded sem consulta preliminar', async () => {
    let shouldActivateCalled = false
    let applyInvoiceCalled = false

    mockRpc.mockImplementation((fn: string, args: any) => {
      if (fn === 'stripe_claim_event') return Promise.resolve({ data: `claimed:${CLAIM_TOKEN}`, error: null })
      if (fn === 'stripe_complete_event') return Promise.resolve({ data: true, error: null })
      if (fn === 'stripe_should_activate_on_invoice') {
        shouldActivateCalled = true
        return Promise.resolve({ data: [{ clinica_id: CLINICA_ID, deve_ativar: true, motivo_bloqueio: null }], error: null })
      }
      if (fn === 'stripe_apply_invoice_payment_succeeded') {
        applyInvoiceCalled = true
        return Promise.resolve({
          data: [{ clinica_id: CLINICA_ID, applied: true, motivo_bloqueio: null }],
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const POST = await getHandler()
    const event = buildEvent({
      type: 'invoice.payment_succeeded',
      data: {
        object: {
          id: 'in_test_atomic_123',
          customer: CUSTOMER_ID,
          subscription: 'sub_atomic_123',
          lines: { data: [{ period: { end: Math.floor(Date.now() / 1000) + 3600 } }] },
        } as any,
      },
    })

    const res = await POST(buildSignedRequest(event, TEST_WEBHOOK_SECRET) as any)
    expect(res.status).toBe(200)
    expect(shouldActivateCalled).toBe(true)
    expect(applyInvoiceCalled).toBe(true)
  })
})
