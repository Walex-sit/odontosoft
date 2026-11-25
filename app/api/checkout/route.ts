/**
 * app/api/checkout/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Rota de API para criação de Sessão de Checkout do Stripe.
 *
 * Segurança (Tarefa 3):
 *  ✅ user_id e email SEMPRE vêm da sessão do servidor — nunca do corpo da requisição.
 *  ✅ Rate limiting simples por IP: 5 requisições por minuto.
 *  ✅ Usuário não autenticado é rejeitado com 401.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from 'next/server'
import { stripe, PLANOS_SAAS } from '@/app/lib/stripe'
import { getAppUrl } from '@/app/lib/env'
import { createServerClient } from '@/app/lib/supabase/server'
import { z } from 'zod'

// ── Rate Limiting simples em memória por IP ───────────────────────────────────
// NOTA: Em deploy multi-instância use Redis/KV. Esta implementação é adequada
// para ambiente de single-process (Vercel Edge Function é por instância também).
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string, limit = 5, windowMs = 60_000): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= limit) return false
  entry.count++
  return true
}

// ── Schema do body — sem userEmail: email vem APENAS da sessão do servidor ───
const checkoutSchema = z.object({
  planoId: z.enum(['essencial', 'premium']).default('premium'),
  intervalo: z.enum(['mensal', 'anual']).default('mensal'),
})

export async function POST(request: NextRequest) {
  try {
    // ── 1. Rate Limiting ──────────────────────────────────────────────────────
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown'

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Muitas requisições. Tente novamente em alguns segundos.' },
        { status: 429 }
      )
    }

    // ── 2. Sessão autenticada obrigatória — user_id e email da sessão ─────────
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Autenticação necessária para iniciar checkout.' },
        { status: 401 }
      )
    }

    // ── 3. Valida body ────────────────────────────────────────────────────────
    const rawBody = await request.json().catch(() => ({}))
    const parseResult = checkoutSchema.safeParse(rawBody)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Dados de checkout inválidos', details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const { planoId, intervalo } = parseResult.data
    // email e userId EXCLUSIVAMENTE da sessão autenticada do servidor
    const email = user.email
    const userId = user.id

    // Desativação segura do fluxo de cobrança enquanto pendente de reconciliação no banco remoto:
    // O sistema não deve simular pagamentos reais nem emitir onboarding fictício como assinante pago.
    const isStripeDisabled =
      process.env.STRIPE_PAYMENTS_DISABLED === 'true' ||
      !process.env.STRIPE_SECRET_KEY ||
      process.env.STRIPE_SECRET_KEY.includes('placeholder') ||
      process.env.STRIPE_SECRET_KEY.includes('chave_falsa')

    if (isStripeDisabled) {
      return NextResponse.json(
        {
          error:
            'A contratação e o checkout de planos online estão temporariamente desativados para auditoria técnica da infraestrutura de pagamentos (Migration 20261115000009 pendente). As clínicas ativas desfrutam de acesso integral durante o período de avaliação.',
          disabled: true,
        },
        { status: 503 }
      )
    }

    const plano = PLANOS_SAAS[planoId] || PLANOS_SAAS.premium
    const appUrl = getAppUrl()

    // ── 4. Cria a sessão de Checkout no Stripe ────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      billing_address_collection: 'required',
      customer_email: email || undefined,
      client_reference_id: userId,
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: `OdontoSoft SaaS - Plano ${plano.nome}`,
              description: plano.descricao,
            },
            unit_amount: intervalo === 'anual' ? plano.precoAnualCentavos : plano.precoMensalCentavos,
            recurring: {
              interval: intervalo === 'anual' ? 'year' : 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      subscription_data: {
        metadata: {
          plano_id: plano.id,
          user_id: userId,
        },
      },
      metadata: {
        plano_id: plano.id,
        user_id: userId,
        user_email: email || '',
      },
      success_url: `${appUrl}/onboarding?session_id={CHECKOUT_SESSION_ID}&plano=${plano.id}`,
      cancel_url: `${appUrl}/planos?canceled=true`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('[api/checkout] Erro ao criar sessão Stripe:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao iniciar checkout de pagamento.' },
      { status: 500 }
    )
  }
}
