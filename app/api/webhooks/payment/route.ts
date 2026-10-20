/**
 * app/api/webhooks/payment/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Webhook de Pagamentos (Stripe Gateway).
 *
 * Escuta eventos do ciclo de vida da assinatura:
 *  ✅ checkout.session.completed     → Provisiona ou ativa o Tenant (Clínica)
 *  ✅ invoice.payment_succeeded      → Confirma status 'ativo' (adimplente)
 *  ✅ invoice.payment_failed         → Altera status para 'inadimplente' (ativa bloqueio de escrita)
 *  ✅ customer.subscription.updated  → Sincroniza status ('ativo', 'inadimplente', etc.)
 *  ✅ customer.subscription.deleted  → Altera status para 'cancelado'
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/app/lib/stripe'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event: Stripe.Event

  try {
    const rawBody = await request.text()

    if (webhookSecret && !webhookSecret.includes('placeholder') && signature) {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
    } else {
      if (process.env.NODE_ENV === 'production') {
        console.error('[Webhook/Payment] Rejeitado: STRIPE_WEBHOOK_SECRET ou assinatura ausente em ambiente de produção.')
        return NextResponse.json({ error: 'Configuração de webhook inválida para produção.' }, { status: 400 })
      }
      // Modo de desenvolvimento/teste sem assinatura restrita
      const parsed = JSON.parse(rawBody)
      event = parsed as Stripe.Event
    }
  } catch (err: any) {
    console.error(`[Webhook/Payment] Falha na validação de assinatura:`, err.message)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  try {
    // ── 0. Verificação de Idempotência (Evita Duplicidade de Eventos Stripe) ─
    const { data: eventoProcessado } = await (supabaseAdmin as any)
      .from('stripe_webhook_events')
      .select('id')
      .eq('id', event.id)
      .maybeSingle()

    if (eventoProcessado) {
      return NextResponse.json({ received: true, duplicate: true })
    }

    switch (event.type) {
      // ── 1. Checkout Concluído com Sucesso ─────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.client_reference_id || session.metadata?.user_id
        const plano = (session.metadata?.plano_id as 'essencial' | 'premium') || 'profissional'
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id

        if (!userId) {
          console.warn('[Webhook/Payment] checkout.session.completed sem userId vinculado.')
          break
        }

        // Verifica se o perfil do usuário já existe
        const { data: profile, error: profError } = await supabaseAdmin
          .from('user_profiles')
          .select('id, clinica_id')
          .eq('id', userId)
          .maybeSingle()

        if (profError) {
          throw new Error(`Falha ao consultar perfil do usuário: ${profError.message}`)
        }

        if (profile?.clinica_id) {
          // Clínica já existe: apenas atualiza billing
          const { error: updError } = await supabaseAdmin
            .from('clinicas')
            .update({
              stripe_customer_id: customerId || null,
              stripe_subscription_id: subscriptionId || null,
              status_assinatura: 'ativo',
              plano: plano === 'premium' ? 'enterprise' : 'profissional',
              ativo: true,
            })
            .eq('id', profile.clinica_id)

          if (updError) {
            throw new Error(`Falha ao atualizar billing da clínica: ${updError.message}`)
          }
        } else {
          // Novo Tenant B2B: provisiona a clínica e vincula o usuário como admin
          const { error: provError } = await supabaseAdmin.rpc('provisionar_novo_tenant', {
            p_user_id: userId,
            p_nome_clinica: 'Minha Clínica Odontológica',
            p_plano: plano === 'premium' ? 'enterprise' : 'profissional',
            p_stripe_customer_id: customerId || null,
            p_stripe_subscription_id: subscriptionId || null,
            p_plano_preco_id: null,
          })

          if (provError) {
            throw new Error(`Falha ao provisionar novo tenant no banco: ${provError.message}`)
          }
        }
        break
      }

      // ── 2. Pagamento de Fatura Aprovado (Renovação / Inicial) ─────────────
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = (invoice as any).subscription as string | undefined

        if (subscriptionId) {
          await supabaseAdmin
            .from('clinicas')
            .update({
              status_assinatura: 'ativo',
              ativo: true,
            })
            .eq('stripe_subscription_id', subscriptionId)
        }
        break
      }

      // ── 3. Falha no Pagamento de Fatura (Inadimplência) ───────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = (invoice as any).subscription as string | undefined

        if (subscriptionId) {
          console.warn(`[Webhook/Payment] Fatura não paga para subscription: ${subscriptionId}. Aplicando bloqueio.`)
          await supabaseAdmin
            .from('clinicas')
            .update({
              status_assinatura: 'inadimplente',
            })
            .eq('stripe_subscription_id', subscriptionId)
        }
        break
      }

      // ── 4. Atualização de Estado da Assinatura no Stripe ─────────────────
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const subId = subscription.id
        const status = subscription.status

        let statusAssinatura: 'trial' | 'ativo' | 'inadimplente' | 'cancelado' = 'ativo'

        if (status === 'past_due' || status === 'unpaid') {
          statusAssinatura = 'inadimplente'
        } else if (status === 'canceled' || status === 'incomplete_expired') {
          statusAssinatura = 'cancelado'
        } else if (status === 'trialing') {
          statusAssinatura = 'trial'
        } else if (status === 'active') {
          statusAssinatura = 'ativo'
        }

        const currentPeriodEnd = (subscription as any).current_period_end
          ? new Date((subscription as any).current_period_end * 1000).toISOString()
          : null

        await supabaseAdmin
          .from('clinicas')
          .update({
            status_assinatura: statusAssinatura,
            periodo_fim: currentPeriodEnd,
          })
          .eq('stripe_subscription_id', subId)
        break
      }

      // ── 5. Cancelamento de Assinatura ─────────────────────────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const subId = subscription.id

        await supabaseAdmin
          .from('clinicas')
          .update({
            status_assinatura: 'cancelado',
            cancelamento_em: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subId)
        break
      }

      default:
        // Outros eventos recebidos
        break
    }

    // Registra o evento com sucesso para idempotência futura
    await (supabaseAdmin as any)
      .from('stripe_webhook_events')
      .insert([{
        id: event.id,
        event_type: event.type,
        processed_at: new Date().toISOString(),
      }])

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('[Webhook/Payment] Erro no processamento do evento:', err)
    return NextResponse.json({ error: 'Erro interno ao processar webhook' }, { status: 500 })
  }
}
