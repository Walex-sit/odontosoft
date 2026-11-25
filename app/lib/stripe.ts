/**
 * app/lib/stripe.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Módulo de Integração com Stripe SDK para OdontoSoft SaaS B2B (Server-Only).
 *
 * Hardening:
 *  ✅ `import 'server-only'` impede uso acidental em Client Components.
 *  ✅ Sem fallback de chave fictícia: se Stripe estiver ativo sem STRIPE_SECRET_KEY
 *     válida, falha explicitamente.
 *  ✅ Inicialização preguiçosa (lazy): quando Stripe está desabilitado, o SDK
 *     não é instanciado no import do módulo.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import 'server-only'
import Stripe from 'stripe'
import { PLANOS_SAAS_CATALOG, type PaidPlanConfig, type PaidPlanId } from './plans'

let _stripeInstance: Stripe | null = null

/**
 * Inicializa e retorna o cliente Stripe sob demanda.
 * Lança erro explícito caso STRIPE_SECRET_KEY esteja ausente ou inválida.
 */
export function getStripeClient(): Stripe {
  if (_stripeInstance) {
    return _stripeInstance
  }

  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (
    !key ||
    key.includes('placeholder') ||
    key.includes('chave_falsa') ||
    (!key.startsWith('sk_live_') && !key.startsWith('sk_test_') && !key.startsWith('rk_'))
  ) {
    throw new Error(
      '[Stripe] STRIPE_SECRET_KEY não configurada ou inválida. Configure uma chave válida ou mantenha o Stripe desabilitado.'
    )
  }

  _stripeInstance = new Stripe(key, {
    typescript: true,
    appInfo: {
      name: 'OdontoSoft SaaS',
      version: '1.0.0',
    },
  })

  return _stripeInstance
}

/**
 * Proxy preguiçoso compatível com `stripe.*`:
 * - `stripe.webhooks` delega diretamente para `Stripe.webhooks` (validação de
 *   assinatura HMAC não exige inicialização de API key).
 * - Demais namespaces (`checkout`, `subscriptions`, etc.) inicializam o SDK
 *   sob demanda via `getStripeClient()`, falhando explicitamente se mal configurado.
 */
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    if (prop === 'webhooks') {
      return Stripe.webhooks
    }
    const client = getStripeClient()
    const value = Reflect.get(client, prop, client)
    return typeof value === 'function' ? value.bind(client) : value
  },
})

export interface PlanConfig extends PaidPlanConfig {
  id: PaidPlanId
  stripePriceIdMensal: string
  stripePriceIdAnual?: string
}

export const PLANOS_SAAS: Record<PaidPlanId, PlanConfig> = {
  essencial: {
    ...PLANOS_SAAS_CATALOG.essencial,
    stripePriceIdMensal: process.env.STRIPE_PRICE_ID_ESSENCIAL || 'price_essencial_mensal',
  },
  premium: {
    ...PLANOS_SAAS_CATALOG.premium,
    stripePriceIdMensal: process.env.STRIPE_PRICE_ID_PREMIUM || 'price_premium_mensal',
  },
}
