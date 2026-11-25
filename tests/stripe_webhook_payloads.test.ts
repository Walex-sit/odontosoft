/**
 * tests/stripe_webhook_payloads.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Testes Unitários e de Integração:
 *  1. Helpers getInvoiceSubscriptionId e getSubscriptionPeriodEnd (antigo e Basil).
 *  2. customer.subscription.updated com status não mapeados (incomplete, paused).
 *  3. checkout.session.completed com validação estrita de payment_status.
 *  4. Sanitização de chaves restritas (rk_*), segredos Supabase (sb_secret_*) e JWTs (eyJ*).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import Stripe from 'stripe'
import {
  getInvoiceSubscriptionId,
  getSubscriptionPeriodEnd,
  sanitizeLogMessage,
} from '@/app/api/webhooks/payment/route'

const TEST_WEBHOOK_SECRET = 'whsec_test_secret_revisao_staging_2026'
process.env.STRIPE_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET
;(process.env as any).NODE_ENV = 'test'
const CLAIM_TOKEN = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
const CLINICA_ID = 'c1111111-2222-3333-4444-555555555555'
const CUSTOMER_ID = 'cus_test_123456789'

const { mockRpc, state } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  state: {
    mockClinicaSelectResult: { data: null, error: null } as any,
    mockClinicaUpdateResult: { data: null, error: null } as any,
  },
}))

vi.mock('@/app/lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    rpc: mockRpc,
    from: vi.fn(() => {
      const builder: any = {
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockImplementation(() => Promise.resolve(state.mockClinicaSelectResult)),
        single: vi.fn().mockImplementation(() => Promise.resolve(state.mockClinicaSelectResult)),
      }
      builder.then = (resolve: any, reject: any) => {
        return Promise.resolve(state.mockClinicaUpdateResult).then(resolve, reject)
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

function buildSignedRequest(payload: object, secret: string): Request {
  const body = JSON.stringify(payload)
  const header = Stripe.webhooks.generateTestHeaderString({ payload: body, secret })
  return new Request('http://localhost/api/webhooks/payment', {
    method: 'POST',
    headers: { 'stripe-signature': header, 'content-type': 'application/json' },
    body,
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

describe('1. Helpers de Extração de Assinatura e Período (Payloads Antigo e Basil)', () => {
  describe('getInvoiceSubscriptionId', () => {
    it('Formato legado: lê subscription como string', () => {
      const invoice = { subscription: 'sub_legado_string_123' }
      expect(getInvoiceSubscriptionId(invoice)).toBe('sub_legado_string_123')
    })

    it('Formato legado: lê subscription como objeto { id }', () => {
      const invoice = { subscription: { id: 'sub_legado_obj_456' } }
      expect(getInvoiceSubscriptionId(invoice)).toBe('sub_legado_obj_456')
    })

    it('Formato Basil: lê parent.subscription_details.subscription como string (conferindo parent.type)', () => {
      const invoice = {
        parent: {
          type: 'subscription_details',
          subscription_details: {
            subscription: 'sub_basil_string_789',
          },
        },
      }
      expect(getInvoiceSubscriptionId(invoice)).toBe('sub_basil_string_789')
    })

    it('Formato Basil: lê parent.subscription_details.subscription como objeto { id }', () => {
      const invoice = {
        parent: {
          type: 'subscription_details',
          subscription_details: {
            subscription: { id: 'sub_basil_obj_999' },
          },
        },
      }
      expect(getInvoiceSubscriptionId(invoice)).toBe('sub_basil_obj_999')
    })

    it('Formato Basil com parent.type diferente faz fallback para invoice.subscription', () => {
      const invoice = {
        parent: {
          type: 'customer_balance_transaction',
          subscription_details: { subscription: 'sub_ignorado' },
        },
        subscription: 'sub_fallback_123',
      }
      expect(getInvoiceSubscriptionId(invoice)).toBe('sub_fallback_123')
    })

    it('Retorna null quando ausente em ambos', () => {
      expect(getInvoiceSubscriptionId({})).toBeNull()
      expect(getInvoiceSubscriptionId(null)).toBeNull()
    })
  })

  describe('getSubscriptionPeriodEnd', () => {
    it('Formato Basil: lê items.data[0].current_period_end', () => {
      const sub = {
        items: {
          data: [{ current_period_end: 1770000000 }],
        },
      }
      expect(getSubscriptionPeriodEnd(sub)).toBe(new Date(1770000000 * 1000).toISOString())
    })

    it('Formato legado: lê current_period_end na raiz', () => {
      const sub = {
        current_period_end: 1760000000,
      }
      expect(getSubscriptionPeriodEnd(sub)).toBe(new Date(1760000000 * 1000).toISOString())
    })

    it('Prioriza items.data[0].current_period_end sobre current_period_end legado', () => {
      const sub = {
        current_period_end: 1760000000,
        items: {
          data: [{ current_period_end: 1780000000 }],
        },
      }
      expect(getSubscriptionPeriodEnd(sub)).toBe(new Date(1780000000 * 1000).toISOString())
    })

    it('Compatibilidade com Invoice lines.data[0].period.end', () => {
      const invoice = {
        lines: {
          data: [{ period: { end: 1775000000 } }],
        },
      }
      expect(getSubscriptionPeriodEnd(invoice)).toBe(new Date(1775000000 * 1000).toISOString())
    })

    it('Retorna null quando ausente', () => {
      expect(getSubscriptionPeriodEnd({})).toBeNull()
      expect(getSubscriptionPeriodEnd(null)).toBeNull()
    })
  })
})

describe('2. customer.subscription.updated (Status não mapeados e Formatos)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.mockClinicaSelectResult = { data: null, error: null }
  })

  it('Status "incomplete" não ativa nem altera a clínica (registra e encerra sem aplicar)', async () => {
    let applySubRpcCalled = false

    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'stripe_claim_event') return Promise.resolve({ data: `claimed:${CLAIM_TOKEN}`, error: null })
      if (fn === 'stripe_complete_event') return Promise.resolve({ data: true, error: null })
      if (fn === 'stripe_apply_subscription_update') {
        applySubRpcCalled = true
        return Promise.resolve({ data: [{ clinica_id: CLINICA_ID, applied: true }], error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const POST = await getHandler()
    const event = buildEvent({
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_incomplete_123',
          customer: CUSTOMER_ID,
          status: 'incomplete', // Status não mapeado!
          current_period_end: 1760000000,
        } as any,
      },
    })

    const res = await POST(buildSignedRequest(event, TEST_WEBHOOK_SECRET) as any)
    expect(res.status).toBe(200)
    expect(applySubRpcCalled).toBe(false) // Não deve aplicar!
  })

  it('Status "paused" não ativa a clínica (registra e encerra sem aplicar)', async () => {
    let applySubRpcCalled = false

    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'stripe_claim_event') return Promise.resolve({ data: `claimed:${CLAIM_TOKEN}`, error: null })
      if (fn === 'stripe_complete_event') return Promise.resolve({ data: true, error: null })
      if (fn === 'stripe_apply_subscription_update') {
        applySubRpcCalled = true
        return Promise.resolve({ data: [{ clinica_id: CLINICA_ID, applied: true }], error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const POST = await getHandler()
    const event = buildEvent({
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_paused_123',
          customer: CUSTOMER_ID,
          status: 'paused', // Status não mapeado!
          current_period_end: 1760000000,
        } as any,
      },
    })

    const res = await POST(buildSignedRequest(event, TEST_WEBHOOK_SECRET) as any)
    expect(res.status).toBe(200)
    expect(applySubRpcCalled).toBe(false)
  })

  it('Status mapeado "active" com payload formato Basil: aplica com período correto', async () => {
    let passedStatus: string | null = null
    let passedPeriodEnd: string | null = null

    mockRpc.mockImplementation((fn: string, args: any) => {
      if (fn === 'stripe_claim_event') return Promise.resolve({ data: `claimed:${CLAIM_TOKEN}`, error: null })
      if (fn === 'stripe_complete_event') return Promise.resolve({ data: true, error: null })
      if (fn === 'stripe_apply_subscription_update') {
        passedStatus = args.p_status
        passedPeriodEnd = args.p_period_end
        return Promise.resolve({ data: [{ clinica_id: CLINICA_ID, applied: true, motivo_bloqueio: null }], error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const POST = await getHandler()
    const expectedPeriodEnd = new Date(1779999999 * 1000).toISOString()
    const event = buildEvent({
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_basil_active_123',
          customer: CUSTOMER_ID,
          status: 'active',
          items: {
            data: [{ current_period_end: 1779999999 }],
          },
        } as any,
      },
    })

    const res = await POST(buildSignedRequest(event, TEST_WEBHOOK_SECRET) as any)
    expect(res.status).toBe(200)
    expect(passedStatus).toBe('ativo')
    expect(passedPeriodEnd).toBe(expectedPeriodEnd)
  })
})

describe('3. checkout.session.completed (Validação estrita de payment_status)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.mockClinicaSelectResult = {
      data: { id: 'user_checkout_001', clinica_id: CLINICA_ID },
      error: null,
    }
  })

  it('Aplica checkout quando payment_status for "paid"', async () => {
    let checkoutRpcCalled = false

    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'stripe_claim_event') return Promise.resolve({ data: `claimed:${CLAIM_TOKEN}`, error: null })
      if (fn === 'stripe_complete_event') return Promise.resolve({ data: true, error: null })
      if (fn === 'stripe_apply_checkout_completed') {
        checkoutRpcCalled = true
        return Promise.resolve({ data: [{ clinica_id: CLINICA_ID, applied: true, motivo_bloqueio: null }], error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const POST = await getHandler()
    const event = buildEvent({
      type: 'checkout.session.completed',
      data: {
        object: {
          client_reference_id: 'user_checkout_001',
          customer: CUSTOMER_ID,
          subscription: 'sub_paid_checkout',
          payment_status: 'paid',
          metadata: { plano_id: 'premium' },
        } as any,
      },
    })

    const res = await POST(buildSignedRequest(event, TEST_WEBHOOK_SECRET) as any)
    expect(res.status).toBe(200)
    expect(checkoutRpcCalled).toBe(true)
  })

  it('Aplica checkout quando payment_status for "no_payment_required"', async () => {
    let checkoutRpcCalled = false

    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'stripe_claim_event') return Promise.resolve({ data: `claimed:${CLAIM_TOKEN}`, error: null })
      if (fn === 'stripe_complete_event') return Promise.resolve({ data: true, error: null })
      if (fn === 'stripe_apply_checkout_completed') {
        checkoutRpcCalled = true
        return Promise.resolve({ data: [{ clinica_id: CLINICA_ID, applied: true, motivo_bloqueio: null }], error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const POST = await getHandler()
    const event = buildEvent({
      type: 'checkout.session.completed',
      data: {
        object: {
          client_reference_id: 'user_checkout_001',
          customer: CUSTOMER_ID,
          subscription: 'sub_trial_checkout',
          payment_status: 'no_payment_required',
          metadata: { plano_id: 'essencial' },
        } as any,
      },
    })

    const res = await POST(buildSignedRequest(event, TEST_WEBHOOK_SECRET) as any)
    expect(res.status).toBe(200)
    expect(checkoutRpcCalled).toBe(true)
  })

  it('NÃO aplica checkout quando payment_status for "unpaid" (registra e encerra)', async () => {
    let checkoutRpcCalled = false

    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'stripe_claim_event') return Promise.resolve({ data: `claimed:${CLAIM_TOKEN}`, error: null })
      if (fn === 'stripe_complete_event') return Promise.resolve({ data: true, error: null })
      if (fn === 'stripe_apply_checkout_completed') {
        checkoutRpcCalled = true
        return Promise.resolve({ data: [{ clinica_id: CLINICA_ID, applied: true }], error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const POST = await getHandler()
    const event = buildEvent({
      type: 'checkout.session.completed',
      data: {
        object: {
          client_reference_id: 'user_checkout_001',
          customer: CUSTOMER_ID,
          subscription: 'sub_unpaid_checkout',
          payment_status: 'unpaid',
          metadata: { plano_id: 'premium' },
        } as any,
      },
    })

    const res = await POST(buildSignedRequest(event, TEST_WEBHOOK_SECRET) as any)
    expect(res.status).toBe(200)
    expect(checkoutRpcCalled).toBe(false)
  })

  it('NÃO aplica checkout quando payment_status estiver ausente', async () => {
    let checkoutRpcCalled = false

    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'stripe_claim_event') return Promise.resolve({ data: `claimed:${CLAIM_TOKEN}`, error: null })
      if (fn === 'stripe_complete_event') return Promise.resolve({ data: true, error: null })
      if (fn === 'stripe_apply_checkout_completed') {
        checkoutRpcCalled = true
        return Promise.resolve({ data: [{ clinica_id: CLINICA_ID, applied: true }], error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const POST = await getHandler()
    const event = buildEvent({
      type: 'checkout.session.completed',
      data: {
        object: {
          client_reference_id: 'user_checkout_001',
          customer: CUSTOMER_ID,
          subscription: 'sub_missing_status',
        } as any,
      },
    })

    const res = await POST(buildSignedRequest(event, TEST_WEBHOOK_SECRET) as any)
    expect(res.status).toBe(200)
    expect(checkoutRpcCalled).toBe(false)
  })
})

describe('4. invoice.payment_succeeded e invoice.payment_failed (Payloads Basil e Legado)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('invoice.payment_succeeded com payload Basil (parent.subscription_details)', async () => {
    let passedSubId: string | null = null

    mockRpc.mockImplementation((fn: string, args: any) => {
      if (fn === 'stripe_claim_event') return Promise.resolve({ data: `claimed:${CLAIM_TOKEN}`, error: null })
      if (fn === 'stripe_complete_event') return Promise.resolve({ data: true, error: null })
      if (fn === 'stripe_should_activate_on_invoice') {
        passedSubId = args.p_subscription_id
        return Promise.resolve({ data: [{ clinica_id: CLINICA_ID, deve_ativar: true, motivo_bloqueio: null }], error: null })
      }
      if (fn === 'stripe_apply_invoice_payment_succeeded') {
        return Promise.resolve({ data: [{ clinica_id: CLINICA_ID, applied: true, motivo_bloqueio: null }], error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const POST = await getHandler()
    const event = buildEvent({
      type: 'invoice.payment_succeeded',
      data: {
        object: {
          id: 'in_basil_success_123',
          customer: CUSTOMER_ID,
          parent: {
            type: 'subscription_details',
            subscription_details: {
              subscription: 'sub_basil_invoice_id',
            },
          },
          items: {
            data: [{ current_period_end: 1788888888 }],
          },
        } as any,
      },
    })

    const res = await POST(buildSignedRequest(event, TEST_WEBHOOK_SECRET) as any)
    expect(res.status).toBe(200)
    expect(passedSubId).toBe('sub_basil_invoice_id')
  })

  it('invoice.payment_failed com payload Basil (parent.subscription_details)', async () => {
    let passedSubId: string | null = null

    mockRpc.mockImplementation((fn: string, args: any) => {
      if (fn === 'stripe_claim_event') return Promise.resolve({ data: `claimed:${CLAIM_TOKEN}`, error: null })
      if (fn === 'stripe_complete_event') return Promise.resolve({ data: true, error: null })
      if (fn === 'stripe_apply_invoice_payment_failed') {
        passedSubId = args.p_subscription_id
        return Promise.resolve({ data: [{ clinica_id: CLINICA_ID, applied: true, motivo_bloqueio: null }], error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const POST = await getHandler()
    const event = buildEvent({
      type: 'invoice.payment_failed',
      data: {
        object: {
          id: 'in_basil_failed_123',
          customer: CUSTOMER_ID,
          parent: {
            type: 'subscription_details',
            subscription_details: {
              subscription: { id: 'sub_basil_failed_id' },
            },
          },
        } as any,
      },
    })

    const res = await POST(buildSignedRequest(event, TEST_WEBHOOK_SECRET) as any)
    expect(res.status).toBe(200)
    expect(passedSubId).toBe('sub_basil_failed_id')
  })
})

describe('5. Sanitização de Mensagens (sanitizeLogMessage)', () => {
  it('Redige chaves restritas rk_live e rk_test', () => {
    const raw = 'Erro com chave restrita: rk_live_51P0AbCdEfGhIjKlMnOp e rk_test_99XyZ'
    const clean = sanitizeLogMessage(raw)
    expect(clean).toContain('[REDACTED_KEY]')
    expect(clean).not.toContain('rk_live_')
    expect(clean).not.toContain('rk_test_')
  })

  it('Redige chaves sb_secret_', () => {
    const raw = 'Tentativa com sb_secret_production_key_abcdef12345'
    const clean = sanitizeLogMessage(raw)
    expect(clean).toContain('[REDACTED_SECRET]')
    expect(clean).not.toContain('sb_secret_')
  })

  it('Redige tokens JWT eyJ...', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
    const raw = `Falha na requisição com token: ${jwt}`
    const clean = sanitizeLogMessage(raw)
    expect(clean).toContain('[REDACTED_JWT]')
    expect(clean).not.toContain('eyJhbGci')
  })
})
