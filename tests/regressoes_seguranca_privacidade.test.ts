/**
 * tests/regressoes_seguranca_privacidade.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Bateria de Testes de Regressão Obrigatórios:
 *  1. Claim nulo ou desconhecido -> Interrompe processamento e retorna HTTP 500.
 *  2. RPC de validação temporal retornando erro -> Interrompe e retorna HTTP 500 sem silenciar.
 *  3. Worker sem token válido -> Interrompe com HTTP 500 e bloqueia mutações.
 *  4. Assinatura antiga com evento recebido depois do cancelamento -> Bloqueada.
 *  5. Assinatura realmente nova criada após cancelamento -> Reativação autorizada.
 *  6. Logs de prontuário sem conteúdo clínico -> Sem duplicação de dados sensíveis.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import Stripe from 'stripe'
import { randomUUID } from 'crypto'

const TEST_WEBHOOK_SECRET = 'whsec_regressoes_seguranca_2026'

const mockRpc = vi.fn()
const mockUpdate = vi.fn().mockReturnThis()
const mockInsert = vi.fn().mockReturnThis()
const mockSelect = vi.fn().mockReturnThis()
const mockEq = vi.fn().mockReturnThis()
const mockOr = vi.fn().mockReturnThis()
const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })

vi.mock('@/app/lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    rpc: mockRpc,
    from: vi.fn(() => ({
      select: mockSelect,
      update: mockUpdate,
      insert: mockInsert,
      eq: mockEq,
      or: mockOr,
      maybeSingle: mockMaybeSingle,
    })),
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

function buildSignedRequest(payload: object, secret: string = TEST_WEBHOOK_SECRET): Request {
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
    id: `evt_test_${randomUUID()}`,
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

describe('Regressões Obrigatórias — Reserva Obrigatória e Ordenação Stripe', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET
  })

  // ── 1. Claim Nulo ou Desconhecido ──────────────────────────────────────────
  it('1.1 Interrompe e retorna HTTP 500 se claimStatus for nulo', async () => {
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'stripe_claim_event') return Promise.resolve({ data: null, error: null })
      return Promise.resolve({ data: null, error: null })
    })

    const POST = await getHandler()
    const event = buildEvent()
    const req = buildSignedRequest(event)
    const res = await POST(req as any)

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toMatch(/reserva|estado/i)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('1.2 Interrompe e retorna HTTP 500 se claimStatus for desconhecido / inesperado', async () => {
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'stripe_claim_event') return Promise.resolve({ data: 'unexpected_state_xyz', error: null })
      return Promise.resolve({ data: null, error: null })
    })

    const POST = await getHandler()
    const event = buildEvent()
    const req = buildSignedRequest(event)
    const res = await POST(req as any)

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toMatch(/reserva|estado/i)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  // ── 2. Worker sem Token Válido ─────────────────────────────────────────────
  it('2.1 Interrompe e retorna HTTP 500 se token do claim não for um UUID válido', async () => {
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'stripe_claim_event') return Promise.resolve({ data: 'claimed:not-a-valid-uuid', error: null })
      return Promise.resolve({ data: null, error: null })
    })

    const POST = await getHandler()
    const event = buildEvent()
    const req = buildSignedRequest(event)
    const res = await POST(req as any)

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toMatch(/token/i)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  // ── 3. RPC de Validação Temporal Retornando Erro ───────────────────────────
  it('3.1 Interrompe e retorna HTTP 500 quando stripe_should_activate_on_invoice retorna erro', async () => {
    const VALID_TOKEN = randomUUID()
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'stripe_claim_event') return Promise.resolve({ data: `claimed:${VALID_TOKEN}`, error: null })
      if (fn === 'stripe_should_activate_on_invoice') {
        return Promise.resolve({ data: null, error: { message: 'Database connection failure in temporal RPC' } })
      }
      if (fn === 'stripe_fail_event') return Promise.resolve({ data: true, error: null })
      return Promise.resolve({ data: null, error: null })
    })

    const POST = await getHandler()
    const event = buildEvent({
      type: 'invoice.payment_succeeded',
      data: {
        object: {
          id: 'in_12345',
          subscription: 'sub_12345',
          customer: 'cus_12345',
        } as any,
      },
    })

    const req = buildSignedRequest(event)
    const res = await POST(req as any)

    expect(res.status).toBe(500)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  // ── 4. Assinatura Antiga com Evento Recebido Depois do Cancelamento ─────────
  it('4.1 Bloqueia assinatura antiga com evento customer.subscription.updated recebido pós-cancelamento', async () => {
    const VALID_TOKEN = randomUUID()
    const canceladoEm = new Date(Date.now() - 3600 * 1000).toISOString() // Cancelado há 1h
    const subAntigaCreatedEpoch = Math.floor(Date.now() / 1000) - 7200 // Criada há 2h (antes do cancelamento)
    const eventoCreatedEpoch = Math.floor(Date.now() / 1000) // Evento gerado AGORA (depois do cancelamento)

    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'stripe_claim_event') return Promise.resolve({ data: `claimed:${VALID_TOKEN}`, error: null })
      if (fn === 'stripe_complete_event') return Promise.resolve({ data: true, error: null })
      return Promise.resolve({ data: null, error: null })
    })

    mockMaybeSingle.mockResolvedValue({
      data: {
        id: 'clinica_001',
        status_assinatura: 'cancelado',
        stripe_subscription_id: 'sub_antiga',
        cancelamento_em: canceladoEm,
      },
      error: null,
    })

    const POST = await getHandler()
    const event = buildEvent({
      type: 'customer.subscription.updated',
      created: eventoCreatedEpoch,
      data: {
        object: {
          id: 'sub_antiga',
          customer: 'cus_001',
          status: 'active',
          created: subAntigaCreatedEpoch,
          current_period_end: Math.floor(Date.now() / 1000) + 86400,
        } as any,
      },
    })

    const req = buildSignedRequest(event)
    const res = await POST(req as any)

    expect(res.status).toBe(200)
    // Não deve realizar update para reativar
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  // ── 5. Assinatura Realmente Nova Criada Após Cancelamento ───────────────────
  it('5.1 Permite reativação exclusivamente quando subscription.created for posterior ao cancelamento', async () => {
    const VALID_TOKEN = randomUUID()
    const canceladoEm = new Date(Date.now() - 3600 * 1000).toISOString() // Cancelado há 1h
    const subNovaCreatedEpoch = Math.floor(Date.now() / 1000) - 600 // Criada há 10 minutos (DEPOIS do cancelamento!)

    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'stripe_claim_event') return Promise.resolve({ data: `claimed:${VALID_TOKEN}`, error: null })
      if (fn === 'stripe_complete_event') return Promise.resolve({ data: true, error: null })
      return Promise.resolve({ data: null, error: null })
    })

    mockMaybeSingle.mockResolvedValue({
      data: {
        id: 'clinica_001',
        status_assinatura: 'cancelado',
        stripe_subscription_id: 'sub_antiga',
        cancelamento_em: canceladoEm,
      },
      error: null,
    })

    const POST = await getHandler()
    const event = buildEvent({
      type: 'customer.subscription.updated',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: 'sub_nova_legitima',
          customer: 'cus_001',
          status: 'active',
          created: subNovaCreatedEpoch,
          current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
        } as any,
      },
    })

    const req = buildSignedRequest(event)
    const res = await POST(req as any)

    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status_assinatura: 'ativo',
        ativo: true,
        cancelamento_em: null,
      })
    )
  })

  // ── 6. Problema 1: Assinatura A cancelada, B criada e ativada, evento atrasado de A ─
  it('6.1 Assinatura A cancelada, B criada e ativada: evento atrasado de fatura de A é bloqueado', async () => {
    const VALID_TOKEN = randomUUID()
    const CLINICA_ID = randomUUID()
    const canceladoEm = new Date(Date.now() - 3600 * 1000).toISOString() // cancelada há 1h
    const subACreated = new Date(Date.now() - 7200 * 1000).toISOString() // sub_A criada há 2h

    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'stripe_claim_event') return Promise.resolve({ data: `claimed:${VALID_TOKEN}`, error: null })
      if (fn === 'stripe_complete_event') return Promise.resolve({ data: true, error: null })
      if (fn === 'stripe_should_activate_on_invoice') {
        // RPC bloqueia porque a clínica já está ativa com B e A é sub antiga
        return Promise.resolve({
          data: [{ clinica_id: CLINICA_ID, deve_ativar: false, motivo_bloqueio: 'Clínica já possui assinatura ativa diferente' }],
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
          id: 'in_atrasada_A',
          subscription: {
            id: 'sub_A',
            created: Math.floor(new Date(subACreated).getTime() / 1000),
          },
          customer: 'cus_cliente_123',
        } as any,
      },
    })

    const req = buildSignedRequest(event)
    const res = await POST(req as any)

    expect(res.status).toBe(200)
    // Nenhuma mutação na clínica
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  // ── 7. Problema 1: Evento customer.subscription.updated antigo após reativação com B ─
  it('7.1 Evento customer.subscription.updated antigo de A após reativação com B não altera nada', async () => {
    const VALID_TOKEN = randomUUID()
    const CLINICA_ID = randomUUID()
    const canceladoEm = new Date(Date.now() - 3600 * 1000).toISOString() // cancelada há 1h
    const subACreatedEpoch = Math.floor(Date.now() / 1000) - 7200 // sub A criada há 2h

    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'stripe_claim_event') return Promise.resolve({ data: `claimed:${VALID_TOKEN}`, error: null })
      if (fn === 'stripe_complete_event') return Promise.resolve({ data: true, error: null })
      return Promise.resolve({ data: null, error: null })
    })

    // Clínica no banco está ATIVA com a nova assinatura B!
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: CLINICA_ID,
        status_assinatura: 'ativo',
        stripe_subscription_id: 'sub_B',
        cancelamento_em: null,
      },
      error: null,
    })

    const POST = await getHandler()
    // Chega evento atrasado da assinatura antiga A
    const event = buildEvent({
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_A',
          customer: 'cus_cliente_123',
          status: 'active',
          created: subACreatedEpoch,
          current_period_end: Math.floor(Date.now() / 1000) + 86400,
        } as any,
      },
    })

    const req = buildSignedRequest(event)
    const res = await POST(req as any)

    expect(res.status).toBe(200)
    // Nenhuma alteração no status, período ou stripe_subscription_id
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  // ── 8. Problema 2: RPC com resultado vazio (zero linhas) ───────────────────
  it('8.1 Interrompe e retorna HTTP 500 quando RPC retorna zero linhas', async () => {
    const VALID_TOKEN = randomUUID()
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'stripe_claim_event') return Promise.resolve({ data: `claimed:${VALID_TOKEN}`, error: null })
      if (fn === 'stripe_should_activate_on_invoice') {
        return Promise.resolve({ data: [], error: null }) // zero linhas
      }
      if (fn === 'stripe_fail_event') return Promise.resolve({ data: true, error: null })
      return Promise.resolve({ data: null, error: null })
    })

    const POST = await getHandler()
    const event = buildEvent({
      type: 'invoice.payment_succeeded',
      data: {
        object: {
          id: 'in_zero_rows',
          subscription: { id: 'sub_test', created: Math.floor(Date.now() / 1000) },
          customer: 'cus_test',
        } as any,
      },
    })

    const req = buildSignedRequest(event)
    const res = await POST(req as any)

    expect(res.status).toBe(500)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  // ── 9. Problema 2: RPC com dados inválidos ─────────────────────────────────
  it('9.1 Interrompe e retorna HTTP 500 quando deve_ativar não for booleano', async () => {
    const VALID_TOKEN = randomUUID()
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'stripe_claim_event') return Promise.resolve({ data: `claimed:${VALID_TOKEN}`, error: null })
      if (fn === 'stripe_should_activate_on_invoice') {
        return Promise.resolve({
          data: [{ clinica_id: randomUUID(), deve_ativar: 'invalido_nao_booleano' }],
          error: null,
        })
      }
      if (fn === 'stripe_fail_event') return Promise.resolve({ data: true, error: null })
      return Promise.resolve({ data: null, error: null })
    })

    const POST = await getHandler()
    const event = buildEvent({
      type: 'invoice.payment_succeeded',
      data: {
        object: {
          id: 'in_bad_data',
          subscription: { id: 'sub_test', created: Math.floor(Date.now() / 1000) },
          customer: 'cus_test',
        } as any,
      },
    })

    const req = buildSignedRequest(event)
    const res = await POST(req as any)

    expect(res.status).toBe(500)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('9.2 Interrompe e retorna HTTP 500 quando clinica_id retornado for inválido (não-UUID)', async () => {
    const VALID_TOKEN = randomUUID()
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'stripe_claim_event') return Promise.resolve({ data: `claimed:${VALID_TOKEN}`, error: null })
      if (fn === 'stripe_should_activate_on_invoice') {
        return Promise.resolve({
          data: [{ clinica_id: 'not-a-valid-uuid', deve_ativar: true }],
          error: null,
        })
      }
      if (fn === 'stripe_fail_event') return Promise.resolve({ data: true, error: null })
      return Promise.resolve({ data: null, error: null })
    })

    const POST = await getHandler()
    const event = buildEvent({
      type: 'invoice.payment_succeeded',
      data: {
        object: {
          id: 'in_bad_uuid',
          subscription: { id: 'sub_test', created: Math.floor(Date.now() / 1000) },
          customer: 'cus_test',
        } as any,
      },
    })

    const req = buildSignedRequest(event)
    const res = await POST(req as any)

    expect(res.status).toBe(500)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  // ── 10. Problema 3: Falha de UPDATE por subscription_id ────────────────────
  it('10.1 Falha de UPDATE por subscription_id interrompe fluxo e retorna HTTP 500', async () => {
    const VALID_TOKEN = randomUUID()
    const CLINICA_ID = randomUUID()
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'stripe_claim_event') return Promise.resolve({ data: `claimed:${VALID_TOKEN}`, error: null })
      if (fn === 'stripe_complete_event') return Promise.resolve({ data: true, error: null })
      if (fn === 'stripe_fail_event') return Promise.resolve({ data: true, error: null })
      return Promise.resolve({ data: null, error: null })
    })

    mockMaybeSingle.mockResolvedValue({
      data: {
        id: CLINICA_ID,
        status_assinatura: 'ativo',
        stripe_subscription_id: 'sub_atual',
      },
      error: null,
    })

    // UPDATE falha no banco
    mockUpdate.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database lock timeout on update' } }),
      }),
    })

    const POST = await getHandler()
    const event = buildEvent({
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_atual',
          customer: 'cus_test',
          status: 'active',
          created: Math.floor(Date.now() / 1000),
        } as any,
      },
    })

    const req = buildSignedRequest(event)
    const res = await POST(req as any)

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toMatch(/webhook|interno/i)
  })

  // ── 11. Problema 3: Falha de UPDATE por customer_id ────────────────────────
  it('11.1 Falha de UPDATE por customer_id interrompe fluxo e retorna HTTP 500', async () => {
    const VALID_TOKEN = randomUUID()
    const CLINICA_ID = randomUUID()
    const canceladoEm = new Date(Date.now() - 3600 * 1000).toISOString()
    const subNovaCreated = Math.floor(Date.now() / 1000) - 300 // após cancelamento

    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'stripe_claim_event') return Promise.resolve({ data: `claimed:${VALID_TOKEN}`, error: null })
      if (fn === 'stripe_complete_event') return Promise.resolve({ data: true, error: null })
      if (fn === 'stripe_fail_event') return Promise.resolve({ data: true, error: null })
      return Promise.resolve({ data: null, error: null })
    })

    // Clínica cancelada elegível para fallback por customer_id com sub nova
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: CLINICA_ID,
        status_assinatura: 'cancelado',
        stripe_subscription_id: 'sub_antiga',
        cancelamento_em: canceladoEm,
      },
      error: null,
    })

    // UPDATE por customer_id falha
    mockUpdate.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Constraint violation on customer update' } }),
      }),
    })

    const POST = await getHandler()
    const event = buildEvent({
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_nova',
          customer: 'cus_test',
          status: 'active',
          created: subNovaCreated,
        } as any,
      },
    })

    const req = buildSignedRequest(event)
    const res = await POST(req as any)

    expect(res.status).toBe(500)
  })

  // ── 12. Problema 4: Sanitização de conteúdo clínico aninhado ────────────────
  it('12.1 Allowlist descarta conteúdo clínico na raiz e em objetos aninhados', async () => {
    const { sanitizeClinicalDetails } = await import('@/app/lib/logger')

    const payloadSujo = {
      prontuario_id: 'pront_123',
      paciente_id: 'pac_456',
      descricao: 'TEXTO CLINICO SENSIVEL: Paciente relata dor intensa',
      tratamento: 'TEXTO CLINICO SENSIVEL: Canal no dente 47',
      diagnostico: 'Pulpite irreversivel',
      exame_clinico: 'Edema gengival',
      dados_adicionais: {
        descricao: 'TEXTO CLINICO ANINHADO',
        observacoes: 'Alergico a dipirona',
        prontuario_origem_id: 'origem_789',
      },
      tipo_registro: 'registro_clinico',
      status: 'registrada',
      finalizado: true,
    }

    const resultado = sanitizeClinicalDetails(payloadSujo) as Record<string, unknown>

    // Metadados permitidos devem ser preservados
    expect(resultado.prontuario_id).toBe('pront_123')
    expect(resultado.paciente_id).toBe('pac_456')
    expect(resultado.tipo_registro).toBe('registro_clinico')
    expect(resultado.status).toBe('registrada')
    expect(resultado.finalizado).toBe(true)

    // Dados clínicos raiz devem ter sido eliminados
    expect(resultado.descricao).toBeUndefined()
    expect(resultado.tratamento).toBeUndefined()
    expect(resultado.diagnostico).toBeUndefined()
    expect(resultado.exame_clinico).toBeUndefined()

    // Objetos não presentes na allowlist devem ser eliminados
    expect(resultado.dados_adicionais).toBeUndefined()

    // Conversão para string JSON não deve conter nenhum fragmento clínico
    const jsonStr = JSON.stringify(resultado)
    expect(jsonStr).not.toMatch(/TEXTO CLINICO/i)
    expect(jsonStr).not.toMatch(/Pulpite/i)
    expect(jsonStr).not.toMatch(/Edema/i)
    expect(jsonStr).not.toMatch(/Alergico/i)
  })
})

