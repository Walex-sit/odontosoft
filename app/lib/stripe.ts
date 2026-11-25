/**
 * app/lib/stripe.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Módulo de Integração com Stripe SDK para OdontoSoft SaaS B2B.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import Stripe from 'stripe'
import { PLANOS_SAAS_CATALOG, type PaidPlanConfig, type PaidPlanId } from './plans'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_chave_falsa_apenas_para_o_build_passar'

export const stripe = new Stripe(stripeSecretKey, {
  typescript: true,
  appInfo: {
    name: 'OdontoSoft SaaS',
    version: '1.0.0',
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
