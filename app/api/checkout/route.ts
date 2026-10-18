/**
 * app/api/checkout/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Rota de API para criação de Sessão de Checkout do Stripe.
 *
 * Suporta:
 *  - Criação de assinatura de planos ('essencial' ou 'premium')
 *  - Vinculação com o usuário autenticado (client_reference_id)
 *  - Redirecionamento seguro para o Stripe Checkout Hosted
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from 'next/server'
import { stripe, PLANOS_SAAS } from '@/app/lib/stripe'
import { createServerClient } from '@/app/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { planoId = 'premium', intervalo = 'mensal', userEmail } = body

    const plano = PLANOS_SAAS[planoId as 'essencial' | 'premium'] || PLANOS_SAAS.premium
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Tenta recuperar a sessão do usuário autenticado se existir
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    const email = user?.email || userEmail

    // Em ambiente de teste onde a chave de API do Stripe não esteja configurada com uma chave real da Stripe:
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('placeholder')) {
      // Mock de redirecionamento para desenvolvimento local sem Stripe conectado:
      const mockSessionId = 'cs_test_' + Math.random().toString(36).substring(2, 12)
      return NextResponse.json({
        url: `${appUrl}/onboarding?session_id=${mockSessionId}&plano=${plano.id}&mock=true`,
        warning: 'Ambiente de desenvolvimento: Stripe em modo simulação.',
      })
    }

    const priceId = intervalo === 'anual' && plano.stripePriceIdAnual
      ? plano.stripePriceIdAnual
      : plano.stripePriceIdMensal

    // Cria a sessão de Checkout no Stripe
    const session = await stripe.checkout.sessions.create({
      billing_address_collection: 'required',
      customer_email: email || undefined,
      client_reference_id: user?.id || undefined,
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: `OdontoSoft SaaS - Plano ${plano.nome}`,
              description: plano.descricao,
            },
            unit_amount: (intervalo === 'anual' ? plano.precoAnual : plano.precoMensal) * 100,
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
          user_id: user?.id || '',
        },
      },
      metadata: {
        plano_id: plano.id,
        user_id: user?.id || '',
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
